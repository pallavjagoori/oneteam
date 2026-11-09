# frozen_string_literal: true

require 'rails_helper'

# OneTeam: an FAQ that fails validation is logged and skipped.
RSpec.describe Captain::Documents::ResponseBuilderJob do
  it 'logs an invalid FAQ response' do
    responses = Class.new { def create!(**) = raise(ActiveRecord::RecordInvalid) }.new
    document = Struct.new(:responses, :assistant).new(responses, nil)
    allow(Rails.logger).to receive(:error)

    described_class.new.send(:create_response, { 'question' => 'Q?', 'answer' => '' }, document)

    expect(Rails.logger).to have_received(:error)
  end
end
