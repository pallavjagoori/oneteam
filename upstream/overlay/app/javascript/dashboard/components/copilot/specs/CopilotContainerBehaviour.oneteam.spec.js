/**
 * OneTeam behaviour spec for the Copilot panel container.
 *
 * Covers when the panel shows, closing it on outside clicks on small
 * screens, choosing the active assistant (thread, preference, inbox,
 * first), saving the preferred assistant, the reply suggestion flags,
 * thread history paging (merging, races with account switches, errors),
 * opening threads (failures, stale selections), refetching after a
 * websocket reconnect, resetting on conversation changes, and sending
 * messages to new and existing threads.
 */
import { nextTick, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import { BUS_EVENTS } from 'shared/constants/busEvents';
import { MESSAGE_TYPE } from 'shared/constants/messages';
import CopilotContainer from '../CopilotContainer.vue';

const env = vi.hoisted(() => ({ isEnterprise: true }));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/api/captain/copilotThreads', () => ({
  default: { get: (...args) => env.getThreads(...args) },
}));
vi.mock('dashboard/composables/useConfig', () => ({
  useConfig: () => ({ isEnterprise: env.isEnterprise }),
}));
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({
    uiSettings: env.uiSettings,
    updateUISettings: (...args) => env.updateUISettings(...args),
  }),
}));
vi.mock('dashboard/composables/emitter', () => ({
  useEmitter: (event, handler) => {
    env.listeners[event] = handler;
  },
}));
vi.mock('@vueuse/core', () => ({
  useWindowSize: () => ({ width: env.width }),
}));
vi.mock('@vueuse/components', () => ({
  vOnClickOutside: {
    mounted: (el, binding) => {
      env.clickOutside = binding.value;
    },
  },
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: key => env.refs[key],
  useStore: () => ({
    dispatch: (...args) => env.dispatch(...args),
    getters: {
      'copilotMessages/getMessagesByThreadId': id => (id ? [{ id }] : []),
    },
  }),
}));

const Copilot = {
  name: 'Copilot',
  props: [
    'messages',
    'assistants',
    'activeAssistant',
    'threads',
    'selectedThreadId',
    'hasMoreThreads',
    'isLoadingThreads',
    'isLoadingSelectedThread',
    'canSuggestReply',
    'canUseReply',
    'onSendMessage',
  ],
  emits: ['reset', 'setAssistant', 'selectThread', 'loadMoreThreads'],
  template: '<div class="copilot" />',
};

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};
const page = (ids, total = ids.length) => ({
  data: {
    payload: ids.map(id => ({ id, title: `T${id}` })),
    meta: { total_count: total },
  },
});

const mountContainer = async () => {
  const wrapper = mount(CopilotContainer, {
    global: { stubs: { Copilot } },
  });
  await flushPromises();
  return wrapper;
};
const copilot = wrapper => wrapper.findComponent(Copilot);
const send = (wrapper, payload) => copilot(wrapper).props('onSendMessage')(payload);

describe('Copilot container behaviour', () => {
  beforeEach(() => {
    env.isEnterprise = true;
    env.listeners = {};
    env.clickOutside = null;
    env.width = ref(1200);
    env.uiSettings = ref({ is_copilot_panel_open: true });
    env.updateUISettings = vi.fn();
    env.dispatch = vi.fn();
    env.getThreads = vi.fn().mockResolvedValue(page([]));
    env.workflows = false;
    env.refs = {
      getCurrentUser: ref({ id: 1 }),
      'captainAssistants/getRecords': ref([{ id: 7 }, { id: 8 }, { id: 9 }]),
      'captainAssistants/getUIFlags': ref({ fetchingList: false }),
      getCopilotAssistant: ref(null),
      getSelectedChat: ref({ id: 1 }),
      getLastEmailInSelectedChat: ref({ message_type: MESSAGE_TYPE.INCOMING }),
      getCurrentAccountId: ref(1),
      'accounts/isFeatureEnabledonAccount': ref((_, flag) =>
        flag === 'copilot_workflows' ? env.workflows : flag === 'captain_integration'
      ),
    };
  });

  it('loads assistants and shows the panel when Captain is available', async () => {
    const wrapper = await mountContainer();
    expect(env.dispatch).toHaveBeenCalledWith('captainAssistants/get');
    expect(copilot(wrapper).props()).toMatchObject({
      canSuggestReply: true,
      canUseReply: false,
      activeAssistant: { id: 7 },
      messages: [],
    });
    env.refs['captainAssistants/getUIFlags'].value = { fetchingList: true };
    await nextTick();
    expect(copilot(wrapper).exists()).toBe(false);
  });

  it('stays hidden outside enterprise', async () => {
    env.isEnterprise = false;
    const wrapper = await mountContainer();
    expect(env.dispatch).not.toHaveBeenCalled();
    expect(copilot(wrapper).exists()).toBe(false);
    expect(env.getThreads).not.toHaveBeenCalled();
  });

  it('closes on outside clicks only on small screens with the panel open', async () => {
    await mountContainer();
    env.clickOutside();
    expect(env.updateUISettings).not.toHaveBeenCalled();
    env.width.value = 500;
    env.clickOutside();
    expect(env.updateUISettings).toHaveBeenCalledWith({
      is_contact_sidebar_open: false,
      is_copilot_panel_open: false,
    });
  });

  it('picks the preferred, inbox or first assistant', async () => {
    env.uiSettings.value.preferred_captain_assistant_id = 9;
    env.refs.getCopilotAssistant.value = { id: 8 };
    const wrapper = await mountContainer();
    expect(copilot(wrapper).props('activeAssistant')).toEqual({ id: 9 });
    env.uiSettings.value = { is_copilot_panel_open: true, preferred_captain_assistant_id: 99 };
    await nextTick();
    expect(copilot(wrapper).props('activeAssistant')).toEqual({ id: 8 });
    env.refs.getCopilotAssistant.value = { id: 98 };
    await nextTick();
    expect(copilot(wrapper).props('activeAssistant')).toEqual({ id: 7 });
    await copilot(wrapper).vm.$emit('setAssistant', { id: 8 });
    expect(env.updateUISettings).toHaveBeenCalledWith({
      preferred_captain_assistant_id: 8,
    });
  });

  it('uses the open thread assistant and refetches it after a reconnect', async () => {
    env.getThreads.mockResolvedValue({
      data: { payload: [{ id: 5, assistant: { id: 42 } }], meta: { total_count: 1 } },
    });
    const wrapper = await mountContainer();
    env.listeners[BUS_EVENTS.WEBSOCKET_RECONNECT]();
    expect(env.dispatch).toHaveBeenCalledTimes(1);
    await copilot(wrapper).vm.$emit('selectThread', { id: 5 });
    await flushPromises();
    expect(copilot(wrapper).props()).toMatchObject({
      activeAssistant: { id: 42 },
      selectedThreadId: 5,
      messages: [{ id: 5 }],
      canUseReply: true,
      isLoadingSelectedThread: false,
    });
    env.listeners[BUS_EVENTS.WEBSOCKET_RECONNECT]();
    expect(env.dispatch).toHaveBeenLastCalledWith('copilotMessages/fetchThread', {
      threadId: 5,
    });
  });

  it('pages through thread history', async () => {
    env.getThreads
      .mockResolvedValueOnce(page([1, 2], 4))
      .mockResolvedValueOnce(page([2, 3, 4], 4));
    const wrapper = await mountContainer();
    expect(env.getThreads).toHaveBeenCalledWith({ page: 1 });
    expect(copilot(wrapper).props('hasMoreThreads')).toBe(true);
    await copilot(wrapper).vm.$emit('loadMoreThreads');
    await flushPromises();
    expect(env.getThreads).toHaveBeenLastCalledWith({ page: 2 });
    expect(copilot(wrapper).props('threads').map(t => t.id)).toEqual([1, 2, 3, 4]);
    expect(copilot(wrapper).props('hasMoreThreads')).toBe(false);
    expect(copilot(wrapper).props('isLoadingThreads')).toBe(false);
  });

  it('keeps threads created while the first page was loading', async () => {
    const first = deferred();
    env.getThreads.mockReturnValueOnce(first.promise);
    env.dispatch.mockImplementation(action =>
      action === 'copilotThreads/create' ? { id: 50, title: 'New' } : undefined
    );
    const wrapper = await mountContainer();
    expect(copilot(wrapper).props('isLoadingThreads')).toBe(true);
    await send(wrapper, 'hello');
    first.resolve(page([50, 1]));
    await flushPromises();
    expect(copilot(wrapper).props('threads').map(t => t.id)).toEqual([50, 1]);
    env.dispatch.mockImplementation(action =>
      action === 'copilotThreads/create' ? { id: 60 } : undefined
    );
    await copilot(wrapper).vm.$emit('reset');
    await send(wrapper, 'again');
    expect(copilot(wrapper).props('threads')[0].id).toBe(60);
  });

  it('drops history responses from a previous account and reports errors', async () => {
    const stale = deferred();
    env.getThreads.mockReturnValueOnce(stale.promise);
    const wrapper = await mountContainer();
    env.getThreads.mockRejectedValueOnce(new Error('History failed'));
    env.refs.getCurrentAccountId.value = 2;
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('History failed');
    stale.resolve(page([1]));
    await flushPromises();
    expect(copilot(wrapper).props('threads')).toEqual([]);
    const late = deferred();
    env.getThreads.mockReturnValueOnce(late.promise);
    await copilot(wrapper).vm.$emit('loadMoreThreads');
    env.refs.getCurrentAccountId.value = 3;
    await flushPromises();
    late.reject(new Error('Old'));
    await flushPromises();
    expect(useAlert).not.toHaveBeenCalledWith('Old');
  });

  it('ignores history that resolves just before an account switch', async () => {
    const pending = deferred();
    env.getThreads.mockReturnValueOnce(pending.promise);
    const wrapper = await mountContainer();
    pending.resolve(page([1]));
    env.refs.getCurrentAccountId.value = 2;
    await flushPromises();
    expect(copilot(wrapper).props('threads')).toEqual([]);
  });

  it('restores the previous thread when opening one fails', async () => {
    env.getThreads.mockResolvedValue(page([1, 2]));
    const wrapper = await mountContainer();
    await copilot(wrapper).vm.$emit('selectThread', { id: 1 });
    await flushPromises();
    env.dispatch.mockRejectedValueOnce(new Error('Missing thread'));
    await copilot(wrapper).vm.$emit('selectThread', { id: 2 });
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('Missing thread');
    expect(copilot(wrapper).props()).toMatchObject({
      selectedThreadId: 1,
      isLoadingSelectedThread: false,
    });
  });

  it('ignores the outcome of a superseded thread selection', async () => {
    const slow = deferred();
    const wrapper = await mountContainer();
    env.dispatch.mockReturnValueOnce(slow.promise);
    await copilot(wrapper).vm.$emit('selectThread', { id: 1 });
    expect(copilot(wrapper).props('isLoadingSelectedThread')).toBe(true);
    expect(await send(wrapper, 'blocked')).toBe(false);
    await copilot(wrapper).vm.$emit('reset');
    slow.reject(new Error('Too late'));
    await flushPromises();
    expect(useAlert).not.toHaveBeenCalled();
    expect(copilot(wrapper).props('selectedThreadId')).toBe(null);
  });

  it('resets on conversation change unless workflows are enabled', async () => {
    env.getThreads.mockResolvedValue(page([1]));
    const wrapper = await mountContainer();
    await copilot(wrapper).vm.$emit('selectThread', { id: 1 });
    await flushPromises();
    env.workflows = true;
    env.refs['accounts/isFeatureEnabledonAccount'].value = (_, flag) =>
      flag === 'copilot_workflows' ? env.workflows : flag === 'captain_integration';
    await flushPromises();
    await copilot(wrapper).vm.$emit('selectThread', { id: 1 });
    await flushPromises();
    env.refs.getSelectedChat.value = { id: 2 };
    await nextTick();
    expect(copilot(wrapper).props()).toMatchObject({ selectedThreadId: 1, canUseReply: false });
    env.workflows = false;
    env.refs['accounts/isFeatureEnabledonAccount'].value = (_, flag) =>
      flag === 'captain_integration';
    await flushPromises();
    await copilot(wrapper).vm.$emit('selectThread', { id: 1 });
    env.refs.getSelectedChat.value = null;
    await nextTick();
    expect(copilot(wrapper).props('selectedThreadId')).toBe(null);
  });

  it('sends follow-up messages into the open thread', async () => {
    const wrapper = await mountContainer();
    await copilot(wrapper).vm.$emit('selectThread', { id: 3 });
    await flushPromises();
    env.refs.getSelectedChat.value = { id: 1, other: true };
    expect(await send(wrapper, { message: 'more' })).toBe(true);
    expect(env.dispatch).toHaveBeenLastCalledWith('copilotMessages/create', {
      assistant_id: 7,
      conversation_id: 1,
      threadId: 3,
      message: 'more',
    });
    env.dispatch.mockRejectedValueOnce(new Error('Send failed'));
    expect(await send(wrapper, 'oops')).toBe(false);
    expect(useAlert).toHaveBeenCalledWith('Send failed');
  });

  it('starts new threads with an optional request type', async () => {
    env.dispatch.mockImplementation(action =>
      action === 'copilotThreads/create' ? { id: 70 } : undefined
    );
    const wrapper = await mountContainer();
    expect(await send(wrapper, { message: 'draft', requestType: 'rephrase' })).toBe(true);
    expect(env.dispatch).toHaveBeenLastCalledWith('copilotThreads/create', {
      assistant_id: 7,
      conversation_id: 1,
      message: 'draft',
      request_type: 'rephrase',
    });
    expect(copilot(wrapper).props('selectedThreadId')).toBe(70);
    await copilot(wrapper).vm.$emit('reset');
    expect(await send(wrapper, 'again')).toBe(true);
    expect(copilot(wrapper).props('threads').map(t => t.id)).toEqual([70]);
  });

  it('does not open a new thread after the conversation or account changed', async () => {
    const create = deferred();
    env.dispatch.mockImplementation(action =>
      action === 'copilotThreads/create' ? create.promise : undefined
    );
    const wrapper = await mountContainer();
    const sending = send(wrapper, 'hi');
    env.refs.getSelectedChat.value = { id: 2 };
    await nextTick();
    create.resolve({ id: 80 });
    expect(await sending).toBe(true);
    expect(copilot(wrapper).props('selectedThreadId')).toBe(null);
    expect(copilot(wrapper).props('threads').map(t => t.id)).toEqual([80]);
    const second = deferred();
    env.dispatch.mockImplementation(action =>
      action === 'copilotThreads/create' ? second.promise : undefined
    );
    const sendingAgain = send(wrapper, 'hi');
    env.refs.getCurrentAccountId.value = 5;
    await flushPromises();
    second.resolve({ id: 81 });
    expect(await sendingAgain).toBe(true);
    expect(copilot(wrapper).props('threads')).toEqual([]);
  });

  it('opens new threads across conversations when workflows are enabled', async () => {
    env.workflows = true;
    const create = deferred();
    env.dispatch.mockImplementation(action =>
      action === 'copilotThreads/create' ? create.promise : undefined
    );
    env.refs.getSelectedChat.value = null;
    env.refs.getLastEmailInSelectedChat.value = null;
    const wrapper = await mountContainer();
    expect(copilot(wrapper).props('canSuggestReply')).toBe(false);
    const sending = send(wrapper, 'hi');
    env.refs.getSelectedChat.value = { id: 4 };
    await nextTick();
    create.resolve({ id: 90 });
    await sending;
    await nextTick();
    expect(copilot(wrapper).props()).toMatchObject({ selectedThreadId: 90, canUseReply: false });
  });
});
