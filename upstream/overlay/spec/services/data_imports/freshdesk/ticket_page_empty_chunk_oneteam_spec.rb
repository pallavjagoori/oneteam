# frozen_string_literal: true

require 'rails_helper'

# OneTeam: a cursor past the stored tickets moves on to the next page.
RSpec.describe DataImports::Freshdesk::TicketPage do
  it 'points at the next page when the stored chunk is empty' do
    page = described_class.new(client: nil, starting_after: { 'page' => 1, 'offset' => 0, 'tickets' => [], 'next_page' => 2 },
                               per_page: 100)

    expect(page.next_cursor).to eq('page' => 2, 'offset' => 0)
  end
end
