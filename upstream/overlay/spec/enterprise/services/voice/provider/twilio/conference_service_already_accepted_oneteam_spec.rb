require 'rails_helper'

RSpec.describe Voice::Provider::Twilio::ConferenceService do
  it 'raises with the name of the agent who accepted the call' do
    agent = create(:user)

    expect { described_class.allocate.send(:raise_already_accepted!, agent) }
      .to raise_error(CustomExceptions::CallAlreadyAccepted)
  end
end
