require 'rails_helper'

# OneTeam coverage for the shared Instagram incoming-message flow: inboxes that
# need reauthorization are skipped, echoes of our own replies are read from
# the other side, and subclasses must supply the contact and message steps.
RSpec.describe Instagram::BaseMessageText do
  let(:channel) { create(:channel_instagram) }
  let(:messaging) { { sender: { id: channel.instagram_id }, recipient: { id: 'contact-1' }, message: { mid: 'm1', text: 'hi', is_echo: true } } }
  let(:service) { described_class.new(messaging.with_indifferent_access, channel) }

  it 'skips inboxes that need reauthorization' do
    channel.authorization_error! until channel.reauthorization_required?
    allow(Rails.logger).to receive(:info)

    expect(service.perform).to be_nil
    expect(Rails.logger).to have_received(:info).with("Skipping message processing as reauthorization is required for inbox #{channel.inbox.id}")
  end

  it 'reads echoes from the business account side' do
    expect(service.send(:instagram_and_contact_ids)).to eq([channel.instagram_id, 'contact-1'])
  end

  it 'leaves the contact and message steps to subclasses' do
    expect { service.send(:ensure_contact, 'contact-1') }.to raise_error(NotImplementedError)
    expect { service.send(:create_message) }.to raise_error(NotImplementedError)
  end
end
