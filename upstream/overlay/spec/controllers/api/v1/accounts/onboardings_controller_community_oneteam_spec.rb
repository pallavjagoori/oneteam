require 'rails_helper'

# OneTeam coverage for the community edition's help center generation status.
# Community installs have no help center generator, so the endpoint always
# reports an empty, unstarted generation. The enterprise module replaces the
# action in Chatwoot's suite, so the community version is restored here.
RSpec.describe Api::V1::Accounts::OnboardingsController do
  it 'reports an unstarted help center generation in the community edition' do
    controller = community_edition_of(
      described_class, :help_center_generation, :help_center_generation_status
    ).new
    allow(controller).to receive(:render)

    controller.help_center_generation

    expect(controller).to have_received(:render).with(
      json: { generation_id: nil, state: nil, articles_count: 0, categories_count: 0 }
    )
  end
end
