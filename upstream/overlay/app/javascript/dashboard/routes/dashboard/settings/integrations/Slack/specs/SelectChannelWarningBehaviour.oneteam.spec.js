/**
 * OneTeam behaviour spec for the Slack "attention required" banner.
 *
 * Covers the expired-connection and no-channel messages, fetching the
 * Slack channels (and recovering when that fails), picking a channel,
 * and saving it with success and error alerts, including the fallback
 * error text.
 */
import { mount, flushPromises } from '@vue/test-utils';
import SelectChannelWarning from '../SelectChannelWarning.vue';

const env = vi.hoisted(() => ({
  dispatch: vi.fn(),
  alert: vi.fn(),
  uiFlags: { isFetchingSlackChannels: false, isUpdatingSlack: false },
}));

vi.mock('vuex', async importOriginal => ({
  ...(await importOriginal()),
  useStore: () => ({
    dispatch: env.dispatch,
    getters: { 'integrations/getUIFlags': env.uiFlags },
  }),
}));
vi.mock('dashboard/composables', () => ({ useAlert: env.alert }));
vi.mock('shared/composables/useBranding', () => ({
  useBranding: () => ({ replaceInstallationName: text => `[${text}]` }),
}));

const Button = {
  name: 'Button',
  props: { isLoading: Boolean },
  emits: ['click'],
  template: '<button @click="$emit(\'click\')"><slot /></button>',
};

const mountWarning = props =>
  mount(SelectChannelWarning, {
    props,
    global: {
      stubs: { Button },
      directives: {
        'dompurify-html': (el, { value }) => {
          el.innerHTML = value;
        },
      },
    },
  });

describe('SelectChannelWarning behaviour', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    env.uiFlags.isFetchingSlackChannels = false;
  });

  it('explains an expired connection without channel controls', () => {
    const wrapper = mountWarning();
    expect(wrapper.text()).toContain(
      '[INTEGRATION_SETTINGS.SLACK.SELECT_CHANNEL.EXPIRED]'
    );
    expect(wrapper.findComponent(Button).exists()).toBe(false);
  });

  it('fetches channels, picks one and saves it', async () => {
    env.uiFlags.isFetchingSlackChannels = true;
    env.dispatch.mockResolvedValueOnce([
      { id: 'C1', name: 'general' },
      { id: 'C2', name: 'support' },
    ]);
    const wrapper = mountWarning({ hasConnectedAChannel: false });
    expect(wrapper.text()).toContain(
      '[INTEGRATION_SETTINGS.SLACK.SELECT_CHANNEL.DESCRIPTION]'
    );
    const fetch = wrapper.findComponent(Button);
    expect(fetch.props('isLoading')).toBe(true);
    await fetch.trigger('click');
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith(
      'integrations/listAllSlackChannels'
    );
    const options = wrapper.findAll('option').map(o => o.text());
    expect(options.slice(1)).toEqual(['#general', '#support']);

    await wrapper.find('select').setValue('C2');
    env.dispatch.mockResolvedValueOnce();
    await wrapper.findComponent(Button).trigger('click');
    await flushPromises();
    expect(env.dispatch).toHaveBeenLastCalledWith('integrations/updateSlack', {
      referenceId: 'C2',
    });
    expect(env.alert).toHaveBeenLastCalledWith(
      'INTEGRATION_SETTINGS.SLACK.UPDATE_SUCCESS'
    );

    env.dispatch.mockRejectedValueOnce(new Error('Channel archived'));
    await wrapper.findComponent(Button).trigger('click');
    await flushPromises();
    expect(env.alert).toHaveBeenLastCalledWith('Channel archived');

    env.dispatch.mockRejectedValueOnce(new Error(''));
    await wrapper.findComponent(Button).trigger('click');
    await flushPromises();
    expect(env.alert).toHaveBeenLastCalledWith(
      'INTEGRATION_SETTINGS.SLACK.UPDATE_ERROR'
    );
  });

  it('keeps the fetch button when listing channels fails', async () => {
    env.dispatch.mockRejectedValueOnce(new Error('nope'));
    const wrapper = mountWarning({ hasConnectedAChannel: false });
    await wrapper.findComponent(Button).trigger('click');
    await flushPromises();
    expect(wrapper.find('select').exists()).toBe(false);
    expect(wrapper.findComponent(Button).text()).toContain(
      'INTEGRATION_SETTINGS.SLACK.SELECT_CHANNEL.BUTTON_TEXT'
    );
  });
});
