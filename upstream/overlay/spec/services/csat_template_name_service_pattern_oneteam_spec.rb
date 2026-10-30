require 'rails_helper'

# OneTeam coverage for recognising this inbox's CSAT WhatsApp templates by
# name, with or without a version suffix.
RSpec.describe CsatTemplateNameService do
  describe '.matches_csat_pattern?' do
    it 'matches the base and versioned names of the inbox' do
      expect(described_class.matches_csat_pattern?('customer_satisfaction_survey_7', 7)).to be(true)
      expect(described_class.matches_csat_pattern?('customer_satisfaction_survey_7_3', 7)).to be(true)
    end

    it 'does not match blank names or other inboxes' do
      expect(described_class.matches_csat_pattern?(nil, 7)).to be(false)
      expect(described_class.matches_csat_pattern?('customer_satisfaction_survey_8', 7)).to be(false)
    end
  end
end
