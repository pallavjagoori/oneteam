require 'rails_helper'

# OneTeam coverage for the website scraping fallback behind signup branding:
# a site that cannot be fetched, links and icons with broken URLs, and the MX
# lookup that guesses whether the domain's mail is hosted by Google or
# Microsoft.
RSpec.describe WebsiteBrandingService do
  let(:service) { described_class.new('ada@acme.test') }

  before { allow(Rails.logger).to receive(:error) }

  it 'gives up quietly when the site cannot be fetched' do
    allow(SafeFetch).to receive(:fetch).and_raise(SafeFetch::Error, 'blocked')

    expect(service.send(:fetch_page)).to be_nil
    expect(Rails.logger).to have_received(:error).with('[WebsiteBranding] Failed to fetch https://acme.test: blocked')
  end

  it 'skips links and icons with invalid URLs' do
    doc = Nokogiri::HTML('<a href="http://ok.test/a">ok</a><a href="/ bad path">bad</a>')

    expect(service.send(:extract_links, doc)).to eq(['http://ok.test/a'])
    expect(service.send(:resolve_url, '/ bad icon.png')).to be_nil
  end

  it 'recognises Google and Microsoft mail hosts by their MX records' do
    allow(service).to receive(:mx_records).and_return(['aspmx.l.google.com'])
    expect(service.send(:detect_email_provider)).to eq('google')

    allow(service).to receive(:mx_records).and_return(['acme-test.mail.protection.outlook.com'])
    expect(service.send(:detect_email_provider)).to eq('microsoft')

    allow(service).to receive(:mx_records).and_return(['mx.notgoogle.com'])
    expect(service.send(:detect_email_provider)).to be_nil
  end

  it 'treats a failed MX lookup as no records' do
    allow(Resolv::DNS).to receive(:open).and_raise(Resolv::ResolvError, 'no answer')

    expect(service.send(:mx_records)).to eq([])
    expect(Rails.logger).to have_received(:error).with('[WebsiteBranding] MX probe failed for acme.test: no answer')
  end
end
