/**
 * OneTeam behaviour spec for the audio alert event picker in profile
 * settings.
 *
 * Covers reading the saved value (including the legacy "none", "mine"
 * and "all" values, and ignoring unknown or repeated parts), the
 * description for each combination, and checking or unchecking events
 * (saved sorted, or "none" when nothing is left).
 */
import { mount } from '@vue/test-utils';
import AudioAlertEvent from '../AudioAlertEvent.vue';

const CheckBox = {
  name: 'CheckBox',
  props: { id: String, isChecked: Boolean },
  emits: ['update'],
  template: '<input type="checkbox" :id="id" :checked="isChecked" />',
};

const mountPicker = value =>
  mount(AudioAlertEvent, {
    props: { label: 'Alert me for', value },
    global: { stubs: { CheckBox } },
  });

const checked = wrapper =>
  wrapper
    .findAllComponents(CheckBox)
    .filter(c => c.props('isChecked'))
    .map(c => c.props('id'));
const description = wrapper => wrapper.find('.mt-2.text-sm').text();
const toggle = (wrapper, index, isChecked) =>
  wrapper
    .findAllComponents(CheckBox)
    [index].vm.$emit('update', null, isChecked);

const BASE = 'PROFILE_SETTINGS.FORM.AUDIO_NOTIFICATIONS_SECTION';

describe('AudioAlertEvent behaviour', () => {
  it('lists the events with their labels', () => {
    const wrapper = mountPicker('');
    expect(wrapper.find('label').text()).toBe('Alert me for');
    expect(wrapper.findAll('label[for]').map(l => l.text())).toEqual([
      `${BASE}.ALERT_TYPES.ASSIGNED`,
      `${BASE}.ALERT_TYPES.UNASSIGNED`,
      `${BASE}.ALERT_TYPES.NOTME`,
    ]);
    expect(checked(wrapper)).toEqual([]);
    expect(description(wrapper)).toBe(`${BASE}.ALERT_COMBINATIONS.NONE`);
  });

  it.each([
    ['none', [], 'NONE'],
    ['mine', ['checkbox-assigned'], 'ASSIGNED'],
    [
      'all',
      ['checkbox-assigned', 'checkbox-unassigned', 'checkbox-notme'],
      'ASSIGNED+NOTME+UNASSIGNED',
    ],
    [
      'assigned+bogus+assigned+unassigned',
      ['checkbox-assigned', 'checkbox-unassigned'],
      'ASSIGNED+UNASSIGNED',
    ],
  ])('reads %s', (value, ids, combination) => {
    const wrapper = mountPicker(value);
    expect(checked(wrapper)).toEqual(ids);
    expect(description(wrapper)).toBe(
      `${BASE}.ALERT_COMBINATIONS.${combination}`
    );
  });

  it('saves checked events sorted, or none', async () => {
    const adding = mountPicker('unassigned');
    await toggle(adding, 0, true);
    expect(adding.emitted('update')).toEqual([['assigned+unassigned']]);

    const removing = mountPicker('unassigned');
    await toggle(removing, 1, false);
    expect(removing.emitted('update')).toEqual([['none']]);
  });

  it('keeps an earlier check until the parent updates the value', async () => {
    // Checking pushes onto the computed getter's cached array, so a second
    // toggle before the parent passes the new value still sees it.
    const wrapper = mountPicker('unassigned');
    await toggle(wrapper, 0, true);
    await toggle(wrapper, 1, false);
    expect(wrapper.emitted('update')).toEqual([
      ['assigned+unassigned'],
      ['assigned'],
    ]);
  });
});
