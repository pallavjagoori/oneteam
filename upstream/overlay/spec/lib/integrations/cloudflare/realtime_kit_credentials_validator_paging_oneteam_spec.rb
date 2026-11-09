require 'rails_helper'

# OneTeam coverage for Cloudflare app paging without a total count, and
# response bodies that are not JSON.
RSpec.describe Integrations::Cloudflare::RealtimeKitCredentialsValidator do
  it 'asks for another page when a full page came back' do
    apps = Array.new(described_class::APPS_PAGE_SIZE) { {} }

    expect(described_class.send(:next_apps_page?, {}, 1, apps)).to be(true)
    expect(described_class.send(:next_apps_page?, {}, 1, [{}])).to be(false)
  end

  it 'treats a body that is not JSON as empty' do
    expect(described_class.send(:parse_response, Struct.new(:body).new('<html>'))).to eq({})
  end
end
