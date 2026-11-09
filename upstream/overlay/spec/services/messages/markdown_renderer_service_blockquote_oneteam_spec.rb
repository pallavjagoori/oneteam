# frozen_string_literal: true

require 'rails_helper'

# OneTeam: block quotes render for Instagram (plain) and WhatsApp (quoted).
RSpec.describe Messages::MarkdownRendererService do
  it 'renders a block quote for Instagram and WhatsApp' do
    expect(described_class.new('> quoted', 'Channel::Instagram').render).to include('quoted')
    expect(described_class.new('> quoted', 'Channel::Whatsapp').render).to include('> quoted')
  end
end
