require 'rails_helper'

# OneTeam coverage for where the Notion OAuth callback sends the user once the
# hook is saved: the account's Notion integration settings page.
RSpec.describe Notion::CallbacksController do
  it 'redirects to the account notion settings page' do
    account = create(:account)
    controller = described_class.new
    allow(controller).to receive(:account).and_return(account)

    with_modified_env FRONTEND_URL: 'https://app.example.com' do
      expect(controller.send(:notion_redirect_uri))
        .to eq("https://app.example.com/app/accounts/#{account.id}/settings/integrations/notion")
    end
  end
end
