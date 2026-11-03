/**
 * OneTeam behaviour spec for the Captain assistant playground.
 *
 * Complements Chatwoot's own spec with the setup panel on wide and narrow
 * screens (toggle, close, side panel and reset), agent names in the sent
 * history, response content fallbacks, sending while the session loads or
 * is invalid, IME composition, API error messages, stale request errors,
 * disconnects without a pending request, and switching assistants.
 */
import { computed, ref } from 'vue';
import { flushPromises, shallowMount } from '@vue/test-utils';
import AssistantPlayground from '../AssistantPlayground.vue';

const env = vi.hoisted(() => ({
  playground: vi.fn(),
  reset: vi.fn(),
  handlers: {},
  narrow: null,
  initializing: null,
  valid: null,
}));

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  useBreakpoints: () => ({ smaller: () => env.narrow }),
}));
vi.mock('dashboard/api/captain/assistant', () => ({
  default: { playground: (...args) => env.playground(...args) },
}));
vi.mock('shared/helpers/mitt', () => ({
  emitter: {
    on: (event, handler) => {
      env.handlers[event] = handler;
    },
    off: () => {},
  },
}));
vi.mock('../usePlaygroundSession', () => ({
  usePlaygroundSession: () => ({
    isInitializing: env.initializing,
    loadError: ref(''),
    isValid: env.valid,
    playgroundConfig: computed(() => ({})),
    configurationSummary: () => ({}),
    initialize: () => {},
    reset: env.reset,
  }),
}));

const Button = {
  name: 'NextButton',
  props: ['icon', 'disabled'],
  emits: ['click'],
  template: '<button :class="icon" @click="$emit(\'click\')" />',
};
const SidePanel = {
  name: 'SidePanel',
  setup: () => ({ open: () => env.log.push('open') }),
  template: '<section class="panel"><slot /><slot name="footer" /></section>',
};

const mountPlayground = (assistantId = 1) =>
  shallowMount(AssistantPlayground, {
    props: { assistantId },
    global: {
      stubs: { NextButton: Button, SidePanel, PlaygroundTestSetup: true },
    },
  });

const send = async (wrapper, text) => {
  await wrapper.find('input').setValue(text);
  await wrapper.find('.i-lucide-send').trigger('click');
  await flushPromises();
};
const respond = data =>
  env.handlers.CAPTAIN_PLAYGROUND_RESPONSE({
    request_id: env.playground.mock.calls.at(-1)[0].requestId,
    ...data,
  });
const messages = wrapper =>
  wrapper.findComponent({ name: 'MessageList' }).props('messages');

describe('AssistantPlayground behaviour', () => {
  beforeEach(() => {
    env.playground = vi.fn().mockResolvedValue();
    env.reset = vi.fn().mockResolvedValue();
    env.narrow = ref(false);
    env.initializing = ref(false);
    env.valid = ref(true);
    env.log = [];
  });

  it('toggles and closes the side setup on wide screens', async () => {
    const wrapper = mountPlayground();
    expect(wrapper.find('aside').exists()).toBe(true);
    await wrapper.find('.i-lucide-settings-2').trigger('click');
    expect(wrapper.find('aside').exists()).toBe(false);
    await wrapper.find('.i-lucide-settings-2').trigger('click');
    await wrapper.find('aside .i-lucide-x').trigger('click');
    expect(wrapper.find('aside').exists()).toBe(false);
  });

  it('opens the setup panel and resets from it on narrow screens', async () => {
    env.narrow.value = true;
    const wrapper = mountPlayground();
    expect(wrapper.find('aside').exists()).toBe(false);
    await wrapper.find('.i-lucide-settings-2').trigger('click');
    expect(env.log).toEqual(['open']);
    await wrapper.find('.panel .i-lucide-refresh-cw').trigger('click');
    expect(env.reset).toHaveBeenCalledTimes(1);
  });

  it('sends agent names and falls back on response content', async () => {
    const wrapper = mountPlayground();
    await send(wrapper, 'Hi');
    respond({ content: 'From content', agent_name: 'Scout' });
    await send(wrapper, 'Again');
    expect(env.playground.mock.calls[1][0].messageHistory).toEqual([
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'From content', agent_name: 'Scout' },
      { role: 'user', content: 'Again' },
    ]);
    respond({ error: { code: 500 } });
    expect(messages(wrapper).at(-1)).toMatchObject({
      content: 'CAPTAIN.PLAYGROUND.RESPONSE_ERROR',
      isError: true,
    });
  });

  it('blocks sending while loading, invalid or composing', async () => {
    const wrapper = mountPlayground();
    env.initializing.value = true;
    await wrapper.find('input').setValue('Hi');
    await wrapper.find('input').trigger('keydown.enter');
    expect(env.playground).not.toHaveBeenCalled();

    env.initializing.value = false;
    env.valid.value = false;
    await wrapper.find('input').trigger('keydown.enter');
    expect(messages(wrapper)).toMatchObject([
      { content: 'CAPTAIN.PLAYGROUND.SETUP.INVALID_CONFIGURATION' },
    ]);

    env.valid.value = true;
    await wrapper
      .find('input')
      .trigger('keydown', { key: 'Enter', isComposing: true });
    expect(env.playground).not.toHaveBeenCalled();
  });

  it('reports API errors by data error, message or fallback', async () => {
    const wrapper = mountPlayground();
    const failures = [
      { response: { data: { error: 'Quota' } } },
      { response: { data: { message: 'Bad' } } },
      null,
    ];
    await failures.reduce(async (previous, failure) => {
      await previous;
      env.playground.mockRejectedValueOnce(failure);
      await send(wrapper, 'Hi');
    }, Promise.resolve());
    expect(
      messages(wrapper)
        .filter(message => message.isError)
        .map(message => message.content)
    ).toEqual(['Quota', 'Bad', 'CAPTAIN.PLAYGROUND.RESPONSE_ERROR']);
  });

  it('ignores stale errors, idle disconnects and assistant switches', async () => {
    const wrapper = mountPlayground();
    env.handlers.WEBSOCKET_DISCONNECT();
    expect(messages(wrapper)).toEqual([]);

    let reject;
    env.playground.mockReturnValueOnce(
      new Promise((_, rej) => {
        reject = rej;
      })
    );
    await send(wrapper, 'Hi');
    await wrapper.find('.i-lucide-rotate-ccw').trigger('click');
    reject(new Error('late'));
    await flushPromises();
    expect(messages(wrapper)).toEqual([]);

    await wrapper.setProps({ assistantId: 2 });
    expect(env.reset).toHaveBeenCalledTimes(1);
    expect(wrapper.find('aside').exists()).toBe(true);
  });

  it('does not reset when the first assistant id was empty', async () => {
    const wrapper = mountPlayground(0);
    await wrapper.setProps({ assistantId: 5 });
    expect(env.reset).not.toHaveBeenCalled();
  });
});
