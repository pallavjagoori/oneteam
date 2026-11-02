/**
 * OneTeam behaviour spec for the Slack integration settings page.
 *
 * Covers loading the integration (and finishing an OAuth connect from the
 * `code` query param, then clearing it from the URL), the loading state,
 * the connect/disconnect action, and the hook area: the channel warning
 * before a channel is picked, the message mode once enabled, and the
 * selected channel name with its fallbacks.
 */
import { flushPromises, mount } from '@vue/test-utils';
import Slack from '../Slack.vue';

const env = vi.hoisted(() => ({ getters: {}, dispatch: null, replace: null }));

vi.mock('vuex', async importOriginal => ({
  ...(await importOriginal()),
  useStore: () => ({ getters: env.getters, dispatch: env.dispatch }),
}));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => ({ replace: env.replace }),
  useRoute: () => ({ path: '/settings/integrations/slack' }),
}));

const SettingsLayout = {
  name: 'SettingsLayout',
  props: ['isLoading'],
  template: '<div class="layout" :data-loading="isLoading"><slot name="header" /><slot name="body" /></div>',
};
const Integration = {
  name: 'Integration',
  props: ['integrationId', 'integrationEnabled', 'integrationAction'],
  template: '<div class="integration" :data-action="integrationAction" />',
};
const SelectChannelWarning = {
  name: 'SelectChannelWarning',
  props: ['hasConnectedAChannel'],
  template: '<div class="warning" :data-connected="hasConnectedAChannel" />',
};
const SlackMessageMode = {
  name: 'SlackMessageMode',
  props: ['messageMode'],
  template: '<div class="mode" :data-mode="messageMode" />',
};
const SlackIntegrationHelpText = {
  name: 'SlackIntegrationHelpText',
  props: ['selectedChannelName', 'messageMode'],
  template: '<div class="help" :data-channel="selectedChannelName" :data-mode="messageMode" />',
};

const setIntegration = (integration, flags = {}) => {
  env.getters = {
    'integrations/getIntegration': name => (name === 'slack' ? integration : null),
    'integrations/getUIFlags': { isCreatingSlack: false, ...flags },
  };
};
const mountSlack = props =>
  mount(Slack, {
    props,
    global: {
      stubs: {
        SettingsLayout,
        Integration,
        SelectChannelWarning,
        SlackMessageMode,
        SlackIntegrationHelpText,
        BaseSettingsHeader: true,
      },
      mocks: { $t: key => key },
    },
  });

describe('Slack integration settings behaviour', () => {
  beforeEach(() => {
    env.dispatch = vi.fn(() => Promise.resolve());
    env.replace = vi.fn();
  });

  it('loads the integration and offers to connect', async () => {
    setIntegration({ id: 'slack', enabled: false, action: 'https://slack.com/oauth' });
    const wrapper = mountSlack();
    expect(wrapper.find('.layout').attributes('data-loading')).toBe('true');
    await flushPromises();
    expect(env.dispatch.mock.calls).toEqual([['integrations/get', 'slack']]);
    expect(env.replace).not.toHaveBeenCalled();
    expect(wrapper.find('.layout').attributes('data-loading')).toBe('false');
    expect(wrapper.find('.integration').attributes('data-action')).toBe('https://slack.com/oauth');
    expect(wrapper.find('.help').exists()).toBe(false);
  });

  it('finishes an OAuth connect and clears the code', async () => {
    setIntegration({ enabled: true, hooks: [{ status: false }] }, { isCreatingSlack: true });
    const wrapper = mountSlack({ code: 'abc' });
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('integrations/connectSlack', 'abc');
    expect(env.replace).toHaveBeenCalledWith('/settings/integrations/slack');
    expect(wrapper.find('.layout').attributes('data-loading')).toBe('true');
    expect(wrapper.find('.integration').attributes('data-action')).toBe('disconnect');
    expect(wrapper.find('.warning').attributes('data-connected')).toBe('false');
    expect(wrapper.find('.mode').exists()).toBe(false);
    expect(wrapper.find('.help').attributes('data-channel')).toBe(
      'INTEGRATION_SETTINGS.SLACK.HELP_TEXT.SELECTED'
    );
    expect(wrapper.find('.help').attributes('data-mode')).toBe('two_way');
  });

  it('shows the message mode and channel once a hook is enabled', async () => {
    setIntegration({
      enabled: true,
      hooks: [
        {
          status: true,
          reference_id: 'C1',
          settings: { message_mode: 'one_way', channel_name: 'support' },
        },
      ],
    });
    const wrapper = mountSlack();
    await flushPromises();
    expect(wrapper.find('.warning').exists()).toBe(false);
    expect(wrapper.find('.mode').attributes('data-mode')).toBe('one_way');
    expect(wrapper.find('.help').attributes('data-channel')).toBe('support');
  });

  it('falls back to the default channel name and mode', async () => {
    setIntegration({ enabled: true, hooks: [{ status: true, reference_id: 'C1' }] });
    const wrapper = mountSlack();
    await flushPromises();
    expect(wrapper.find('.help').attributes('data-channel')).toBe('customer-conversations');
    expect(wrapper.find('.mode').attributes('data-mode')).toBe('two_way');
  });
});
