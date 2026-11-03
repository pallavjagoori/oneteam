/**
 * OneTeam behaviour spec for the date picker CalendarWeek grid.
 *
 * Covers the action bar events, hovering and selecting days, and the
 * start and end calendar months.
 */
import { mount } from '@vue/test-utils';
import CalendarWeek from '../CalendarWeek.vue';

const ActionStub = {
  name: 'CalendarAction',
  props: { firstButtonLabel: String, buttonLabel: String },
  emits: ['prev', 'next', 'setView'],
  template: '<div class="action" />',
};

const start = new Date(2026, 0, 15);
const end = new Date(2026, 2, 15);

/**
 * Mounts the week grid.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountWeek = props =>
  mount(CalendarWeek, {
    props: {
      currentDate: new Date(2026, 0, 20),
      startCurrentDate: start,
      endCurrentDate: end,
      selectedStartDate: new Date(2026, 0, 10),
      selectedEndDate: new Date(2026, 0, 14),
      ...props,
    },
    global: {
      stubs: { CalendarAction: ActionStub, CalendarWeekLabel: true },
    },
  });

describe('CalendarWeek behaviour', () => {
  it('forwards prev, next and view changes from the action bar', () => {
    const wrapper = mountWeek({});
    const action = wrapper.findComponent(ActionStub);
    expect(action.props('firstButtonLabel')).toMatch(/Jan/);
    action.vm.$emit('prev');
    action.vm.$emit('next');
    action.vm.$emit('setView', 'start', 'year');
    expect(wrapper.emitted('prev')).toHaveLength(1);
    expect(wrapper.emitted('next')).toHaveLength(1);
    expect(wrapper.emitted('setView')).toEqual([['start', 'year']]);
  });

  it('shows the end month for the end calendar', () => {
    const wrapper = mountWeek({ calendarType: 'end' });
    expect(wrapper.findComponent(ActionStub).props('firstButtonLabel')).toMatch(
      /Mar/
    );
  });

  it('emits hovered and selected days', async () => {
    const wrapper = mountWeek({ selectingEndDate: true });
    const day = wrapper
      .findAll('.cursor-pointer')
      .find(node => node.text() === '12');
    await day.trigger('mouseenter');
    await day.trigger('mouseleave');
    await day.trigger('click');
    const hovered = wrapper.emitted('updateHoveredEndDate');
    expect(hovered[0][0].getDate()).toBe(12);
    expect(hovered[1]).toEqual([null]);
    expect(wrapper.emitted('selectDate')[0][0].getDate()).toBe(12);
  });

  it('marks the selected range', () => {
    const wrapper = mountWeek({});
    expect(wrapper.findAll('.bg-n-brand').length).toBeGreaterThanOrEqual(2);
    expect(wrapper.findAll('span.absolute').length).toBeGreaterThan(0);
  });
});
