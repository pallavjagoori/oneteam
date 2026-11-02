/**
 * OneTeam behaviour spec for the conversation header's "more actions" menu.
 *
 * Covers the mute or unmute entry depending on the conversation, opening
 * and closing the menu (including on an outside click), muting,
 * unmuting, opening and cancelling the email transcript modal, ignoring
 * unknown actions, and the command bar mute/unmute/transcript events
 * (removed again on unmount).
 */
import { mount } from '@vue/test-utils';
import { emitter } from 'shared/helpers/mitt';
import {
  CMD_MUTE_CONVERSATION,
  CMD_SEND_TRANSCRIPT,
  CMD_UNMUTE_CONVERSATION,
} from 'dashboard/helper/commandbar/events';
import MoreActions from '../MoreActions.vue';

const env = vi.hoisted(() => ({ chat: {}, dispatch: null, alert: null }));

vi.mock('vuex', async importOriginal => ({
  ...(await importOriginal()),
  useStore: () => ({
    getters: {
      get getSelectedChat() {
        return env.chat;
      },
    },
    dispatch: (...args) => env.dispatch(...args),
  }),
}));
vi.mock('dashboard/composables', () => ({
  useAlert: (...args) => env.alert(...args),
}));
vi.mock('@vueuse/core', async importOriginal => {
  const { ref: appRef } = await import('vue');
  return {
    ...(await importOriginal()),
    useToggle: initial => {
      const state = appRef(initial);
      const toggle = value => {
        state.value = typeof value === 'boolean' ? value : !state.value;
      };
      return [state, toggle];
    },
  };
});

const ButtonV4 = {
  name: 'NextButton',
  emits: ['click'],
  template: '<button class="more" @click="$emit(\'click\')" />',
};
const DropdownMenu = {
  name: 'DropdownMenu',
  props: ['menuItems'],
  emits: ['action'],
  template: '<ul class="menu"><li v-for="item in menuItems" :key="item.value">{{ item.label }}</li></ul>',
};
const EmailTranscriptModal = {
  name: 'EmailTranscriptModal',
  props: ['show', 'currentChat'],
  emits: ['cancel'],
  template: '<div class="transcript" />',
};
const ResolveAction = {
  name: 'ResolveAction',
  props: ['conversationId', 'status'],
  template: '<div class="resolve" :data-id="conversationId" :data-status="status" />',
};

const mounted = [];
const mountActions = () => {
  const clickaway = [];
  const wrapper = mount(MoreActions, {
    global: {
      stubs: { ButtonV4, NextButton: ButtonV4, DropdownMenu, EmailTranscriptModal, ResolveAction },
      directives: {
        tooltip: {},
        onClickaway: {
          mounted: (el, binding) => {
            clickaway.push(binding.value);
          },
        },
      },
    },
  });
  mounted.push(wrapper);
  return { wrapper, clickaway };
};
const menu = wrapper => wrapper.findComponent(DropdownMenu);

describe('More actions behaviour', () => {
  beforeEach(() => {
    env.chat = { id: 12, status: 'open', muted: false };
    env.dispatch = vi.fn();
    env.alert = vi.fn();
  });

  afterEach(() => {
    mounted.splice(0).forEach(wrapper => wrapper.unmount());
  });

  it('opens the menu and mutes the conversation', async () => {
    const { wrapper, clickaway } = mountActions();
    expect(wrapper.find('.resolve').attributes('data-id')).toBe('12');
    await wrapper.find('.more').trigger('click');
    expect(menu(wrapper).props('menuItems').map(i => i.action)).toEqual(['mute', 'send_transcript']);
    clickaway[0]();
    await wrapper.vm.$nextTick();
    expect(menu(wrapper).exists()).toBe(false);

    await wrapper.find('.more').trigger('click');
    menu(wrapper).vm.$emit('action', { action: 'mute' });
    await wrapper.vm.$nextTick();
    expect(env.dispatch).toHaveBeenCalledWith('muteConversation', 12);
    expect(env.alert).toHaveBeenCalledWith('CONTACT_PANEL.MUTED_SUCCESS');
    expect(menu(wrapper).exists()).toBe(false);
  });

  it('unmutes a muted conversation and opens the transcript modal', async () => {
    env.chat = { id: 13, status: 'resolved', muted: true };
    const { wrapper } = mountActions();
    await wrapper.find('.more').trigger('click');
    expect(menu(wrapper).props('menuItems')[0].icon).toBe('i-lucide-volume-1');
    menu(wrapper).vm.$emit('action', { action: 'unmute' });
    expect(env.dispatch).toHaveBeenCalledWith('unmuteConversation', 13);
    expect(env.alert).toHaveBeenCalledWith('CONTACT_PANEL.UNMUTED_SUCCESS');

    await wrapper.find('.more').trigger('click');
    menu(wrapper).vm.$emit('action', { action: 'send_transcript' });
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(EmailTranscriptModal).props('currentChat')).toEqual(env.chat);
    wrapper.findComponent(EmailTranscriptModal).vm.$emit('cancel');
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.transcript').exists()).toBe(false);

    await wrapper.find('.more').trigger('click');
    menu(wrapper).vm.$emit('action', { action: 'other' });
    expect(env.dispatch).toHaveBeenCalledTimes(1);
  });

  it('follows command bar events until unmounted', async () => {
    const { wrapper } = mountActions();
    emitter.emit(CMD_MUTE_CONVERSATION);
    emitter.emit(CMD_UNMUTE_CONVERSATION);
    emitter.emit(CMD_SEND_TRANSCRIPT);
    await wrapper.vm.$nextTick();
    expect(env.dispatch.mock.calls).toEqual([
      ['muteConversation', 12],
      ['unmuteConversation', 12],
    ]);
    expect(wrapper.find('.transcript').exists()).toBe(true);
    wrapper.unmount();
    emitter.emit(CMD_MUTE_CONVERSATION);
    expect(env.dispatch).toHaveBeenCalledTimes(2);
  });
});
