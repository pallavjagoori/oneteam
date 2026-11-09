require 'rails_helper'

# OneTeam coverage for links, code blocks, quotes and rules in the LINE and
# plain text markdown renderers.
RSpec.describe Messages::MarkdownRenderers::LineRenderer do
  let(:markdown) { "[site](https://example.com)\n\n```\ncode\n```\n\n> quoted\n\n---\n\nend" }

  def render_with(renderer)
    renderer.new.render(CommonMarker.render_doc(markdown, :DEFAULT))
  end

  it 'renders links, code blocks and quotes for LINE' do
    output = render_with(described_class)

    expect(output).to include('https://example.com')
    expect(output).to include("```\ncode\n```")
    expect(output).to include('quoted')
  end

  it 'renders code blocks, quotes and rules as plain text' do
    output = render_with(Messages::MarkdownRenderers::PlainTextRenderer)

    expect(output).to include("code\n")
    expect(output).to include('quoted')
    expect(output).to include('end')
  end
end
