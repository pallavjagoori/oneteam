require 'rails_helper'

# OneTeam coverage: a working day cannot close at or before the time it opens.
RSpec.describe WorkingHour do
  it 'rejects a closing time before the opening time' do
    working_hour = build(:working_hour, open_hour: 17, open_minutes: 0, close_hour: 9, close_minutes: 0)

    expect(working_hour).not_to be_valid
    expect(working_hour.errors[:close_hour]).to include('Closing time cannot be before opening time')
  end
end
