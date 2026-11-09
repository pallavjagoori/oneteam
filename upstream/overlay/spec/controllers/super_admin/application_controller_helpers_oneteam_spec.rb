require 'rails_helper'

# OneTeam coverage for super admin controller helpers: mounting a Vue
# component and refusing an invalid action.
RSpec.describe SuperAdmin::ApplicationController do
  let(:controller_instance) { described_class.new }

  it 'renders a Vue mount point with its props' do
    allow(controller_instance).to receive(:content_tag).and_return('<div></div>')

    controller_instance.send(:render_vue_component, 'Settings', { a: 1 })

    expect(controller_instance).to have_received(:content_tag)
      .with(:div, '', { id: 'app', data: { component_name: 'Settings', props: '{"a":1}' } })
  end

  it 'flashes an error and goes back' do
    flash = {}
    allow(controller_instance).to receive_messages(flash: flash, root_path: '/super_admin')
    allow(controller_instance).to receive(:redirect_back)

    controller_instance.send(:invalid_action_perfomed)

    expect(flash[:error]).to eq('Invalid action performed')
    expect(controller_instance).to have_received(:redirect_back).with(fallback_location: '/super_admin')
  end
end
