/**
 * OneTeam behaviour spec for one business-hours row.
 *
 * Covers enabling and disabling a day, picking open and close times
 * (valid ranges, reversed ranges and the "12:00 AM" end of day),
 * toggling "open all day" on and off, the hours total shown for a
 * slot (hours and minutes, all day, zero) and the validation error.
 */
import { mount } from '@vue/test-utils';
import BusinessDay from '../BusinessDay.vue';

const NextSelect = {
  name: 'NextSelect',
  props: ['modelValue', 'groups', 'disabled', 'placeholder'],
  emits: ['update:modelValue'],
  template: '<div class="select" />',
};

const mountDay = timeSlot =>
  mount(BusinessDay, {
    props: { dayName: 'Monday', timeSlot },
    global: {
      stubs: { NextSelect, Icon: true },
      mocks: { $t: key => key },
    },
  });

const openSlot = {
  day: 1,
  from: '09:00 AM',
  to: '05:30 PM',
  valid: true,
  openAllDay: false,
};
const lastUpdate = wrapper => wrapper.emitted('update').at(-1)[0];

describe('BusinessDay behaviour', () => {
  it('shows only the day toggle for a closed day', () => {
    const wrapper = mountDay({ day: 1, from: '', to: '' });
    expect(wrapper.text()).toContain('Monday');
    expect(wrapper.find('input[name="enable-day"]').element.checked).toBe(
      false
    );
    expect(wrapper.findAllComponents(NextSelect)).toHaveLength(0);
  });

  it('opens a closed day from the first slot for eight hours', async () => {
    const wrapper = mountDay({ day: 1, from: '', to: '' });
    await wrapper.find('input[name="enable-day"]').setValue(true);
    expect(lastUpdate(wrapper)).toEqual({
      day: 1,
      from: '12:00 AM',
      to: '08:00 AM',
      valid: true,
      openAllDay: false,
    });
  });

  it('closes an open day', async () => {
    const wrapper = mountDay(openSlot);
    await wrapper.find('input[name="enable-day"]').setValue(false);
    expect(lastUpdate(wrapper)).toMatchObject({
      from: '',
      to: '',
      valid: false,
      openAllDay: false,
    });
  });

  it('shows the hours total and the time choices for an open day', () => {
    const wrapper = mountDay(openSlot);
    expect(wrapper.text()).toContain('8h 30m');
    const [from, to] = wrapper.findAllComponents(NextSelect);
    expect(from.props('modelValue')).toBe('09:00 AM');
    expect(from.props('groups').map(g => g.label)).toEqual(['AM', 'PM']);
    expect(from.props('groups')[0].options[0]).toEqual({
      value: '12:00 AM',
      label: '12:00 AM',
    });
    expect(to.props('modelValue')).toBe('05:30 PM');
    expect(to.props('groups')[0].options[0].value).toBe('12:30 AM');
    expect(wrapper.find('.error').exists()).toBe(false);
  });

  it('shows whole hours and minutes-only totals', () => {
    expect(
      mountDay({ ...openSlot, from: '09:00 AM', to: '10:00 AM' }).text()
    ).toContain('1h');
    expect(
      mountDay({ ...openSlot, from: '09:00 AM', to: '09:30 AM' }).text()
    ).toContain('30m');
    expect(
      mountDay({ ...openSlot, from: '09:00 AM', to: '09:00 AM' }).text()
    ).toContain('0m');
  });

  it('marks start times before and after the close time', async () => {
    const wrapper = mountDay(openSlot);
    const [from] = wrapper.findAllComponents(NextSelect);
    from.vm.$emit('update:modelValue', '08:00 AM');
    expect(lastUpdate(wrapper)).toMatchObject({
      from: '08:00 AM',
      valid: true,
    });
    from.vm.$emit('update:modelValue', '06:00 PM');
    expect(lastUpdate(wrapper)).toMatchObject({
      from: '06:00 PM',
      valid: false,
    });
  });

  it('marks close times, treating 12:00 AM as end of day', async () => {
    const wrapper = mountDay(openSlot);
    const [, to] = wrapper.findAllComponents(NextSelect);
    to.vm.$emit('update:modelValue', '12:00 AM');
    expect(lastUpdate(wrapper)).toMatchObject({ to: '12:00 AM', valid: true });
    to.vm.$emit('update:modelValue', '06:00 PM');
    expect(lastUpdate(wrapper)).toMatchObject({ to: '06:00 PM', valid: true });
    to.vm.$emit('update:modelValue', '08:00 AM');
    expect(lastUpdate(wrapper)).toMatchObject({ to: '08:00 AM', valid: false });
  });

  it('shows the validation error for an invalid slot', () => {
    const wrapper = mountDay({ ...openSlot, valid: false });
    expect(wrapper.find('.error').text()).toBe(
      'INBOX_MGMT.BUSINESS_HOURS.DAY.VALIDATION_ERROR'
    );
  });

  it('turns open all day on and off', async () => {
    const wrapper = mountDay(openSlot);
    await wrapper.find('input[name="enable-open-all-day"]').setValue(true);
    expect(lastUpdate(wrapper)).toMatchObject({
      from: '12:00 AM',
      to: '11:59 PM',
      valid: true,
      openAllDay: true,
    });

    const allDay = mountDay({
      ...openSlot,
      from: '12:00 AM',
      to: '11:59 PM',
      openAllDay: true,
    });
    expect(allDay.text()).toContain('24h');
    expect(allDay.findComponent(NextSelect).props('disabled')).toBe(true);
    await allDay.find('input[name="enable-open-all-day"]').setValue(false);
    expect(lastUpdate(allDay)).toMatchObject({
      from: '09:00 AM',
      to: '05:00 PM',
      valid: true,
      openAllDay: false,
    });
  });
});
