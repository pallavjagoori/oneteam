require 'rails_helper'

# OneTeam coverage for looking up a Copilot get_data resource by name.
RSpec.describe Captain::Copilot::Resources do
  it 'builds a resource by name, or lists the names it knows' do
    account = create(:account)

    expect(described_class.build('contacts', account: account, user: nil)).to be_a(Captain::Copilot::Resources::Contacts)
    expect { described_class.build('tickets', account: account, user: nil) }
      .to raise_error(ArgumentError, 'Unknown resource tickets. Available resources: conversations, contacts, messages')
  end
end
