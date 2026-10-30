require 'rails_helper'

# OneTeam coverage for filling a contact's city and country from the IP
# address their browser last used (or first used, if none is newer).
RSpec.describe ContactIpLookupJob do
  let(:ip_lookup) { instance_double(IpLookupService) }
  let(:location) { Struct.new(:city, :country, :country_code).new('Pune', 'India', 'IN') }

  before { allow(IpLookupService).to receive(:new).and_return(ip_lookup) }

  it 'saves the location of the latest IP address' do
    contact = create(:contact, additional_attributes: { 'created_at_ip' => '1.1.1.1', 'updated_at_ip' => '2.2.2.2' })
    allow(ip_lookup).to receive(:perform).with('2.2.2.2').and_return(location)

    described_class.perform_now(contact)

    expect(contact.reload.additional_attributes).to include('city' => 'Pune', 'country' => 'India', 'country_code' => 'IN')
  end

  it 'changes nothing when the address cannot be located' do
    contact = create(:contact, additional_attributes: { 'created_at_ip' => '1.1.1.1' })
    allow(ip_lookup).to receive(:perform).with('1.1.1.1').and_return(nil)

    described_class.perform_now(contact)

    expect(contact.reload.additional_attributes).not_to include('city')
  end

  it 'logs a lookup that times out' do
    allow(ip_lookup).to receive(:perform).and_raise(Errno::ETIMEDOUT, 'geo')
    allow(Rails.logger).to receive(:warn)

    described_class.perform_now(create(:contact))

    expect(Rails.logger).to have_received(:warn).with(/ip resolution failed/)
  end
end
