require 'rails_helper'

# OneTeam coverage for contact inboxes on voice-enabled Twilio inboxes: the
# source id is the phone number, or a random id without one.
RSpec.describe Enterprise::ContactInboxBuilder do
  let(:inbox) { create(:channel_twilio_sms).inbox }

  def builder_for(contact)
    ContactInboxBuilder.new(contact: contact, inbox: inbox).tap do |builder|
      allow(builder).to receive(:twilio_voice_inbox?).and_return(true)
    end
  end

  it 'uses the contact phone number' do
    expect(builder_for(build(:contact, phone_number: '+15550001111')).send(:generate_source_id)).to eq('+15550001111')
  end

  it 'uses a random id for contacts without a phone number' do
    expect(builder_for(build(:contact, phone_number: nil)).send(:generate_source_id)).to match(/\A\h{8}-/)
  end
end
