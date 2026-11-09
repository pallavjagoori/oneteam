# frozen_string_literal: true

require 'rails_helper'

# OneTeam: a failed widget creation is logged and returns nil.
RSpec.describe Onboarding::WebWidgetCreationService do
  it 'logs and returns nil when creation fails' do
    account = create(:account, custom_attributes: { 'website' => 'https://acme.example' })
    service = described_class.new(account, create(:user, account: account))
    allow(service).to receive_messages(existing_web_widget_inbox: nil, website_url: 'https://acme.example')
    allow(account).to receive(:web_widgets).and_raise(ActiveRecord::RecordInvalid)
    allow(Rails.logger).to receive(:error)

    expect(service.perform).to be_nil
    expect(Rails.logger).to have_received(:error).with(/\A\[WidgetCreation\] /)
  end
end
