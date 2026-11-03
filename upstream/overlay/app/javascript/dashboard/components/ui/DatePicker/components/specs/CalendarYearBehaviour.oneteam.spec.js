/**
 * OneTeam behaviour spec for the date picker year grid.
 *
 * Covers showing the decade of the start or end date, highlighting the
 * active year, paging between decades, and picking a year.
 */
import { mount } from '@vue/test-utils';
import CalendarYear from '../CalendarYear.vue';

const CalendarAction = {
  name: 'CalendarAction',
  props: ['buttonLabel'],
  emits: ['prev', 'next'],
  template: '<div />',
};

/**
 * Mounts the year grid with a stubbed header.
 *
 * @param {object} props Grid props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountYears = props =>
  mount(CalendarYear, {
    props: {
      startCurrentDate: new Date(2024, 4, 1),
      endCurrentDate: new Date(2031, 4, 1),
      ...props,
    },
    global: { stubs: { CalendarAction } },
  });

describe('CalendarYear behaviour', () => {
  it('shows the start decade, highlights the year and pages', async () => {
    const wrapper = mountYears();
    const header = wrapper.getComponent(CalendarAction);
    expect(header.props('buttonLabel')).toBe('2020 - 2029');
    const active = wrapper.findAll('button').find(b => b.text() === '2024');
    expect(active.classes()).toContain('bg-n-brand');
    header.vm.$emit('next');
    await wrapper.vm.$nextTick();
    expect(header.props('buttonLabel')).toBe('2030 - 2039');
    header.vm.$emit('prev');
    header.vm.$emit('prev');
    await wrapper.vm.$nextTick();
    expect(header.props('buttonLabel')).toBe('2010 - 2019');
  });

  it('uses the end date for the end calendar and picks a year', async () => {
    const wrapper = mountYears({ calendarType: 'end' });
    expect(wrapper.getComponent(CalendarAction).props('buttonLabel')).toBe(
      '2030 - 2039'
    );
    const year = wrapper.findAll('button').find(b => b.text() === '2031');
    expect(year.classes()).toContain('bg-n-brand');
    await year.trigger('click');
    expect(wrapper.emitted('selectYear')).toEqual([[2031]]);
  });
});
