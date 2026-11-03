/**
 * OneTeam behaviour spec for the calendar header actions.
 *
 * Covers previous and next for the calendar, switching to the given view
 * or to the year view, and hiding labels that aren't set.
 */
import { mount } from '@vue/test-utils';
import CalendarAction from '../CalendarAction.vue';

const NextButton = {
  name: 'NextButton',
  props: ['icon'],
  emits: ['click'],
  template: '<i :class="icon" @click="$emit(\'click\', $event)" />',
};
const mountAction = props =>
  mount(CalendarAction, { props, global: { stubs: { NextButton } } });

describe('CalendarAction behaviour', () => {
  it('moves and switches views', async () => {
    const wrapper = mountAction({
      calendarType: 'end',
      firstButtonLabel: 'March',
      buttonLabel: '2026',
      viewMode: 'month',
    });
    await wrapper.find('.i-lucide-chevron-left').trigger('click');
    await wrapper.find('.i-lucide-chevron-right').trigger('click');
    const [month, year] = wrapper.findAll('button');
    expect(year.classes()).toContain('hover:text-n-brand');
    await month.trigger('click');
    await year.trigger('click');
    expect(wrapper.emitted('prev')).toEqual([['end']]);
    expect(wrapper.emitted('next')).toEqual([['end']]);
    expect(wrapper.emitted('setView')).toEqual([
      ['end', 'month'],
      ['end', 'year'],
    ]);
  });

  it('hides missing labels', () => {
    expect(mountAction().findAll('button')).toHaveLength(0);
    const yearOnly = mountAction({ buttonLabel: '2026' });
    expect(yearOnly.findAll('button')).toHaveLength(1);
    expect(yearOnly.find('button').classes()).not.toContain(
      'hover:text-n-brand'
    );
  });
});
