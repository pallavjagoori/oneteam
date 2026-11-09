require 'rails_helper'

# OneTeam coverage: a portal without allowed locales falls back to its default
# locale, or English when it has none.
RSpec.describe Portal do
  it 'falls back to the default locale, then English' do
    portal = build(:portal, config: { 'default_locale' => 'fr', 'allowed_locales' => [] })
    expect(portal.allowed_locale_codes).to eq(['fr'])

    portal.config = { 'allowed_locales' => [] }
    expect(portal.allowed_locale_codes).to eq(['en'])
  end
end
