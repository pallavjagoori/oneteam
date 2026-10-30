require 'rails_helper'

# OneTeam coverage for Chatwoot's database tasks: loading installation config
# after every migration, and `db:chatwoot_prepare`, which loads the schema on
# an empty database, migrates an existing one and sets up a missing one.
RSpec.describe 'database tasks' do # rubocop:disable RSpec/DescribeClass
  let(:connection) { ActiveRecord::Base.connection }

  it 'loads installation config after migrating' do
    loader = instance_double(ConfigLoader, process: true)
    allow(ConfigLoader).to receive(:new).and_return(loader)

    action = Rake::Task['db:migrate'].actions.find { |block| block.source_location.first.end_with?('db_enhancements.rake') }
    action.call(Rake::Task['db:migrate'], Rake::TaskArguments.new([], []))

    expect(loader).to have_received(:process)
  end

  describe 'db:chatwoot_prepare' do
    let(:invoked) { [] }

    before do
      allow(ActiveRecord::Base).to receive(:establish_connection)
      allow(ActiveRecord::Tasks::DatabaseTasks).to receive(:load_schema_current)
      %w[db:load_config db:seed db:migrate db:setup].each do |name|
        allow(Rake::Task[name]).to receive(:invoke) { invoked << name }
      end
      Rake::Task['db:chatwoot_prepare'].reenable
    end

    it 'migrates an existing database' do
      Rake::Task['db:chatwoot_prepare'].invoke

      expect(invoked).to eq(['db:migrate'])
    end

    it 'loads the schema and seeds an empty database' do
      allow(connection).to receive(:table_exists?).and_call_original
      allow(connection).to receive(:table_exists?).with('ar_internal_metadata').and_return(false)

      Rake::Task['db:chatwoot_prepare'].invoke

      expect(ActiveRecord::Tasks::DatabaseTasks).to have_received(:load_schema_current)
      expect(invoked).to include('db:seed', 'db:migrate')
    end

    it 'sets up a database that does not exist' do
      allow(connection).to receive(:table_exists?).and_raise(ActiveRecord::NoDatabaseError)

      Rake::Task['db:chatwoot_prepare'].invoke

      expect(invoked).to eq(['db:setup'])
    end
  end
end
