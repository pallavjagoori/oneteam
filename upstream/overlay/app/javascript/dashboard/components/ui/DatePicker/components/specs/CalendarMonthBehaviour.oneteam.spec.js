/**
 * OneTeam behaviour spec for the date picker month grid.
 *
 * Covers the active month for start and end calendars, the year label,
 * relaying view, previous and next actions, and selecting a month.
 */
import { mount } from '@vue/test-utils';
import CalendarMonth from '../CalendarMonth.vue';

const CalendarAction = {
  name: 'CalendarAction',
  props: ['buttonLabel', 'viewMode'],
  emits: ['setView', 'prev', 'next'],
  template: '<div />',
};

/**
 * Mounts the month grid.
 *
 * @param {string} calendarType start or end calendar
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountMonth = calendarType =>
  mount(CalendarMonth, {
    props: {
      calendarType,
      startCurrentDate: new Date(2026, 2, 5),
      endCurrentDate: new Date(2027, 9, 5),
    },
    global: { stubs: { CalendarAction } },
  });

describe('CalendarMonth behaviour', () => {
  it('highlights the start month and relays actions', async () => {
    const wrapper = mountMonth('start');
    const buttons = wrapper.findAll('button');
    expect(buttons).toHaveLength(12);
    expect(buttons[2].classes()).toContain('bg-n-brand');
    const action = wrapper.findComponent(CalendarAction);
    expect(action.props('buttonLabel')).toContain('2026');
    action.vm.$emit('setView', 'start', 'year');
    action.vm.$emit('prev');
    action.vm.$emit('next');
    await buttons[7].trigger('click');
    expect(wrapper.emitted()).toMatchObject({
      setView: [['start', 'year']],
      prev: [[]],
      next: [[]],
      selectMonth: [[7]],
    });
  });

  it('highlights the end month for the end calendar', () => {
    const wrapper = mountMonth('end');
    expect(wrapper.findAll('button')[9].classes()).toContain('bg-n-brand');
    expect(
      wrapper.findComponent(CalendarAction).props('buttonLabel')
    ).toContain('2027');
  });
});
