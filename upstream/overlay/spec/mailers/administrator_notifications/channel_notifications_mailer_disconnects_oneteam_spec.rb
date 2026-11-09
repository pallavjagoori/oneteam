require 'rails_helper'

# OneTeam coverage for the TikTok and email disconnect notices sent to
# administrators.
RSpec.describe AdministratorNotifications::ChannelNotificationsMailer do
  let(:mailer) { described_class.new }
  let(:inbox) { instance_double(Inbox) }

  before do
    allow(mailer).to receive(:send_notification)
    allow(mailer).to receive(:inbox_url).with(inbox).and_return('https://app.example/inbox')
  end

  it 'tells admins a TikTok connection expired' do
    mailer.tiktok_disconnect(inbox)

    expect(mailer).to have_received(:send_notification)
      .with('Your TikTok connection has expired', action_url: 'https://app.example/inbox')
  end

  it 'tells admins an email inbox was disconnected' do
    mailer.email_disconnect(inbox)

    expect(mailer).to have_received(:send_notification)
      .with('Your email inbox has been disconnected. Please update the credentials for SMTP/IMAP', action_url: 'https://app.example/inbox')
  end
end
