require 'rails_helper'

# OneTeam coverage for the edges of a pending Shopify app-store installation
# (an encrypted token in Redis that an account claims): unreadable payloads,
# tokens already bound to another account, and a consume step whose outcome
# Redis cannot confirm.
RSpec.describe Shopify::PendingInstallation do
  let(:shop) { 'my-store.myshopify.com' }
  let(:encryption_env) do
    { 'ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY' => 'primary-key', 'ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY' => 'deterministic-key',
      'ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT' => 'key-derivation-salt' }
  end
  let(:token) { described_class.create(access_token: 'shopify-token', shop: shop, scope: 'read_orders') }

  around { |example| with_modified_env(encryption_env) { example.run } }

  after do
    Redis::Alfred.delete("shopify_pending_install:#{token}")
    Redis::Alfred.delete("shopify_pending_install_claim:#{token}")
  end

  context 'when the stored payload is not JSON' do
    before { allow(Redis::SecureStorage).to receive(:get).and_return('not json') }

    it 'is not pending and cannot be claimed' do
      expect(described_class.pending?(token: token)).to be(false)
      expect { described_class.claim(token: token) }.to raise_error(described_class::InvalidToken)
    end
  end

  it 'cannot be claimed without an account once bound to one' do
    described_class.claim(token: token, account_id: 5).release!

    expect { described_class.claim(token: token) }.to raise_error(described_class::InvalidToken, 'Install token is already bound to an account')
  end

  it 'releases quietly when the payload expired before unbinding' do
    installation = described_class.claim(token: token, account_id: 5)
    Redis::Alfred.delete("shopify_pending_install:#{token}")

    expect { installation.release!(unbind: true) }.not_to raise_error
  end

  describe '#consume!' do
    let(:installation) { described_class.claim(token: token, account_id: 5) }

    before { allow(installation).to receive(:consume_claim).and_raise(Redis::TimeoutError, 'timeout') }

    it 'passes the error on when the token was not consumed' do
      expect { installation.consume! }.to raise_error(Redis::TimeoutError)
    end

    it 'reports an unknown outcome when only the claim is left' do
      Redis::Alfred.delete("shopify_pending_install:#{token}")

      expect { installation.consume! }.to raise_error(described_class::CommitOutcomeUnknown)
    end

    it 'reports an unknown outcome when Redis cannot be read' do
      allow(Redis::Alfred).to receive(:with).and_raise(Redis::CannotConnectError)

      expect { installation.consume! }.to raise_error(described_class::CommitOutcomeUnknown)
    end
  end
end
