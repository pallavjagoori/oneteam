require 'rails_helper'

# OneTeam coverage for bulk article translation in the community edition,
# which has no translator and answers 501 Not Implemented. The enterprise
# module replaces this action in Chatwoot's suite.
RSpec.describe Api::V1::Accounts::Articles::BulkActionsController do
  it 'answers not implemented in the community edition' do
    controller = community_edition_of(described_class, :translate).new
    allow(controller).to receive(:head)

    controller.translate

    expect(controller).to have_received(:head).with(:not_implemented)
  end
end
