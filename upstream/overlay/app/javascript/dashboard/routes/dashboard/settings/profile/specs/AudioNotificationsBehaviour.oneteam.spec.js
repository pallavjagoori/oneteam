/**
 * OneTeam behaviour spec for the profile audio notification settings.
 *
 * Covers reading the saved tone, alert type and conditions (with the
 * default tone), loading notification settings, and saving the tone, the
 * alert type and each condition (ignoring unknown ones) with a success
 * alert and refreshed audio alerts.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import AudioNotifications from '../AudioNotifications.vue';

const env = vi.hoisted(() => ({
  uiSettings: null,
  updates: [],
  dispatch: vi.fn(),
  alerts: [],
  initialized: [],
}));

vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({
    uiSettings: env.uiSettings,
    updateUISettings: value => env.updates.push(value),
  }),
}));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
  useStoreGetters: () => ({ getCurrentUser: ref({ id: 1 }) }),
}));
vi.mock('dashboard/composables', () => ({
  useAlert: message => env.alerts.push(message),
}));
vi.mock('dashboard/helper/scriptHelpers', () => ({
  initializeAudioAlerts: user => env.initialized.push(user),
}));

const Tone = {
  name: 'AudioAlertTone',
  props: ['value'],
  emits: ['change'],
  template: '<div />',
};
const Event = {
  name: 'AudioAlertEvent',
  props: ['value'],
  emits: ['update'],
  template: '<div />',
};
const Condition = {
  name: 'AudioAlertCondition',
  props: ['items'],
  emits: ['change'],
  template: '<div />',
};

const mountSettings = settings => {
  env.uiSettings = ref(settings);
  return mount(AudioNotifications, {
    global: {
      stubs: {
        AudioAlertTone: Tone,
        AudioAlertEvent: Event,
        AudioAlertCondition: Condition,
      },
    },
  });
};

describe('AudioNotifications behaviour', () => {
  beforeEach(() => {
    env.updates = [];
    env.alerts = [];
    env.initialized = [];
    env.dispatch = vi.fn();
  });

  it('reads saved settings', () => {
    const wrapper = mountSettings({
      enable_audio_alerts: 'mine',
      always_play_audio_alert: false,
      alert_if_unread_assigned_conversation_exist: true,
      notification_tone: 'bell',
    });
    expect(env.dispatch).toHaveBeenCalledWith('userNotificationSettings/get');
    expect(wrapper.findComponent(Tone).props('value')).toBe('bell');
    expect(wrapper.findComponent(Event).props('value')).toBe('mine');
    expect(
      wrapper
        .findComponent(Condition)
        .props('items')
        .map(item => item.model)
    ).toEqual([true, true]);
    expect(mountSettings({}).findComponent(Tone).props('value')).toBe('ding');
  });

  it('saves each change', async () => {
    const wrapper = mountSettings({});
    await wrapper.findComponent(Tone).vm.$emit('change', 'chime');
    await wrapper.findComponent(Event).vm.$emit('update', 'all');
    const condition = wrapper.findComponent(Condition);
    await condition.vm.$emit('change', 'tab_is_inactive', true);
    await condition.vm.$emit('change', 'conversations_are_read', false);
    await condition.vm.$emit('change', 'unknown', true);
    expect(env.updates).toEqual([
      { notification_tone: 'chime' },
      { enable_audio_alerts: 'all' },
      { always_play_audio_alert: false },
      { alert_if_unread_assigned_conversation_exist: false },
    ]);
    expect(wrapper.findComponent(Event).props('value')).toBe('all');
    expect(env.alerts).toHaveLength(4);
    expect(env.initialized).toEqual([
      { id: 1 },
      { id: 1 },
      { id: 1 },
      { id: 1 },
    ]);
  });
});
