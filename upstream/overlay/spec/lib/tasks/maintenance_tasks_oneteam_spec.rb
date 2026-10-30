require 'rails_helper'

# OneTeam coverage for the small operator tasks that hand off to a job,
# service or library: company backfills, Sidekiq queue clean-up, orphan
# conversation clean-up, test and report data generation, the LLM model list,
# the installation id, asset build hooks, IP lookup setup and provider name
# backfills.
RSpec.describe 'maintenance rake tasks' do # rubocop:disable RSpec/DescribeClass
  let(:account) { create(:account) }

  describe 'companies' do
    it 'enqueues the company backfill' do
      expect { run_rake('companies:backfill') }.to have_enqueued_job(Migration::CompanyBackfillJob)
    end

    it 'queues favicon fetches for accounts with companies missing avatars' do
      create(:company, account: account, domain: 'acme.com')

      expect { run_rake('companies:fetch_missing_avatars') }.to have_enqueued_job(Companies::FetchAvatarsJob).with(account.id)
    end
  end

  it 'clears Action Cable broadcasts from the critical queue' do
    broadcast = instance_double(Sidekiq::JobRecord, delete: true)
    other = instance_double(Sidekiq::JobRecord, delete: true)
    allow(broadcast).to receive(:[]).with('wrapped').and_return('ActionCableBroadcastJob')
    allow(other).to receive(:[]).with('wrapped').and_return('SendReplyJob')
    queue = instance_double(Sidekiq::Queue)
    allow(queue).to receive(:each).and_yield(broadcast).and_yield(other)
    allow(Sidekiq::Queue).to receive(:new).with('critical').and_return(queue)

    expect(run_rake('sidekiq:clear_action_cable_broadcast_jobs').output).to include('Cleared 1 ActionCableBroadcastJob(s)')
    expect(other).not_to have_received(:delete)
  end

  describe 'chatwoot:ops:cleanup_orphan_conversations' do
    let(:service) { instance_double(Internal::RemoveOrphanConversationsService, perform: 1) }

    before do
      allow(Internal::RemoveOrphanConversationsService).to receive(:new).and_return(service)
      conversation = create(:conversation, account: account)
      conversation.contact.delete
    end

    it 'deletes orphaned conversations after confirmation' do
      output = run_rake('chatwoot:ops:cleanup_orphan_conversations', input: "#{account.id}\n\ny\n").output

      expect(output).to include('Found 1 conversations', '1 conversations deleted.')
      expect(Internal::RemoveOrphanConversationsService).to have_received(:new).with(account: account, days: 7)
    end

    it 'keeps them when not confirmed' do
      expect(run_rake('chatwoot:ops:cleanup_orphan_conversations',
                      input: "#{account.id}\n3\nn\n").output).to include('No conversations were deleted.')
      expect(service).not_to have_received(:perform)
    end
  end

  describe 'data tasks' do
    before do
      allow(TestData).to receive(:generate)
      allow(TestData).to receive(:cleanup)
      allow(TestData::DatabaseOptimizer).to receive(:setup)
      allow(TestData::DatabaseOptimizer).to receive(:restore)
    end

    it 'generates test data with the database tuned for bulk inserts' do
      logger = Rails.logger
      run_rake('data:generate_distributed_data')
      log_line = Rails.logger.formatter.call('INFO', Time.zone.parse('2026-01-02 03:04:05'), nil, 'started')
      Rails.logger = logger

      expect(log_line).to eq("2026-01-02 03:04:05.000 INFO: started\n")

      expect(TestData).to have_received(:generate)
      expect(TestData::DatabaseOptimizer).to have_received(:restore)
    end

    it 'refuses to generate test data in production' do
      allow(Rails.env).to receive(:production?).and_return(true)

      expect(run_rake('data:generate_distributed_data').output).to include('Exiting to avoid impacting a live environment.')
      expect(TestData).not_to have_received(:generate)
    end

    it 'cleans up test data' do
      run_rake('data:cleanup_test_data')

      expect(TestData).to have_received(:cleanup)
    end
  end

  describe 'db:seed:reports_data' do
    it 'needs an account id' do
      with_modified_env ACCOUNT_ID: nil do
        expect(run_rake('db:seed:reports_data').status).to eq(1)
      end
    end

    it 'seeds report data for the account' do
      seeder = instance_double(Seeders::Reports::ReportDataSeeder, perform!: true)
      allow(Seeders::Reports::ReportDataSeeder).to receive(:new).with(account: account).and_return(seeder)

      with_modified_env ACCOUNT_ID: account.id.to_s, ENABLE_ACCOUNT_SEEDING: nil do
        expect(run_rake('db:seed:reports_data').output).to include("Finished seeding reports data for account: #{account.name}")
      end
    end
  end

  it 'refreshes the LLM model list' do
    models = double(refresh: true, save_to_json: true, all: [1, 2]) # rubocop:disable RSpec/VerifiedDoubles
    allow(RubyLLM).to receive(:models).and_return(models)
    file = RubyLLM.config.model_registry_file
    store = RubyLLM.config.model_registry_store

    expect(run_rake('ruby_llm:refresh_models').output).to include('updated with 2 models')
  ensure
    RubyLLM.config.model_registry_file = file
    RubyLLM.config.model_registry_store = store
  end

  it 'prints the installation id, creating one when missing' do
    InstallationConfig.where(name: 'INSTALLATION_IDENTIFIER').delete_all

    created = run_rake('instance_id:get_installation_identifier').output.strip

    expect(created).to match(/\A\h{8}-/)
    expect(run_rake('instance_id:get_installation_identifier').output.strip).to eq(created)
  end

  it 'removes node_modules when assets are cleaned' do
    allow(FileUtils).to receive(:remove_dir)
    clean_hook = Rake::Task['assets:clean'].actions.find { |block| block.source_location.first.end_with?('asset_clean.rake') }

    clean_hook.call(Rake::Task['assets:clean'], Rake::TaskArguments.new([], []))

    expect(FileUtils).to have_received(:remove_dir).with('node_modules', true)
  end

  it 'builds the SDK before precompiling assets' do
    main = TOPLEVEL_BINDING.receiver
    allow(main).to receive(:system).and_return(true)

    run_rake('before_assets_precompile')

    expect(main).to have_received(:system).with('pnpm run build:sdk')
  end

  it 'sets up the IP lookup database' do
    service = instance_double(Geocoder::SetupService, perform: true)
    allow(Geocoder::SetupService).to receive(:new).and_return(service)

    run_rake('ip_lookup:setup')

    expect(service).to have_received(:perform)
  end

  it 'backfills social channel provider names as a dry run by default' do
    service = instance_double(SocialChannels::ProviderNameBackfillService, perform: true)
    allow(SocialChannels::ProviderNameBackfillService).to receive(:new).and_return(service)

    run_rake('social_channels:backfill_provider_names')

    expect(SocialChannels::ProviderNameBackfillService).to have_received(:new).with(hash_including(dry_run: true))
  end
end
