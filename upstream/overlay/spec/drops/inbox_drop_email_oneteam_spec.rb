require 'rails_helper'

# OneTeam coverage for inbox details used in email templates.
describe InboxDrop do
  it 'exposes the avatar and the email address of an email inbox' do
    inbox = create(:channel_email, email: 'support@example.com').inbox

    drop = described_class.new(inbox)

    expect(drop.avatar_url).to eq(inbox.avatar_url)
    expect(drop.email).to eq('support@example.com')
  end
end
