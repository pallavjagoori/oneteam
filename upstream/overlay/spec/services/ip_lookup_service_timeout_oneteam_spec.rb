require 'rails_helper'

# OneTeam coverage for IP lookups when the GeoIP database is present: a
# result, and a timeout that is only logged.
RSpec.describe IpLookupService do
  before { allow(File).to receive(:exist?).and_call_original }

  it 'returns the first Geocoder result' do
    allow(File).to receive(:exist?).with(GeocoderConfiguration::LOOK_UP_DB).and_return(true)
    allow(Geocoder).to receive(:search).with('1.2.3.4').and_return(%w[first second])

    expect(described_class.new.perform('1.2.3.4')).to eq('first')
  end

  it 'logs a warning instead of raising when the lookup times out' do
    allow(File).to receive(:exist?).with(GeocoderConfiguration::LOOK_UP_DB).and_return(true)
    allow(Geocoder).to receive(:search).and_raise(Errno::ETIMEDOUT)
    allow(Rails.logger).to receive(:warn)

    expect { described_class.new.perform('1.2.3.4') }.not_to raise_error
    expect(Rails.logger).to have_received(:warn).with(/IP resolution failed/)
  end
end
