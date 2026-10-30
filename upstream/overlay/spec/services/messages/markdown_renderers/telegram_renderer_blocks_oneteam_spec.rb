require 'rails_helper'

# OneTeam coverage for turning Markdown into Telegram's HTML subset: code
# blocks, numbered lists and headings (Telegram has no heading tag, so they
# become bold lines).
RSpec.describe Messages::MarkdownRenderers::TelegramRenderer do
  def render(markdown)
    described_class.new.render(CommonMarker.render_doc(markdown, [:STRIKETHROUGH_DOUBLE_TILDE], [:strikethrough]))
  end

  it 'renders code blocks, numbered lists and headings' do
    html = render("# Steps\n\n1. Open\n2. Save\n\n```\nputs 1\n```")

    expect(html).to include('<strong>Steps</strong>', '1. Open', '2. Save', "<pre>puts 1\n</pre>")
  end
end
