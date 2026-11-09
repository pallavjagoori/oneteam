require 'rails_helper'

RSpec.describe ActionView::Template::Handlers::Liquid do
  let(:liquid_controller) do
    Class.new do
      private

      def liquid_filters = [:filter]
      def liquid_registers = { site: 'help' }
    end.new
  end
  let(:handler) { described_class.new(Struct.new(:controller).new(liquid_controller)) }

  it 'falls back to empty locals when the controller defines none' do
    expect(handler.locals).to eq({})
  end

  it 'reads filters and registers from the controller' do
    expect(handler.filters).to eq([:filter])
    expect(handler.registers).to eq(site: 'help')
  end

  it 'is not compilable' do
    expect(handler.compilable?).to be(false)
  end
end
