# frozen_string_literal: true

require 'rails_helper'

# OneTeam: Sentry reports carry the account context and tag. Sentry is not loaded in the
# test environment, so a stand-in module plays its part.
RSpec.describe ChatwootExceptionTracker do
  it 'adds the account to the Sentry scope' do
    account = create(:account)
    scope = Class.new do
      attr_reader :calls

      def initialize = @calls = []
      def set_context(*args) = @calls << [:context, *args]
      def set_tags(**tags) = @calls << [:tags, tags]
      def set_user(*) = nil
    end.new
    sentry = stub_const('Sentry', Module.new)
    sentry.define_singleton_method(:with_scope) { |&block| block.call(scope) }
    sentry.define_singleton_method(:capture_exception) { |_error| nil }

    described_class.new(StandardError.new('x'), account: account).send(:capture_exception_with_sentry)

    expect(scope.calls).to include([:context, 'account', { id: account.id, name: account.name }], [:tags, { account_id: account.id }])
  end
end
