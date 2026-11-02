/**
 * OneTeam behaviour spec for the custom snooze date and time picker.
 *
 * Covers the header, cancelling, applying the picked time, and the
 * picker's rules: no dates before yesterday and no times within the
 * next hour.
 */
import { mount } from '@vue/test-utils';
import CustomSnoozeModal from '../CustomSnoozeModal.vue';

const DatePicker = {
  name: 'DatePicker',
  props: ['value', 'disabledDate', 'disabledTime', 'lang'],
  emits: ['update:value'],
  template: '<div class="picker" />',
};
const NextButton = {
  name: 'NextButton',
  props: ['label', 'type'],
  emits: ['click'],
  template:
    '<button :type="type" @click="$emit(\'click\', $event)">{{ label }}</button>',
};

const mountModal = () =>
  mount(CustomSnoozeModal, {
    global: {
      stubs: {
        DatePicker,
        NextButton,
        WootModalHeader: {
          props: ['headerTitle'],
          template: '<h2>{{ headerTitle }}</h2>',
        },
      },
    },
  });

describe('CustomSnoozeModal behaviour', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('cancels or applies the picked time', async () => {
    const wrapper = mountModal();
    expect(wrapper.find('h2').text()).toBe('CONVERSATION.CUSTOM_SNOOZE.TITLE');
    await wrapper.find('button[type="reset"]').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);

    const time = new Date('2030-01-01T10:00:00Z');
    await wrapper.findComponent(DatePicker).vm.$emit('update:value', time);
    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('chooseTime')).toEqual([[time]]);
  });

  it('blocks past dates and times within the next hour', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-06-15T12:00:00Z'));
    const picker = mountModal().findComponent(DatePicker);
    const { disabledDate, disabledTime } = picker.props();
    expect(disabledDate(new Date('2030-06-13T12:00:00Z'))).toBe(true);
    expect(disabledDate(new Date('2030-06-15T00:00:00Z'))).toBe(false);
    expect(disabledTime(new Date('2030-06-15T12:30:00Z'))).toBe(true);
    expect(disabledTime(new Date('2030-06-15T13:30:00Z'))).toBe(false);
    expect(picker.props('lang').days).toHaveLength(7);
  });
});
