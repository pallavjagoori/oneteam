/**
 * OneTeam behaviour spec for the Slack message mode picker.
 *
 * Covers the two-way and alert cards with branded descriptions, marking
 * the active mode, saving a choice, and the error alerts.
 */
import { flushPromises, mount } from '@vue/test-utils';
import SlackMessageMode from '../SlackMessageMode.vue';

const env = vi.hoisted(() => ({ dispatch: vi.fn(), alerts: [] }));

vi.mock('vuex', async importOriginal => ({
  ...(await importOriginal()),
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('dashboard/composables', () => ({
  useAlert: message => env.alerts.push(message),
}));
vi.mock('shared/composables/useBranding', () => ({
  useBranding: () => ({ replaceInstallationName: text => `[${text}]` }),
}));

const RadioCard = {
  name: 'RadioCard',
  props: { id: String, description: String, isActive: Boolean },
  emits: ['select'],
  template: '<div />',
};

/**
 * Mounts the picker.
 *
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountPicker = () =>
  mount(SlackMessageMode, {
    props: { messageMode: 'alert' },
    global: { stubs: { RadioCard } },
  });

describe('SlackMessageMode behaviour', () => {
  beforeEach(() => {
    env.alerts = [];
    env.dispatch = vi.fn().mockResolvedValue();
  });

  it('marks the active mode and saves a choice', async () => {
    const wrapper = mountPicker();
    const [twoWay, alert] = wrapper.findAllComponents(RadioCard);
    expect(twoWay.props()).toMatchObject({
      id: 'two_way',
      isActive: false,
      description:
        '[INTEGRATION_SETTINGS.SLACK.MESSAGE_MODE.OPTIONS.TWO_WAY.DESCRIPTION]',
    });
    expect(alert.props('isActive')).toBe(true);
    twoWay.vm.$emit('select', 'two_way');
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('integrations/updateSlack', {
      messageMode: 'two_way',
    });
    expect(env.alerts).toEqual([
      'INTEGRATION_SETTINGS.SLACK.MESSAGE_MODE.UPDATE_SUCCESS',
    ]);
  });

  it('alerts the failure message or a fallback', async () => {
    const wrapper = mountPicker();
    const card = wrapper.findComponent(RadioCard);
    env.dispatch = vi.fn().mockRejectedValueOnce(new Error('Nope'));
    card.vm.$emit('select', 'alert');
    await flushPromises();
    env.dispatch = vi.fn().mockRejectedValueOnce({});
    card.vm.$emit('select', 'alert');
    await flushPromises();
    expect(env.alerts).toEqual([
      'Nope',
      'INTEGRATION_SETTINGS.SLACK.UPDATE_ERROR',
    ]);
  });
});
