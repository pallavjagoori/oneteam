require 'rails_helper'

# OneTeam coverage for tables in rendered messages: email clients drop
# stylesheets, so tables, header cells and cells carry inline styles, each
# column keeps its alignment, and empty cells get a non-breaking space.
# Also an image link the URI parser rejects still renders.
describe BaseMarkdownRenderer do
  def render(markdown)
    ChatwootMarkdownRenderer.new(markdown).render_message
  end

  it 'renders a table with inline styles, alignment and filled empty cells' do
    html = render("| Plan | Price |\n|:-----|------:|\n| Pro  |       |\n")

    expect(html).to include(%(<table style="#{described_class::TABLE_STYLE}">))
    expect(html).to include(%(<th style="#{described_class::TABLE_HEADER_STYLE} text-align: left;">Plan</th>))
    expect(html).to include(%(<td style="#{described_class::TABLE_CELL_STYLE} text-align: right;">&nbsp;</td>))
    expect(html).to include("</tbody>\n</table>")
  end

  it 'renders a header-only table and unaligned columns' do
    html = render("| A |\n|---|\n")

    expect(html).to include('text-align: inherit;')
    expect(html).not_to include('<tbody>')
  end

  it 'renders an image whose address cannot be parsed' do
    expect(render('![logo](https://exa%mple.com/a.png)')).to include('<img')
  end
end
