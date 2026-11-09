require 'rails_helper'

# OneTeam coverage for password reset requests with a redirect URL that is
# not a string, and resets with an unknown token.
RSpec.describe 'Password reset edge cases (OneTeam)', type: :request do
  it 'rejects a redirect URL that is not a string' do
    post '/auth/password', params: { email: 'someone@example.com', redirect_url: { evil: 'x' } }, as: :json

    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.parsed_body['error']).to eq('Invalid redirect_url')
  end

  it 'rejects an unknown reset token' do
    put '/auth/password', params: { reset_password_token: 'nope', password: 'Password1!', password_confirmation: 'Password1!' }, as: :json

    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.parsed_body['message']).to eq('Invalid token')
  end
end
