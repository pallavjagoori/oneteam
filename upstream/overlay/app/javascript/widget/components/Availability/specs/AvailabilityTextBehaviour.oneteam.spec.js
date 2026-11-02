/**
 * OneTeam behaviour spec for the widget's "we'll reply..." availability
 * line.
 *
 * Covers the reply time during working hours, online/offline when
 * working hours are off, every day closed, no next slot, and the next
 * opening: tomorrow, on a named day, in minutes (rounded up to five), in
 * hours (rounded up) and at an exact time three or more hours away.
 */
import { mount } from '@vue/test-utils';
import AvailabilityText from '../AvailabilityText.vue';

const env = vi.hoisted(() => ({ slot: null, calls: [] }));

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({
    t: (key, params) =>
      params === undefined ? key : `${key} ${JSON.stringify(params)}`,
  }),
}));
vi.mock('widget/helpers/availabilityHelpers', () => ({
  findNextAvailableSlotDetails: (...args) => {
    env.calls.push(args);
    return env.slot;
  },
}));

const hours = [{ dayOfWeek: 1, closedAllDay: false }];
const time = new Date(2026, 2, 4, 9, 0);

const mountText = props =>
  mount(AvailabilityText, {
    props: {
      time,
      utcOffset: '+05:30',
      workingHours: hours,
      workingHoursEnabled: true,
      isOnline: false,
      isInWorkingHours: false,
      ...props,
    },
  });
const textFor = props => mountText(props).text();

const slot = (
  minutesUntilOpen,
  daysUntilOpen = 0,
  config = { dayOfWeek: 3 }
) => ({
  minutesUntilOpen,
  daysUntilOpen,
  config,
});

describe('AvailabilityText behaviour', () => {
  beforeEach(() => {
    env.slot = null;
    env.calls = [];
  });

  it('shows the reply time or a fallback without working hours', () => {
    expect(textFor({ isInWorkingHours: true, replyTime: 'in_a_day' })).toBe(
      'REPLY_TIME.IN_A_DAY'
    );
    expect(textFor({ workingHoursEnabled: false, isOnline: true })).toBe(
      'REPLY_TIME.IN_A_FEW_MINUTES'
    );
    expect(textFor({ workingHoursEnabled: false })).toBe(
      'TEAM_AVAILABILITY.BACK_AS_SOON_AS_POSSIBLE'
    );
    expect(textFor({ workingHours: [{ closedAllDay: true }] })).toBe(
      'TEAM_AVAILABILITY.BACK_AS_SOON_AS_POSSIBLE'
    );
    expect(env.calls).toEqual([]);
  });

  it('falls back when there is no next slot', () => {
    expect(textFor({ workingHours: [] })).toBe('REPLY_TIME.BACK_IN_SOME_TIME');
    expect(env.calls[0]).toEqual([time, '+05:30', []]);
  });

  it('names the next opening day', () => {
    env.slot = slot(1500, 1);
    expect(textFor()).toBe('REPLY_TIME.BACK_TOMORROW');
    env.slot = slot(3000, 3, { dayOfWeek: 3 });
    expect(textFor()).toBe(
      'REPLY_TIME.BACK_ON_DAY {"day":"DAY_NAMES.WEDNESDAY"}'
    );
  });

  it('counts minutes and hours until opening the same day', () => {
    env.slot = slot(12);
    expect(textFor()).toBe('REPLY_TIME.BACK_IN_MINUTES {"time":"15"}');
    env.slot = slot(90);
    expect(textFor()).toBe('REPLY_TIME.BACK_IN_HOURS 2');
    env.slot = slot(120);
    expect(textFor()).toBe('REPLY_TIME.BACK_IN_HOURS 2');
  });

  it('gives the exact time three or more hours away', () => {
    env.slot = slot(200, 0, { dayOfWeek: 3, openHour: 14, openMinutes: 30 });
    expect(textFor()).toMatch(
      /^REPLY_TIME.BACK_AT_TIME \{"time":"0?2:30 PM"\}$/
    );
    env.slot = slot(200, 0, { dayOfWeek: 3 });
    expect(textFor()).toMatch(
      /^REPLY_TIME.BACK_AT_TIME \{"time":"12:00 AM"\}$/
    );
  });

  it('looks for the next slot while online outside working hours', () => {
    env.slot = slot(1500, 1);
    expect(textFor({ isOnline: true })).toBe('REPLY_TIME.BACK_TOMORROW');
  });

  it('has no next slot to compute when it is not needed', () => {
    env.slot = slot(200);
    // The template never reads these in these states; read them directly.
    [
      { isInWorkingHours: true, isOnline: true },
      { workingHoursEnabled: false },
      { workingHours: [{ closedAllDay: true }] },
    ].forEach(props => {
      const { vm } = mountText(props);
      expect(vm.nextSlot).toBeNull();
      expect(vm.roundedMinutesUntilOpen).toBe(0);
      expect(vm.adjustedHoursUntilOpen).toBe(0);
      expect(vm.formattedOpeningTime).toBe('');
    });
    expect(env.calls).toEqual([]);
  });
});
