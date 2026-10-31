/**
 * OneTeam behaviour spec for the conversation header resolve button.
 *
 * Store getters, keyboard shortcuts, the event bus and required
 * attributes are faked. Covers the buttons for each status, resolving
 * (asking for missing required attributes first), reopening, the
 * snooze and pending dropdown, and the keyboard shortcuts, including
 * moving to the next conversation after resolving.
 */
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import {
  CMD_REOPEN_CONVERSATION,
  CMD_RESOLVE_CONVERSATION,
} from 'dashboard/helper/commandbar/events';
import ResolveAction from '../ResolveAction.vue';

const env = vi.hoisted(() => ({ emitters: {} }));

vi.mock('@vueuse/core', async importOriginal => {
  const { ref: appRef } = await import('vue');
  return {
    ...(await importOriginal()),
    useToggle: () => {
      const state = appRef(false);
      return [
        state,
        value => {
          state.value = typeof value === 'boolean' ? value : !state.value;
        },
      ];
    },
  };
});
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => env.store,
  useStoreGetters: () => env.getters,
}));
vi.mock('dashboard/composables/emitter', () => ({
  useEmitter: (name, handler) => {
    env.emitters[name] = handler;
  },
}));
vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: events => {
    env.keys = events;
  },
}));
vi.mock('dashboard/composables/useConversationRequiredAttributes', () => ({
  useConversationRequiredAttributes: () => ({
    checkMissingAttributes: env.checkMissing,
  }),
}));

const Button = {
  name: 'Button',
  props: ['label', 'icon', 'isLoading', 'disabled'],
  template: '<button class="btn">{{ label }}</button>',
};
const Modal = {
  name: 'ConversationResolveAttributesModal',
  emits: ['submit'],
  methods: { open: (...args) => env.modalOpen(...args) },
  template: '<div />',
};

const mountAction = async () => {
  const wrapper = mount(ResolveAction, {
    attachTo: document.body,
    global: {
      stubs: {
        Button,
        ButtonGroup: { template: '<div><slot /></div>' },
        WootDropdownMenu: { template: '<ul><slot /></ul>' },
        WootDropdownItem: { template: '<li><slot /></li>' },
        ConversationResolveAttributesModal: Modal,
      },
      directives: {
        onClickaway: {
          mounted: (_, binding) => {
            env.away = binding.value;
          },
        },
      },
    },
  });
  await flushPromises();
  return wrapper;
};

const button = (wrapper, label) =>
  wrapper.findAllComponents(Button).find(b => b.props('label') === label);
const statusCall = () => env.store.dispatch.mock.calls.at(-1)[1];

describe('ResolveAction behaviour', () => {
  let wrapper;

  beforeEach(() => {
    env.chat = ref({
      id: 5,
      status: 'open',
      custom_attributes: { plan: 'pro' },
    });
    env.getters = { getSelectedChat: env.chat };
    env.store = { dispatch: vi.fn().mockResolvedValue() };
    env.checkMissing = vi.fn(() => ({ hasMissing: false, missing: [] }));
    env.modalOpen = vi.fn();
  });

  afterEach(() => {
    wrapper?.unmount();
    document.body.innerHTML = '';
  });

  it('resolves an open conversation', async () => {
    wrapper = await mountAction();
    let finish;
    env.store.dispatch.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    await button(wrapper, 'CONVERSATION.HEADER.RESOLVE_ACTION').trigger(
      'click'
    );
    expect(env.checkMissing).toHaveBeenCalledWith({ plan: 'pro' });
    expect(statusCall()).toEqual({
      conversationId: 5,
      status: 'resolved',
      snoozedUntil: undefined,
    });
    expect(
      button(wrapper, 'CONVERSATION.HEADER.RESOLVE_ACTION').props('isLoading')
    ).toBe(true);
    finish();
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('CONVERSATION.CHANGE_STATUS');
    expect(
      button(wrapper, 'CONVERSATION.HEADER.RESOLVE_ACTION').props('isLoading')
    ).toBe(false);
  });

  it('asks for missing required attributes before resolving', async () => {
    env.chat.value = { id: 5, status: 'open' };
    env.checkMissing.mockReturnValue({
      hasMissing: true,
      missing: [{ value: 'plan' }],
    });
    wrapper = await mountAction();
    await button(wrapper, 'CONVERSATION.HEADER.RESOLVE_ACTION').trigger(
      'click'
    );
    expect(env.modalOpen).toHaveBeenCalledWith(
      [{ value: 'plan' }],
      {},
      { id: 5, snoozedUntil: null }
    );
    expect(env.store.dispatch).not.toHaveBeenCalled();

    const modal = wrapper.findComponent(Modal);
    modal.vm.$emit('submit', { attributes: { plan: 'pro' }, context: null });
    expect(env.store.dispatch).not.toHaveBeenCalled();
    modal.vm.$emit('submit', {
      attributes: { plan: 'pro' },
      context: { snoozedUntil: 9 },
    });
    expect(statusCall()).toEqual({
      conversationId: 5,
      status: 'resolved',
      snoozedUntil: 9,
      customAttributes: { plan: 'pro' },
    });
    env.chat.value = {
      id: 5,
      status: 'open',
      custom_attributes: { tier: 'a' },
    };
    modal.vm.$emit('submit', { attributes: { plan: 'pro' }, context: {} });
    expect(statusCall().customAttributes).toEqual({ tier: 'a', plan: 'pro' });
  });

  it('reopens resolved conversations and opens pending or snoozed ones', async () => {
    env.chat.value = { id: 5, status: 'resolved' };
    wrapper = await mountAction();
    await button(wrapper, 'CONVERSATION.HEADER.REOPEN_ACTION').trigger('click');
    expect(statusCall().status).toBe('open');

    env.chat.value = { id: 5, status: 'pending' };
    await flushPromises();
    expect(button(wrapper, 'CONVERSATION.HEADER.OPEN_ACTION').exists()).toBe(
      true
    );
    expect(wrapper.findAllComponents(Button)).toHaveLength(1);
    env.chat.value = { id: 5, status: 'snoozed' };
    await flushPromises();
    await button(wrapper, 'CONVERSATION.HEADER.OPEN_ACTION').trigger('click');
    expect(statusCall().status).toBe('open');
  });

  it('opens the dropdown to snooze or mark pending', async () => {
    const ninja = document.createElement('ninja-keys');
    ninja.open = vi.fn();
    document.body.appendChild(ninja);
    wrapper = await mountAction();
    const chevron = () =>
      wrapper
        .findAllComponents(Button)
        .find(b => b.props('icon') === 'i-lucide-chevron-down');
    await chevron().trigger('click');
    await button(wrapper, 'CONVERSATION.RESOLVE_DROPDOWN.SNOOZE_UNTIL').trigger(
      'click'
    );
    expect(ninja.open).toHaveBeenCalledWith({ parent: 'snooze_conversation' });
    await button(wrapper, 'CONVERSATION.RESOLVE_DROPDOWN.MARK_PENDING').trigger(
      'click'
    );
    expect(statusCall().status).toBe('pending');
    expect(
      button(wrapper, 'CONVERSATION.RESOLVE_DROPDOWN.MARK_PENDING')
    ).toBeUndefined();

    await chevron().trigger('click');
    env.away();
    await flushPromises();
    expect(
      button(wrapper, 'CONVERSATION.RESOLVE_DROPDOWN.SNOOZE_UNTIL')
    ).toBeUndefined();
  });

  it('handles shortcuts and command bar events', async () => {
    wrapper = await mountAction();
    env.keys['Alt+KeyM'].action();
    await flushPromises();
    expect(
      button(wrapper, 'CONVERSATION.RESOLVE_DROPDOWN.SNOOZE_UNTIL').exists()
    ).toBe(true);

    const event = { preventDefault: vi.fn() };
    await env.keys['Alt+KeyE'].action(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(statusCall().status).toBe('resolved');

    env.emitters[CMD_REOPEN_CONVERSATION]();
    expect(statusCall().status).toBe('open');
    env.emitters[CMD_RESOLVE_CONVERSATION]();
    expect(statusCall().status).toBe('resolved');

    // Without the dropdown button the shortcut does nothing.
    env.chat.value = { id: 5, status: 'pending' };
    await flushPromises();
    env.keys['Alt+KeyM'].action();
  });

  it('shows only the dropdown for an unknown status', async () => {
    env.chat.value = { id: 5, status: 'archived' };
    wrapper = await mountAction();
    expect(wrapper.findAllComponents(Button).map(b => b.props('icon'))).toEqual(
      ['i-lucide-chevron-down']
    );
  });

  it('moves to the next conversation after resolving with the shortcut', async () => {
    document.body.innerHTML = `
      <div class="conversations-list">
        <div class="conversation">A</div>
        <div class="conversation active">B</div>
        <div class="conversation">C</div>
      </div>`;
    const list = document.querySelector('.conversations-list');
    const [first, , third] = document.querySelectorAll('.conversation');
    first.click = vi.fn();
    third.click = vi.fn();
    wrapper = await mountAction();
    const event = { preventDefault: vi.fn() };
    await env.keys['$mod+Alt+KeyE'].action(event);
    expect(third.click).toHaveBeenCalled();

    document.querySelector('.active').classList.remove('active');
    third.classList.add('active');
    list.scrollTop = 50;
    await env.keys['$mod+Alt+KeyE'].action(event);
    expect(first.click).toHaveBeenCalled();
    expect(list.scrollTop).toBe(0);

    list.innerHTML = '<div class="conversation active">Only</div>';
    await env.keys['$mod+Alt+KeyE'].action(event);
    expect(event.preventDefault).toHaveBeenCalledTimes(3);
  });
});
