# frozen_string_literal: true

require 'rails_helper'

# OneTeam: a network failure while fetching a manifest becomes a source error.
RSpec.describe Captain::ToolsManifest::GithubSource do
  it 'wraps a socket error' do
    allow(HTTParty).to receive(:get).and_raise(SocketError, 'getaddrinfo failed')

    expect { described_class.allocate.send(:get, 'https://raw.githubusercontent.com/x') }
      .to raise_error(described_class::SourceError, 'Could not fetch https://raw.githubusercontent.com/x: getaddrinfo failed')
  end
end
