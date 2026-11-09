# frozen_string_literal: true

require 'rails_helper'

# OneTeam: for a button press, the callback query is the base object.
RSpec.describe Telegram::ParamHelpers do
  it 'reads the callback query as the base object' do
    callback = { id: 'cb-1', from: { id: 7 } }
    host = Class.new do
      include Telegram::ParamHelpers

      attr_reader :params

      def initialize(params) = @params = params
    end.new({ callback_query: callback })

    expect(host.telegram_params_base_object).to eq(callback)
  end
end
