/**
 * OneTeam behaviour spec for an inbox's agent bot settings.
 *
 * Covers fetching bots and the inbox's bot on mount (inbox id from the
 * prop or the route), the loading state, preselecting the active bot,
 * listing bots as options, saving a bot or clearing it, disconnecting
 * (disabled with no bot), and the success and failure alerts with and
 * without a server message.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import BotConfiguration from '../BotConfiguration.vue';

const env = vi.hoisted(() => ({ alert: null }));

vi.mock('dashboard/composables', () => ({
  useAlert: (...args) => env.alert(...args),
}));

const SelectInput = {
  name: 'SelectInput',
  props: ['modelValue', 'options'],
  emits: ['update:modelValue'],
  template: '<select class="bots" :data-value="modelValue" />',
};
const NextButton = {
  name: 'NextButton',
  props: { type: String, disabled: Boolean, isLoading: Boolean },
  emits: ['click'],
  template: '<button :type="type" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
};
const SettingsFieldSection = {
  name: 'SettingsFieldSection',
  template: '<section><slot /><slot name="extra" /></section>',
};

const makeStore = actions => {
  const store = createStore({
    modules: {
      agentBots: {
        namespaced: true,
        state: () => ({ active: {}, flags: { isFetching: false } }),
        getters: {
          getBots: () => [
            { id: 1, name: 'Triage' },
            { id: 2, name: 'FAQ' },
          ],
          getUIFlags: state => state.flags,
          getActiveAgentBot: state => inboxId => state.active[inboxId] || {},
        },
        mutations: {
          setActive: (state, { inboxId, bot }) => {
            state.active = { ...state.active, [inboxId]: bot };
          },
          setFlags: (state, flags) => {
            state.flags = flags;
          },
        },
        actions,
      },
    },
  });
  return store;
};

const mountConfig = (props, actions) => {
  const store = makeStore(actions);
  const wrapper = mount(BotConfiguration, {
    props,
    global: {
      plugins: [store],
      stubs: { SelectInput, NextButton, SettingsFieldSection, LoadingState: { template: '<p class="loading" />' } },
      mocks: { $t: key => key, $route: { params: { inboxId: '9' } } },
    },
  });
  return { wrapper, store };
};

describe('Bot configuration behaviour', () => {
  let actions;

  beforeEach(() => {
    env.alert = vi.fn();
    actions = {
      get: vi.fn(),
      fetchAgentBotInbox: vi.fn(),
      setAgentBotInbox: vi.fn(),
      disconnectBot: vi.fn(),
    };
  });

  it('loads bots for the inbox and preselects the active one', async () => {
    const { wrapper, store } = mountConfig({ inbox: { id: 4 } }, actions);
    expect(actions.get).toHaveBeenCalled();
    expect(actions.fetchAgentBotInbox.mock.calls[0][1]).toBe(4);
    expect(wrapper.findComponent(SelectInput).props('options')).toEqual([
      { value: 1, label: 'Triage' },
      { value: 2, label: 'FAQ' },
    ]);
    expect(wrapper.find('button[type="button"]').attributes('disabled')).toBeDefined();
    store.commit('agentBots/setActive', { inboxId: 4, bot: { id: 2 } });
    await flushPromises();
    expect(wrapper.find('.bots').attributes('data-value')).toBe('2');
    expect(wrapper.find('button[type="button"]').attributes('disabled')).toBeUndefined();

    store.commit('agentBots/setFlags', { isFetchingAgentBot: true });
    await flushPromises();
    expect(wrapper.find('.loading').exists()).toBe(true);
  });

  it('falls back to the inbox id from the route', () => {
    mountConfig({}, actions);
    expect(actions.fetchAgentBotInbox.mock.calls[0][1]).toBe('9');
  });

  it('saves the chosen bot or clears it', async () => {
    const { wrapper } = mountConfig({ inbox: { id: 4 } }, actions);
    wrapper.findComponent(SelectInput).vm.$emit('update:modelValue', 1);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(actions.setAgentBotInbox.mock.calls[0][1]).toEqual({ inboxId: 4, botId: 1 });
    expect(env.alert).toHaveBeenCalledWith('AGENT_BOTS.BOT_CONFIGURATION.SUCCESS_MESSAGE');

    wrapper.findComponent(SelectInput).vm.$emit('update:modelValue', '');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(actions.setAgentBotInbox.mock.calls[1][1]).toEqual({ inboxId: 4, botId: undefined });
  });

  it('alerts when saving fails', async () => {
    actions.setAgentBotInbox = vi
      .fn()
      .mockRejectedValueOnce(new Error('Bot offline'))
      .mockRejectedValueOnce({});
    const { wrapper } = mountConfig({ inbox: { id: 4 } }, actions);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(env.alert.mock.calls).toEqual([
      ['Bot offline'],
      ['AGENT_BOTS.BOT_CONFIGURATION.ERROR_MESSAGE'],
    ]);
  });

  it('disconnects the bot and reports failures', async () => {
    actions.disconnectBot = vi
      .fn()
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error('Locked'))
      .mockRejectedValueOnce(null);
    const { wrapper } = mountConfig({ inbox: { id: 4 } }, actions);
    wrapper.findComponent(SelectInput).vm.$emit('update:modelValue', 2);
    await flushPromises();
    const disconnect = wrapper.find('button[type="button"]');
    await disconnect.trigger('click');
    await flushPromises();
    await disconnect.trigger('click');
    await flushPromises();
    await disconnect.trigger('click');
    await flushPromises();
    expect(actions.disconnectBot.mock.calls[0][1]).toEqual({ inboxId: 4 });
    expect(env.alert.mock.calls).toEqual([
      ['AGENT_BOTS.BOT_CONFIGURATION.DISCONNECTED_SUCCESS_MESSAGE'],
      ['Locked'],
      ['AGENT_BOTS.BOT_CONFIGURATION.DISCONNECTED_ERROR_MESSAGE'],
    ]);
  });
});
