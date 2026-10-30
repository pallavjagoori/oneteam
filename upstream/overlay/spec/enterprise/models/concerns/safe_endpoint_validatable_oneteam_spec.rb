require 'rails_helper'

# OneTeam coverage for the custom tool endpoint checks that Chatwoot's spec
# leaves out: unparseable URLs, a missing host, .local hosts and IP
# addresses (IPv4 and IPv6) are all rejected.
RSpec.describe Concerns::SafeEndpointValidatable do
  def errors_for(url)
    tool = build(:captain_custom_tool, endpoint_url: url)
    tool.valid?
    tool.errors[:endpoint_url]
  end

  it 'rejects URLs it cannot parse' do
    expect(errors_for('https://bad host/x')).to eq(['must be a valid URL'])
  end

  it 'rejects disallowed hosts and IP addresses' do
    expect(errors_for('https://printer.local/api')).to eq(['cannot use disallowed hostname'])
    expect(errors_for('https://10.0.0.1/api')).to eq(['cannot be an IP address, must be a hostname'])
    expect(errors_for('https://[fd00::1]/api')).to eq(['cannot be an IP address, must be a hostname'])
  end

  # With no host, the IP check calls include? on nil, so validation raises
  # instead of adding an error (FINDINGS.md).
  it 'raises on a URL without a host' do
    expect { errors_for('https:/api') }.to raise_error(NoMethodError, /include\?/)
  end
end
