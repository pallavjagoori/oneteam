require 'rails_helper'

# OneTeam coverage for database statement timeouts inside a request, and the
# shared 500 answer.
RSpec.describe RequestExceptionHandler do
  let(:controller_instance) { ApplicationController.new }

  before do
    allow(controller_instance).to receive(:render)
    allow(controller_instance).to receive(:log_handled_error)
  end

  it 'answers 422 with a friendly message when a query is canceled' do
    controller_instance.send(:handle_with_exception) { raise ActiveRecord::QueryCanceled, 'canceling statement due to statement timeout' }

    expect(controller_instance).to have_received(:render)
      .with(json: { error: I18n.t('errors.database.query_canceled') }, status: :unprocessable_entity)
  end

  it 'renders internal server errors' do
    controller_instance.send(:render_internal_server_error, 'Something broke')

    expect(controller_instance).to have_received(:render).with(json: { error: 'Something broke' }, status: :internal_server_error)
  end
end
