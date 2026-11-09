# frozen_string_literal: true

require 'rails_helper'

# OneTeam: outside development and test, the swagger docs are hidden.
RSpec.describe SwaggerController, type: :request do
  it 'answers not found in other environments' do
    allow(Rails.env).to receive_messages(development?: false, test?: false)

    get '/swagger/index.html'

    expect(response).to have_http_status(:not_found)
  end
end
