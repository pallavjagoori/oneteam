/**
 * OneTeam behaviour spec for the command bar's snooze handler.
 *
 * Covers snoozing the open or right-clicked conversation by a preset, a
 * timestamp or "until next reply", opening the custom snooze modal and
 * snoozing until the picked time (or nothing when no time is picked),
 * and clearing the right-clicked conversation when the modal closes.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import { useAlert } from 'dashboard/composables';
import { findSnoozeTime } from 'dashboard/helper/snoozeHelpers';
import { CMD_SNOOZE_CONVERSATION } from 'dashboard/helper/commandbar/events';
import CmdBarConversationSnooze from '../CmdBarConversationSnooze.vue';

const env = vi.hoisted(() => ({ emitters: {} }));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/helper/snoozeHelpers', () => ({ findSnoozeTime: vi.fn() }));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: env.dispatch }),
  useStoreGetters: () => env.getters,
}));
vi.mock('dashboard/composables/emitter', () => ({
  useEmitter: (name, handler) => {
    env.emitters[name] = handler;
  },
}));

const WootModal = {
  name: 'WootModal',
  props: { show: Boolean, onClose: Function },
  emits: ['update:show'],
  template: '<div v-if="show" class="modal"><slot /></div>',
};
const CustomSnoozeModal = {
  name: 'CustomSnoozeModal',
  emits: ['close', 'chooseTime'],
  template: '<div class="custom" />',
};

const mountSnooze = (chat = { id: 7 }, contextId = 9) => {
  env.dispatch = vi.fn().mockResolvedValue();
  env.getters = {
    getSelectedChat: ref(chat),
    getContextMenuChatId: ref(contextId),
  };
  return mount(CmdBarConversationSnooze, {
    global: { stubs: { WootModal, CustomSnoozeModal } },
  });
};

const snooze = async type => {
  env.emitters[CMD_SNOOZE_CONVERSATION](type);
  await flushPromises();
};

describe('CmdBarConversationSnooze behaviour', () => {
  it('snoozes the open conversation by a timestamp or a preset', async () => {
    mountSnooze();
    await snooze(1700000000);
    expect(env.dispatch).toHaveBeenCalledWith('toggleStatus', {
      conversationId: 7,
      status: 'snoozed',
      snoozedUntil: 1700000000,
    });
    expect(env.dispatch).toHaveBeenCalledWith('setContextMenuChatId', null);
    expect(useAlert).toHaveBeenCalledWith('CONVERSATION.CHANGE_STATUS');

    findSnoozeTime.mockReturnValueOnce(1800000000);
    await snooze('until_tomorrow');
    expect(findSnoozeTime).toHaveBeenCalledWith('until_tomorrow');
    expect(env.dispatch).toHaveBeenLastCalledWith('setContextMenuChatId', null);
    expect(env.dispatch).toHaveBeenCalledWith(
      'toggleStatus',
      expect.objectContaining({ snoozedUntil: 1800000000 })
    );
  });

  it('snoozes the right-clicked conversation until the next reply', async () => {
    mountSnooze(null);
    findSnoozeTime.mockReturnValueOnce(undefined);
    await snooze('until_next_reply');
    expect(env.dispatch).toHaveBeenCalledWith('toggleStatus', {
      conversationId: 9,
      status: 'snoozed',
      snoozedUntil: null,
    });
  });

  it('picks a custom time from the modal', async () => {
    const wrapper = mountSnooze();
    expect(wrapper.find('.modal').exists()).toBe(false);
    await snooze('until_custom_time');
    expect(wrapper.find('.modal').exists()).toBe(true);
    expect(env.dispatch).not.toHaveBeenCalled();

    await wrapper
      .findComponent(CustomSnoozeModal)
      .vm.$emit('chooseTime', new Date(1700000000000));
    await flushPromises();
    expect(wrapper.find('.modal').exists()).toBe(false);
    expect(env.dispatch).toHaveBeenCalledWith('toggleStatus', {
      conversationId: 7,
      status: 'snoozed',
      snoozedUntil: 1700000000,
    });

    env.dispatch.mockClear();
    await snooze('until_custom_time');
    await wrapper.findComponent(CustomSnoozeModal).vm.$emit('chooseTime', null);
    await flushPromises();
    expect(wrapper.find('.modal').exists()).toBe(false);
    expect(env.dispatch).not.toHaveBeenCalled();
  });

  it('clears the right-clicked conversation when the modal closes', async () => {
    const wrapper = mountSnooze();
    await snooze('until_custom_time');
    await wrapper.findComponent(CustomSnoozeModal).vm.$emit('close');
    expect(wrapper.find('.modal').exists()).toBe(false);
    expect(env.dispatch).toHaveBeenCalledWith('setContextMenuChatId', null);

    await snooze('until_custom_time');
    wrapper.findComponent(WootModal).props('onClose')();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.modal').exists()).toBe(false);
    expect(env.dispatch).toHaveBeenCalledTimes(2);

    await snooze('until_custom_time');
    await wrapper.findComponent(WootModal).vm.$emit('update:show', false);
    expect(wrapper.find('.modal').exists()).toBe(false);
  });
});
