# frozen_string_literal: true

require 'rails_helper'

# OneTeam: super admin labels for account users and agent bot avatar removal.
RSpec.describe AccountUserDashboard do
  it 'labels an account user by id' do
    expect(described_class.new.display_resource(Struct.new(:id).new(7))).to eq('AccountUser #7')
  end

  it 'points the agent bot avatar delete button at the avatar route' do
    destroy_url = AgentBotDashboard::ATTRIBUTE_TYPES[:avatar].options[:destroy_url]

    expect(destroy_url.call(:super_admin, nil, Struct.new(:id).new(3))).to eq([:avatar_super_admin_agent_bot, { attachment_id: 3 }])
  end
end
