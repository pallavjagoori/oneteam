# frozen_string_literal: true

require 'rails_helper'

# OneTeam: the job hands the message to the translation service.
RSpec.describe Captain::Conversation::ContactMessageTranslationJob do
  it 'translates the contact message' do
    message = build(:message)
    service = instance_double(Captain::Conversation::ContactMessageTranslationService, perform: true)
    allow(Captain::Conversation::ContactMessageTranslationService).to receive(:new)
      .with(message: message, target_language: 'fr').and_return(service)

    described_class.new.perform(message, 'fr')

    expect(service).to have_received(:perform)
  end
end
