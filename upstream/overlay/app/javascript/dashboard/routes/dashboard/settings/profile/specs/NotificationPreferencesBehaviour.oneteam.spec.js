/**
 * OneTeam behaviour spec for the profile notification preferences.
 *
 * Covers which notification types are listed (SLA and missed-call rows
 * depend on account features), ticking email and push flags in the
 * desktop and mobile layouts, and the browser push toggle (reading,
 * enabling and disabling the push subscription).
 */
import { reactive } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import NotificationPreferences from '../NotificationPreferences.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({
  useAlert: (...args) => env.alert(...args),
}));
vi.mock('dashboard/helper/pushHelper.js', () => ({
  hasPushPermissions: () => env.hasPush,
  requestPushPermissions: (...args) => env.requestPush(...args),
  verifyServiceWorkerExistence: callback => {
    env.swDone = callback(env.registration);
  },
}));

const CheckBox = {
  name: 'CheckBox',
  props: ['value', 'isChecked'],
  emits: ['update'],
  template: '<input type="checkbox" :value="value" :checked="isChecked" />',
};
const ToggleSwitch = {
  name: 'ToggleSwitch',
  props: ['modelValue'],
  emits: ['update:modelValue', 'change'],
  template: '<button class="toggle" :data-on="modelValue" />',
};

const registration = subscription => ({
  pushManager: { getSubscription: vi.fn(() => subscription) },
});

const mountPage = async (features = []) => {
  env.getters = reactive({
    getCurrentAccountId: 1,
    'userNotificationSettings/getSelectedEmailFlags': [],
    'userNotificationSettings/getSelectedPushFlags': [],
    'accounts/isFeatureEnabledonAccount': (id, flag) => features.includes(flag),
  });
  env.store = { getters: env.getters, dispatch: vi.fn() };
  const wrapper = mount(NotificationPreferences, {
    global: {
      stubs: {
        CheckBox,
        ToggleSwitch,
        TableHeaderCell: { template: '<div><slot /></div>' },
        FluentIcon: true,
      },
      mocks: { $store: env.store },
    },
  });
  await flushPromises();
  return wrapper;
};

const values = wrapper =>
  wrapper.findAllComponents(CheckBox).map(c => c.props('value'));
const box = (wrapper, value, index = 0) =>
  wrapper.findAllComponents(CheckBox).filter(c => c.props('value') === value)[
    index
  ];
const toggle = wrapper => wrapper.findComponent(ToggleSwitch);

describe('NotificationPreferences behaviour', () => {
  beforeEach(() => {
    env.alert = vi.fn();
    env.hasPush = false;
    env.requestPush = vi.fn();
    env.registration = registration(Promise.resolve(null));
  });

  it('loads settings and hides SLA and missed-call rows without the features', async () => {
    const wrapper = await mountPage();
    expect(env.store.dispatch).toHaveBeenCalledWith(
      'userNotificationSettings/get'
    );
    expect(values(wrapper)).toContain('email_conversation_creation');
    expect(values(wrapper).some(v => v.includes('sla_'))).toBe(false);
    expect(values(wrapper).some(v => v.includes('voice_call_missed'))).toBe(
      false
    );
    expect(wrapper.vm.hasPushAPISupport).toBe('Notification' in window);
  });

  it('lists SLA rows with SLA, and missed calls only with both voice features', async () => {
    let wrapper = await mountPage(['sla', 'channel_voice']);
    expect(values(wrapper)).toContain('push_sla_missed_resolution');
    expect(values(wrapper).some(v => v.includes('voice_call_missed'))).toBe(
      false
    );
    wrapper = await mountPage(['channel_voice', 'mobile_voice_push']);
    expect(values(wrapper)).toContain('email_voice_call_missed');
  });

  it('shows the saved flags as ticked', async () => {
    const wrapper = await mountPage();
    env.getters['userNotificationSettings/getSelectedEmailFlags'] = [
      'email_conversation_creation',
    ];
    env.getters['userNotificationSettings/getSelectedPushFlags'] = [
      'push_conversation_mention',
    ];
    await flushPromises();
    expect(box(wrapper, 'email_conversation_creation').props('isChecked')).toBe(
      true
    );
    expect(box(wrapper, 'push_conversation_mention').props('isChecked')).toBe(
      true
    );
    expect(box(wrapper, 'push_conversation_creation').props('isChecked')).toBe(
      false
    );
  });

  it('toggles flags from both layouts and saves each change', async () => {
    const wrapper = await mountPage();
    // Desktop row, email column.
    box(wrapper, 'email_conversation_creation').vm.$emit(
      'update',
      'email_conversation_creation'
    );
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenLastCalledWith(
      'userNotificationSettings/update',
      {
        selectedEmailFlags: ['email_conversation_creation'],
        selectedPushFlags: [],
      }
    );
    expect(env.alert).toHaveBeenCalledWith(
      'PROFILE_SETTINGS.FORM.API.UPDATE_SUCCESS'
    );

    // Desktop row, push column.
    box(wrapper, 'push_conversation_creation').vm.$emit(
      'update',
      'push_conversation_creation'
    );
    // Mobile email list unticks it again.
    box(wrapper, 'email_conversation_creation', 1).vm.$emit(
      'update',
      'email_conversation_creation'
    );
    // Mobile push list.
    box(wrapper, 'push_conversation_mention', 1).vm.$emit(
      'update',
      'push_conversation_mention'
    );
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenLastCalledWith(
      'userNotificationSettings/update',
      {
        selectedEmailFlags: [],
        selectedPushFlags: [
          'push_conversation_creation',
          'push_conversation_mention',
        ],
      }
    );
  });

  it('reads the existing push subscription when permission was granted', async () => {
    env.hasPush = true;
    env.registration = registration(Promise.resolve({ endpoint: 'x' }));
    let wrapper = await mountPage();
    expect(toggle(wrapper).props('modelValue')).toBe(true);

    env.registration = registration(Promise.resolve(null));
    wrapper = await mountPage();
    expect(toggle(wrapper).props('modelValue')).toBe(false);

    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = new Error('no sw');
    env.registration = registration(Promise.reject(error));
    await mountPage();
    expect(log).toHaveBeenCalledWith(error);
    log.mockRestore();
  });

  it('requests push permission when switched on', async () => {
    const wrapper = await mountPage();
    toggle(wrapper).vm.$emit('change', true);
    expect(env.requestPush).toHaveBeenCalled();
    env.requestPush.mock.calls[0][0].onSuccess();
    await flushPromises();
    expect(toggle(wrapper).props('modelValue')).toBe(true);
    toggle(wrapper).vm.$emit('update:modelValue', false);
    await flushPromises();
    expect(toggle(wrapper).props('modelValue')).toBe(false);
  });

  it('unsubscribes when switched off', async () => {
    const unsubscribe = vi.fn(() => Promise.resolve(true));
    const wrapper = await mountPage();
    wrapper.vm.hasEnabledPushPermissions = true;
    env.registration = registration(Promise.resolve({ unsubscribe }));
    toggle(wrapper).vm.$emit('change', false);
    await env.swDone;
    await flushPromises();
    expect(unsubscribe).toHaveBeenCalled();
    expect(toggle(wrapper).props('modelValue')).toBe(false);

    // Without a subscription, or when the lookup fails, it still turns off.
    wrapper.vm.hasEnabledPushPermissions = true;
    env.registration = registration(Promise.resolve(null));
    toggle(wrapper).vm.$emit('change', false);
    await env.swDone;
    await flushPromises();
    expect(toggle(wrapper).props('modelValue')).toBe(false);

    wrapper.vm.hasEnabledPushPermissions = true;
    env.registration = registration(Promise.reject(new Error('x')));
    toggle(wrapper).vm.$emit('change', false);
    await env.swDone;
    await flushPromises();
    expect(toggle(wrapper).props('modelValue')).toBe(false);
  });
});
