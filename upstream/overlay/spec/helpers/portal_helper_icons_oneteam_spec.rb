require 'rails_helper'

# OneTeam coverage for help center category icons (an emoji, or a Remix
# icon name with an optional colour) and the "written by" author label.
describe PortalHelper do
  describe '#render_emoji_or_icon' do
    it 'renders nothing for a blank icon' do
      expect(helper.render_emoji_or_icon(nil)).to eq('')
    end

    it 'escapes an emoji or any text that is not an icon name' do
      expect(helper.render_emoji_or_icon('🚀')).to eq('🚀')
      expect(helper.render_emoji_or_icon('<b>')).to eq('&lt;b&gt;')
    end

    it 'renders a Remix icon, with a safe colour only' do
      expect(helper.render_emoji_or_icon('vip-crown-2-fill', '#ff0000'))
        .to eq('<span class="i-ri-vip-crown-2-fill" style="color: #ff0000;" aria-hidden="true"></span>')
      expect(helper.render_emoji_or_icon('i-lucide-star', 'red;background:url(x)'))
        .to eq('<span class="i-lucide-star" aria-hidden="true"></span>')
    end
  end

  describe '#format_authors_label' do
    let(:authors) { %w[Ann Bob Cy Dee Eve].map { |name| build(:user, name: name, display_name: name) } }

    it 'lists up to three authors and counts the rest' do
      expect(helper.format_authors_label([])).to be_nil
      expect(helper.format_authors_label(authors.first(3))).to eq('Ann, Bob, and Cy')
      expect(helper.format_authors_label(authors)).to eq(I18n.t('public_portal.sidebar.authors_others', names: 'Ann, Bob', count: 3))
    end
  end
end
