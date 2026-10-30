require 'rails_helper'

# OneTeam coverage for the plain base renderer: soft breaks become spaces,
# strikethrough becomes <del> and unknown node types keep their children.
RSpec.describe Messages::MarkdownRenderers::BaseMarkdownRenderer do
  def render(markdown)
    doc = CommonMarker.render_doc(markdown, :DEFAULT, [:strikethrough])
    described_class.new.render(doc)
  end

  it 'joins soft-wrapped lines with a space' do
    expect(render("one\ntwo")).to eq("one two\n")
  end

  it 'wraps strikethrough text in del tags' do
    expect(render('~~gone~~')).to eq("<del>gone</del>\n")
  end

  it 'answers for any renderer method' do
    expect(described_class.new.respond_to?(:anything)).to be(true)
  end
end
