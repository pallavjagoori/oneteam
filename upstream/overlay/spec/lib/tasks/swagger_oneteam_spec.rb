require 'rails_helper'

# OneTeam coverage for the `swagger:*` tasks that combine the API definition
# fragments into swagger.json, split it into one file per tag group and link
# those files into the developer docs. They run on a copy of the swagger
# folder so the repository's files are never rewritten.
RSpec.describe 'swagger tasks' do # rubocop:disable RSpec/DescribeClass
  let(:root) { Pathname.new(Dir.mktmpdir) }
  let(:tag_groups) { root.join('swagger/tag_groups') }

  before do
    FileUtils.cp_r(Rails.root.join('swagger'), root)
    FileUtils.rm_rf(tag_groups)
    allow(Rails).to receive(:root).and_return(root)
    %w[swagger:build swagger:build_tag_groups].each { |name| Rake::Task[name].reenable }
  end

  after { FileUtils.remove_entry(root) }

  it 'builds swagger.json and one file per tag group' do
    output = run_rake('swagger:build').output

    expect(output).to include('Swagger build was successful.', 'Tag-specific swagger files generated successfully.')
    expect(JSON.parse(root.join('swagger/swagger.json').read)).to have_key('paths')
    expect(tag_groups.join('application_swagger.json')).to exist
    expect(tag_groups.join('other_swagger.json')).to exist
  end

  it 'links the tag group files into the developer docs' do
    output = run_rake('swagger:build_for_docs').output

    expect(output).to include('Symlinks created successfully.')
    expect(root.join('developer-docs/public/swagger/tag_groups/platform_swagger.json')).to be_symlink
  end

  it 'skips links to missing files' do
    target = root.join('docs/missing.json')
    FileUtils.mkdir_p(target.dirname)

    expect { SwaggerTaskActions.send(:_create_symlink, root.join('nope.json'), target) }
      .to output(/Source file .*nope.json not found/).to_stdout
  end

  it 'ignores malformed paths, operations and tags' do
    paths = { '/a' => 'not a hash', '/b' => { 'get' => 'not a hash' }, '/c' => { 'get' => { 'tags' => 'Contacts' } },
              '/d' => { 'get' => { 'tags' => ['Contacts'] } } }

    expect(SwaggerTaskActions.send(:_filter_paths_for_tag_group, paths, ['Contacts']).keys).to eq(['/d'])
    expect(SwaggerTaskActions.send(:_filter_paths_for_tag_group, nil, ['Contacts'])).to eq({})
    expect(SwaggerTaskActions.send(:_filter_tags_for_tag_group, nil, ['Contacts'])).to eq([])
  end
end
