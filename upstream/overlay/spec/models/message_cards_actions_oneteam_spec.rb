# frozen_string_literal: true

require 'rails_helper'

# OneTeam: card messages whose items have no actions are rejected.
RSpec.describe Message do
  it 'rejects cards items that have no actions' do
    message = build(:message, content_type: 'cards',
                              content_attributes: { items: [{ title: 'Card', description: 'No buttons' }] })

    expect(message).not_to be_valid
    expect(message.errors[:content_attributes]).to include('contains items missing actions')
  end
end
