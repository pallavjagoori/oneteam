# frozen_string_literal: true

require 'rails_helper'

# OneTeam: which Captain tools may run after a newer customer message arrived.
RSpec.describe Captain::Tools::BasePublicTool do
  let(:assistant) { create(:captain_assistant) }

  it 'lets FAQ lookups and GET custom tools run after a newer customer message' do
    expect(Captain::Tools::FaqLookupTool.new(assistant).send(:safe_to_run_after_new_customer_message?)).to be(true)

    get_tool = instance_double(Captain::CustomTool, http_method: 'GET')
    post_tool = instance_double(Captain::CustomTool, http_method: 'POST')
    expect(Captain::Tools::PublicHttpTool.new(assistant, get_tool).send(:safe_to_run_after_new_customer_message?)).to be(true)
    expect(Captain::Tools::PublicHttpTool.new(assistant, post_tool).send(:safe_to_run_after_new_customer_message?)).to be(false)
  end
end
