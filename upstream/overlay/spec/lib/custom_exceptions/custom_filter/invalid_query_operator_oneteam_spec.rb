# frozen_string_literal: true

require 'rails_helper'

# OneTeam: custom filter and PDF errors carry their messages.
RSpec.describe CustomExceptions::CustomFilter::InvalidQueryOperator do
  it 'explains the invalid query operator' do
    expect(described_class.new({}).message).to eq(I18n.t('errors.custom_filters.invalid_query_operator'))
  end

  it 'gives PDF validation errors a default detail' do
    expect(CustomExceptions::Pdf::ValidationError.new.instance_variable_get(:@data)).to eq('PDF validation failed')
  end
end
