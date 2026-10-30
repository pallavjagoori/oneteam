require 'rails_helper'
require 'rubygems/package'

# OneTeam coverage for downloading MaxMind's GeoLite2 city database: the
# archive is fetched with the IP lookup key and the .mmdb file inside it is
# saved where the geocoder looks; download errors are logged.
describe Geocoder::SetupService do
  let(:db_path) { Rails.root.join('tmp/oneteam-geolite.mmdb').to_s }

  before do
    stub_const('GeocoderConfiguration::LOOK_UP_DB', db_path)
    FileUtils.rm_f(db_path)
    allow(Rails.logger).to receive(:info)
    allow(Rails.logger).to receive(:error)
  end

  after { FileUtils.rm_f(db_path) }

  def geolite_archive
    tar = StringIO.new
    Gem::Package::TarWriter.new(tar) do |writer|
      writer.mkdir('GeoLite2-City_20261030', 0o755)
      writer.add_file_simple('GeoLite2-City_20261030/README.txt', 0o644, 6) { |f| f.write('readme') }
      writer.add_file_simple('GeoLite2-City_20261030/GeoLite2-City.mmdb', 0o644, 9) { |f| f.write('city-data') }
    end
    file = Tempfile.new(['geolite', '.tar.gz'])
    Zlib::GzipWriter.open(file.path) { |gz| gz.write(tar.string) }
    file
  end

  it 'downloads the archive and saves the city database' do
    archive = geolite_archive
    expect(Down).to receive(:download).with(/edition_id=GeoLite2-City&suffix=tar.gz&license_key=maxmind-key/).and_return(archive.path)

    with_modified_env IP_LOOKUP_API_KEY: 'maxmind-key' do
      described_class.new.perform
    end

    expect(File.read(db_path)).to eq('city-data')
    expect(Rails.logger).to have_received(:info).with('[rake ip_lookup:setup] Fetch complete')
  end

  it 'logs a failed download' do
    allow(Down).to receive(:download).and_raise(Down::NotFound, 'license expired')

    with_modified_env IP_LOOKUP_API_KEY: 'maxmind-key' do
      described_class.new.perform
    end

    expect(File).not_to exist(db_path)
    expect(Rails.logger).to have_received(:error).with('[rake ip_lookup:setup] license expired')
  end
end
