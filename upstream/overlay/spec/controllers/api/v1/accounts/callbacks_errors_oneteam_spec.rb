require 'rails_helper'

# OneTeam coverage for the Facebook connect flow's error and paging paths:
# a failed page registration is reported to error tracking, the page list
# follows Facebook's next-page links, page details and token exchange
# failures are logged without stopping the flow, and a failed
# reauthorisation update is reported.
RSpec.describe 'Facebook callbacks (OneTeam)', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:headers) { admin.create_new_auth_token }
  let(:koala_api) { instance_double(Koala::Facebook::API) }
  let(:koala_oauth) { instance_double(Koala::Facebook::OAuth, exchange_access_token_info: { 'access_token' => 'long' }) }
  let(:tracker) { instance_double(ChatwootExceptionTracker, capture_exception: true) }
  let(:base) { "/api/v1/accounts/#{account.id}/callbacks" }

  before do
    stub_request(:any, /graph.facebook.com/)
    allow(Facebook::Messenger::Subscriptions).to receive(:subscribe).and_return(true)
    allow(Koala::Facebook::OAuth).to receive(:new).and_return(koala_oauth)
    allow(Koala::Facebook::API).to receive(:new).and_return(koala_api)
    allow(ChatwootExceptionTracker).to receive(:new).and_return(tracker)
    allow(Rails.logger).to receive(:error)
  end

  it 'reports a page that cannot be registered' do
    post "#{base}/register_facebook_page", params: { page_id: nil, inbox_name: 'FB' }, headers: headers, as: :json

    expect(tracker).to have_received(:capture_exception)
    expect(Rails.logger).to have_received(:error).with(/Error in register_facebook_page/)
  end

  it 'logs page details that cannot be fetched and still registers the page' do
    allow(Facebook::PageDetailsService).to receive(:new).and_raise(StandardError, 'graph down')
    allow(koala_api).to receive(:get_object).and_return({})

    post "#{base}/register_facebook_page", params: { page_id: 'p1', page_access_token: 'pt', user_access_token: 'ut', inbox_name: 'FB' },
                                           headers: headers, as: :json

    expect(account.facebook_pages.find_by(page_id: 'p1')).to be_present
    expect(Rails.logger).to have_received(:error).with('Error in sync_page_details: graph down')
  end

  it 'follows Facebook’s pages until the last one' do
    # Koala returns pages of results that answer next_page.
    second = [{ 'id' => '2', 'name' => 'Two' }].tap { |page| page.define_singleton_method(:next_page) { nil } }
    first = [{ 'id' => '1', 'name' => 'One' }].tap { |page| page.define_singleton_method(:next_page) { second } }
    allow(koala_api).to receive(:get_connections).with('me', 'accounts').and_return(first)

    post "#{base}/facebook_pages", headers: headers, as: :json

    expect(response.parsed_body['data']['page_details'].pluck('id')).to eq(%w[1 2])
  end

  it 'logs a failed token exchange' do
    allow(koala_oauth).to receive(:exchange_access_token_info).and_raise(StandardError, 'bad code')
    allow(koala_api).to receive(:get_connections).and_return([])

    post "#{base}/facebook_pages", headers: headers, as: :json

    expect(Rails.logger).to have_received(:error).with('Error in long_lived_token: bad code')
  end

  it 'reports a failed reauthorisation update' do
    inbox = create(:inbox, account: account)
    page = create(:channel_facebook_page, account: account, inbox: inbox)
    allow(koala_api).to receive(:get_connections).with('me', 'accounts').and_return([{ 'id' => page.page_id, 'access_token' => 'new' }])
    allow_any_instance_of(Channel::FacebookPage).to receive(:update!).and_raise(StandardError, 'locked') # rubocop:disable RSpec/AnyInstance

    post "#{base}/reauthorize_page", params: { inbox_id: inbox.id }, headers: headers, as: :json

    expect(Rails.logger).to have_received(:error).with('Error in update_fb_page: locked')
  end
end
