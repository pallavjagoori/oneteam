# frozen_string_literal: true

require 'rails_helper'

# OneTeam: a Dialogflow hook without credentials answers nothing. The source means to log a warning,
# but `warn "..." && return` evaluates `return` before warn is called, so nothing is logged
# (recorded in FINDINGS.md).
RSpec.describe Integrations::Dialogflow::ProcessorService do
  it 'returns nothing, without logging, when the hook has no credentials' do
    inbox = create(:inbox)
    hook = create(:integrations_hook, :dialogflow, account: inbox.account, inbox: inbox)
    hook.settings = hook.settings.merge('credentials' => nil)
    allow(Rails.logger).to receive(:warn)

    result = described_class.new(event_name: 'message.created', hook: hook, event_data: {}).send(:get_response, 'session', 'hi')

    expect(result).to be_nil
    expect(Rails.logger).not_to have_received(:warn)
  end
end
