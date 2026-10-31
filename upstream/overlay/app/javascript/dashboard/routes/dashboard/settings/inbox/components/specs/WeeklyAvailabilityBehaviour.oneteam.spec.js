/**
 * OneTeam behaviour spec for an inbox's business hours settings.
 *
 * Covers loading defaults from the inbox (saved hours, timezone, out of
 * office message, and fallbacks when they are missing), reloading when
 * the inbox changes, the rich editor versus plain textarea per channel,
 * picking a timezone, updating a day from its row, blocking save while
 * a day is invalid, and saving with success and error alerts.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import WeeklyAvailability from '../WeeklyAvailability.vue';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const Toggle = {
  name: 'SettingsToggleSection',
  props: ['modelValue', 'header', 'description'],
  emits: ['update:modelValue'],
  template: '<section class="toggle"><slot name="editor" /></section>',
};
const Field = {
  name: 'SettingsFieldSection',
  props: ['label'],
  template: '<div class="field"><slot /></div>',
};
const Editor = {
  name: 'WootMessageEditor',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<div class="editor" />',
};
const ComboBox = {
  name: 'ComboBox',
  props: ['modelValue', 'options'],
  emits: ['update:modelValue'],
  template: '<div class="combo" />',
};
const Day = {
  name: 'BusinessDay',
  props: ['dayName', 'timeSlot'],
  emits: ['update'],
  template: '<tr class="day" />',
};
const NextButton = {
  name: 'NextButton',
  props: ['label', 'isLoading', 'disabled'],
  template: '<button type="submit" :disabled="disabled">{{ label }}</button>',
};

const savedHours = [
  {
    day_of_week: 0,
    closed_all_day: true,
    open_all_day: false,
  },
  {
    day_of_week: 1,
    closed_all_day: false,
    open_hour: 9,
    open_minutes: 0,
    close_hour: 17,
    close_minutes: 0,
    open_all_day: false,
  },
];

const mountForm = async inbox => {
  const dispatch = vi.fn().mockResolvedValue();
  const wrapper = mount(WeeklyAvailability, {
    props: { inbox },
    global: {
      stubs: {
        SettingsToggleSection: Toggle,
        SettingsFieldSection: Field,
        WootMessageEditor: Editor,
        ComboBox,
        BusinessDay: Day,
        NextButton,
      },
      mocks: {
        $t: key => key,
        $store: {
          getters: { 'inboxes/getUIFlags': { isUpdating: false } },
          dispatch,
        },
      },
    },
  });
  await flushPromises();
  return { wrapper, dispatch };
};

const enabledInbox = {
  id: 5,
  channel_type: 'Channel::WebWidget',
  working_hours_enabled: true,
  out_of_office_message: 'We are away',
  working_hours: savedHours,
  timezone: 'Asia/Kolkata',
};

describe('WeeklyAvailability behaviour', () => {
  it('falls back to defaults for a fresh inbox', async () => {
    const { wrapper } = await mountForm({ id: 1 });
    expect(wrapper.vm.isBusinessHoursEnabled).toBe(false);
    expect(wrapper.vm.unavailableMessage).toBe('');
    expect(wrapper.vm.timeZone.value).toBe('America/Los_Angeles');
    expect(wrapper.vm.timeSlots).toHaveLength(7);
    expect(wrapper.findComponent(Toggle).props('modelValue')).toBe(false);
    expect(wrapper.find('.editor').exists()).toBe(false);
    expect(wrapper.findAllComponents(Day)).toHaveLength(0);
    expect(wrapper.findComponent(NextButton).props('disabled')).toBe(false);
  });

  it('falls back to the default timezone for an unknown one', async () => {
    const { wrapper } = await mountForm({
      ...enabledInbox,
      timezone: 'Mars/Base',
    });
    expect(wrapper.vm.timeZone.value).toBe('America/Los_Angeles');
  });

  it('loads saved hours, message and timezone', async () => {
    const { wrapper } = await mountForm(enabledInbox);
    expect(wrapper.findComponent(Editor).props('modelValue')).toBe(
      'We are away'
    );
    expect(wrapper.findComponent(ComboBox).props('modelValue')).toBe(
      'Asia/Kolkata'
    );
    const days = wrapper.findAllComponents(Day);
    expect(days.map(d => d.props('dayName'))).toEqual(['Sunday', 'Monday']);
    expect(days[1].props('timeSlot')).toMatchObject({
      from: '09:00 AM',
      to: '05:00 PM',
      valid: true,
    });
  });

  it('reloads when the inbox changes', async () => {
    const { wrapper } = await mountForm({ id: 1 });
    await wrapper.setProps({ inbox: enabledInbox });
    expect(wrapper.vm.isBusinessHoursEnabled).toBe(true);
    expect(wrapper.vm.unavailableMessage).toBe('We are away');
  });

  it.each([
    'Channel::TwilioSms',
    'Channel::TwitterProfile',
    'Channel::FacebookPage',
  ])('uses a plain textarea for %s', async channelType => {
    const { wrapper } = await mountForm({
      ...enabledInbox,
      channel_type: channelType,
    });
    expect(wrapper.find('.editor').exists()).toBe(false);
    await wrapper.find('textarea').setValue('Closed');
    expect(wrapper.vm.unavailableMessage).toBe('Closed');
  });

  it('toggles business hours and edits the message', async () => {
    const { wrapper } = await mountForm({ id: 1 });
    wrapper.findComponent(Toggle).vm.$emit('update:modelValue', true);
    await flushPromises();
    wrapper.findComponent(Editor).vm.$emit('update:modelValue', 'Later');
    expect(wrapper.vm.unavailableMessage).toBe('Later');
  });

  it('picks a known timezone and ignores unknown ones', async () => {
    const { wrapper } = await mountForm(enabledInbox);
    const combo = wrapper.findComponent(ComboBox);
    expect(combo.props('options').length).toBeGreaterThan(100);
    combo.vm.$emit('update:modelValue', 'Pacific/Midway');
    expect(wrapper.vm.timeZone.label).toBe('Midway Island (GMT-11:00)');
    combo.vm.$emit('update:modelValue', 'Mars/Base');
    expect(wrapper.vm.timeZone.value).toBe('Pacific/Midway');
  });

  it('updates a day from its row and blocks saving while invalid', async () => {
    const { wrapper } = await mountForm(enabledInbox);
    const monday = wrapper.findAllComponents(Day)[1];
    monday.vm.$emit('update', {
      day: 1,
      from: '06:00 PM',
      to: '05:00 PM',
      valid: false,
    });
    await flushPromises();
    expect(wrapper.vm.timeSlots[1].from).toBe('06:00 PM');
    expect(wrapper.vm.timeSlots[0].day).toBe(0);
    expect(wrapper.findComponent(NextButton).props('disabled')).toBe(true);
  });

  it('saves the hours and confirms', async () => {
    const { wrapper, dispatch } = await mountForm(enabledInbox);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      'inboxes/updateInbox',
      expect.objectContaining({
        id: 5,
        formData: false,
        working_hours_enabled: true,
        out_of_office_message: 'We are away',
        timezone: 'Asia/Kolkata',
        channel: {},
      })
    );
    expect(dispatch.mock.calls[0][1].working_hours[1]).toMatchObject({
      day_of_week: 1,
      open_hour: 9,
      close_hour: 17,
    });
    expect(useAlert).toHaveBeenCalledWith(
      'INBOX_MGMT.EDIT.API.SUCCESS_MESSAGE'
    );
  });

  it('shows the error message or a fallback when saving fails', async () => {
    const { wrapper, dispatch } = await mountForm(enabledInbox);
    dispatch.mockRejectedValueOnce(new Error('Bad hours'));
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('Bad hours');

    dispatch.mockRejectedValueOnce(new Error(''));
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('INBOX_MGMT.EDIT.API.ERROR_MESSAGE');
  });
});
