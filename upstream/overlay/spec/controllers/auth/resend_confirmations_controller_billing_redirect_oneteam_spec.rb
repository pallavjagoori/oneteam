require 'rails_helper'

RSpec.describe Auth::ResendConfirmationsController do
  let(:controller_instance) { described_class.new }

  def billing_redirect?(url)
    controller_instance.send(:shopify_billing_redirect?, url)
  end

  it 'accepts a billing redirect with a valid shop and plan' do
    expect(billing_redirect?('settings/billing?shop=acme.myshopify.com&plan_handle=pro_1')).to be(true)
  end

  it 'rejects a billing redirect with an unknown parameter' do
    expect(billing_redirect?('settings/billing?shop=acme.myshopify.com&evil=1')).to be(false)
  end

  it 'rejects a billing redirect with repeated parameters' do
    expect(billing_redirect?('settings/billing?plan_handle=a&plan_handle=b')).to be(false)
  end

  it 'rejects a billing redirect whose query has no parameters' do
    expect(billing_redirect?('settings/billing?&')).to be(false)
  end

  it 'rejects a billing redirect whose query cannot be decoded' do
    allow(URI).to receive(:decode_www_form).and_raise(ArgumentError)

    expect(billing_redirect?('settings/billing?shop=%')).to be(false)
  end
end
