require 'rails_helper'

# OneTeam coverage for the `captain:assistant_migration:*` tasks that move
# older Captain assistants (one block of free-text instructions) to the
# structured format: drafting the split with the LLM, applying reviewed
# drafts, and restoring the original welcome/handoff/resolution messages.
RSpec.describe 'captain:assistant_migration tasks' do # rubocop:disable RSpec/DescribeClass
  let(:account) { create(:account) }
  let(:assistant) { create(:captain_assistant, account: account, config: { 'instructions' => 'Be kind' }) }
  let(:classifier) { instance_double(Captain::AssistantMigration::InstructionClassifier) }

  let(:dir) { Dir.mktmpdir }

  after { FileUtils.remove_entry(dir) }

  before do
    create(:captain_inbox, captain_assistant: assistant, inbox: create(:inbox, account: account))
    allow(Captain::AssistantMigration::InstructionClassifier).to receive(:new).and_return(classifier)
    allow(classifier).to receive(:perform) { { assistant_id: assistant.id, draft: { 'description' => 'Kind' } } }
  end

  def run_with_env(task, env)
    with_modified_env(**env) { run_rake(task) }
  end

  describe 'generate' do
    it 'writes one draft per eligible assistant' do
      create(:captain_assistant, account: account, config: { 'instructions' => 'No inbox' })
      output_path = File.join(dir, 'drafts/out.jsonl')

      result = run_with_env('captain:assistant_migration:generate', OUTPUT: output_path, IDS: "#{assistant.id}, ", LIMIT: '0')

      expect(File.readlines(output_path).size).to eq(1)
      expect(result.output).to include("Generated migration draft for assistant #{assistant.id} (1/1)", 'Wrote 1 migration drafts')
    end

    it 'reads assistants from a CSV export, keeping only eligible ones' do
      csv_path = File.join(dir, 'assistants.csv')
      CSV.open(csv_path, 'w') do |csv|
        csv << %w[id name account_id account_name description config response_guidelines guardrails inbox_count status]
        csv << ['1001', 'Eligible', '1,234', 'Acme', 'Help', '{"instructions":"Be kind"}', '', '', '2', 'active']
        csv << ['2', 'Bad JSON', '7', 'Acme', 'Help', '{oops', '', '', '1', 'active']
        csv << ['3', 'Other status', '7', 'Acme', 'Help', '{"instructions":"Hi"}', '', '', '1', 'paused']
        csv << ['4', 'Not listed', '7', 'Acme', 'Help', '{"instructions":"Hi"}', '', '', '1', 'active']
      end
      seen = []
      allow(Captain::AssistantMigration::InstructionClassifier).to receive(:new) do |assistant:|
        seen << assistant
        classifier
      end

      run_with_env('captain:assistant_migration:generate', CSV_INPUT: csv_path, IDS: '1001,2,3', STATUS: 'active', LIMIT: '5',
                                                           OUTPUT: File.join(dir, 'csv.jsonl'))

      expect(seen.map(&:id)).to eq([1001])
      expect(seen.first.account.captain_models).to eq({})
      expect(seen.first.account.conversations.find_by(id: 1)).to be_nil
      expect(seen.first.account.conversations.exists?).to be(false)
    end

    it 'returns every CSV row when no limit is set' do
      csv_path = File.join(dir, 'assistants.csv')
      File.write(csv_path, "id,config,inbox_count\n1,\"{\"\"instructions\"\":\"\"Hi\"\"}\",1\n")
      with_modified_env(CSV_INPUT: csv_path, LIMIT: '0') do
        expect(CaptainAssistantMigrationTask.assistants.size).to eq(1)
      end
    end
  end

  describe 'apply' do
    let(:applier) { instance_double(Captain::AssistantMigration::DraftApplier, perform: { assistant_id: assistant.id, changes: {} }) }
    let(:input_path) { File.join(dir, 'reviewed.jsonl') }

    before { allow(Captain::AssistantMigration::DraftApplier).to receive(:new).and_return(applier) }

    it 'applies each reviewed draft and reports skipped or broken lines' do
      ineligible = create(:captain_assistant, account: account, config: {})
      File.write(input_path, [
        { assistant: { id: assistant.id }, draft: { description: 'Kind' } }.to_json,
        '',
        '{broken',
        { error: 'LLM refused' }.to_json,
        { assistant_id: 0 }.to_json,
        { assistant_id: ineligible.id }.to_json
      ].join("\n"))

      output = run_with_env('captain:assistant_migration:apply', INPUT: input_path, DRY_RUN: 'no').output

      expect(Captain::AssistantMigration::DraftApplier).to have_received(:new).with(assistant: assistant, draft: { 'description' => 'Kind' },
                                                                                    dry_run: false)
      expect(output).to include('Invalid JSON', 'LLM refused', 'Assistant not found', 'not a V1 migration candidate', 'Processed 5 migration drafts')
      expect(output).not_to include('Dry run only')
    end

    it 'is a dry run by default' do
      File.write(input_path, "#{{ assistant_id: assistant.id }.to_json}\n")

      expect(run_with_env('captain:assistant_migration:apply', INPUT: input_path).output).to include('Dry run only')
    end
  end

  describe 'restore_messages' do
    let(:original) { { 'welcome_message' => 'Hello', 'handoff_message' => 'Passing you on' } }

    before do
      assistant.update!(config: { 'instructions' => 'Be kind', 'welcome_message' => 'Hi', 'resolution_message' => 'Bye',
                                  'handoff_message' => 'Passing you on',
                                  'assistant_migration' => { 'original_values' => { 'config' => original } } })
    end

    it 'puts back the original messages' do
      no_backup = create(:captain_assistant, account: account)

      output = run_with_env('captain:assistant_migration:restore_messages', IDS: "#{assistant.id},#{no_backup.id},0", DRY_RUN: 'false').output

      expect(assistant.reload.config).to include('welcome_message' => 'Hello')
      expect(assistant.config).not_to have_key('resolution_message')
      expect(output).to include('No stored migration original config found', 'Assistant not found', 'Processed 3 assistant message restores')
    end

    it 'only shows the changes on a dry run' do
      output = run_with_env('captain:assistant_migration:restore_messages', IDS: assistant.id.to_s).output

      expect(assistant.reload.config['welcome_message']).to eq('Hi')
      expect(output).to include('Dry run only')
    end
  end
end
