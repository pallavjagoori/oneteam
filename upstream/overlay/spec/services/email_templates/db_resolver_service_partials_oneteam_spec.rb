require 'rails_helper'

# OneTeam coverage for partial paths in the database template resolver.
RSpec.describe EmailTemplates::DbResolverService do
  let(:resolver) { described_class.send(:allocate) }

  it 'prefixes the file name of nested partials' do
    expect(resolver.send(:virtual_path, +'mailer/footer', true)).to eq('mailer/_footer')
  end

  it 'prefixes top-level partials' do
    expect(resolver.send(:virtual_path, 'footer', true)).to eq('_footer')
  end
end
