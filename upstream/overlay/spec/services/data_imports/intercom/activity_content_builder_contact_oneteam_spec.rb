# frozen_string_literal: true

require 'rails_helper'

# OneTeam: an unnamed contact author is shown as "Contact".
RSpec.describe DataImports::Intercom::ActivityContentBuilder do
  it 'names an anonymous contact author Contact' do
    builder = described_class.new({ 'author' => { 'type' => 'lead' } })

    expect(builder.send(:actor_name)).to eq('Contact')
  end
end
