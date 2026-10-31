/**
 * OneTeam behaviour spec for the notification detail header.
 *
 * Covers pagination (shown only for several notifications), opening the
 * snooze command palette, snoozing from palette events (preset, custom
 * time, raw timestamps, "until next reply"), the custom snooze modal,
 * ignoring snooze failures, deleting a notification, and dropping the
 * palette listener on unmount.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert, useTrack } from 'dashboard/composables';
import { emitter } from 'shared/helpers/mitt';
import { CMD_SNOOZE_NOTIFICATION } from 'dashboard/helper/commandbar/events';
import { INBOX_EVENTS } from 'dashboard/helper/AnalyticsHelper/events';
import InboxItemHeader from '../InboxItemHeader.vue';

vi.mock('dashboard/composables', () => ({
  useAlert: vi.fn(),
  useTrack: vi.fn(),
}));

const Pagination = {
  name: 'PaginationButton',
  props: ['totalLength', 'currentIndex'],
  emits: ['next', 'prev'],
  template: '<nav class="pages" />',
};
const NextButton = {
  name: 'NextButton',
  props: ['label'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\', $event)">{{ label }}</button>',
};
const Modal = {
  name: 'WootModal',
  props: ['show', 'onClose'],
  emits: ['update:show'],
  template: '<div v-if="show" class="modal"><slot /></div>',
};
const SnoozeModal = {
  name: 'CustomSnoozeModal',
  emits: ['close', 'chooseTime'],
  template: '<div class="custom-snooze" />',
};

const mountHeader = (props = {}) => {
  const dispatch = vi.fn().mockResolvedValue();
  const router = { replace: vi.fn() };
  const wrapper = mount(InboxItemHeader, {
    props: { activeNotification: { id: 9 }, ...props },
    global: {
      stubs: {
        PaginationButton: Pagination,
        NextButton,
        BackButton: true,
        WootModal: Modal,
        CustomSnoozeModal: SnoozeModal,
      },
      mocks: {
        $t: key => key,
        $router: router,
        $store: {
          getters: { 'notifications/getMeta': { unreadCount: 2, count: 5 } },
          dispatch,
        },
      },
    },
  });
  return { wrapper, dispatch, router };
};
const button = (wrapper, label) =>
  wrapper.findAllComponents(NextButton).find(b => b.props('label') === label);
const snoozeCall = dispatch =>
  dispatch.mock.calls.find(([action]) => action === 'notifications/snooze');

afterEach(() => {
  emitter.all.clear();
});

describe('InboxItemHeader behaviour', () => {
  it('paginates only when there are several notifications', async () => {
    expect(
      mountHeader({ totalLength: 1 }).wrapper.find('.pages').exists()
    ).toBe(false);
    const { wrapper } = mountHeader({ totalLength: 3, currentIndex: 1 });
    const pages = wrapper.findComponent(Pagination);
    expect(pages.props()).toEqual({ totalLength: 3, currentIndex: 2 });
    pages.vm.$emit('next');
    pages.vm.$emit('prev');
    expect(wrapper.emitted('next')).toHaveLength(1);
    expect(wrapper.emitted('prev')).toHaveLength(1);
  });

  it('opens the snooze palette', async () => {
    const ninja = document.createElement('ninja-keys');
    ninja.open = vi.fn();
    document.body.appendChild(ninja);
    const { wrapper } = mountHeader();
    await button(wrapper, 'INBOX.ACTION_HEADER.SNOOZE').trigger('click');
    expect(ninja.open).toHaveBeenCalledWith({ parent: 'snooze_notification' });
    ninja.remove();
  });

  it('snoozes for a preset, a timestamp or until the next reply', async () => {
    const { dispatch } = mountHeader();
    emitter.emit(CMD_SNOOZE_NOTIFICATION, 'an_hour_from_now');
    await flushPromises();
    expect(snoozeCall(dispatch)[1]).toEqual({
      id: 9,
      snoozedUntil: expect.any(Number),
    });
    expect(useAlert).toHaveBeenCalledWith('INBOX.ALERTS.SNOOZE');

    dispatch.mockClear();
    emitter.emit(CMD_SNOOZE_NOTIFICATION, 1700000000);
    await flushPromises();
    expect(snoozeCall(dispatch)[1].snoozedUntil).toBe(1700000000);

    dispatch.mockClear();
    emitter.emit(CMD_SNOOZE_NOTIFICATION, 'until_next_reply');
    await flushPromises();
    expect(snoozeCall(dispatch)[1].snoozedUntil).toBe(null);
  });

  it('snoozes without an active notification and ignores failures', async () => {
    const { dispatch } = mountHeader({ activeNotification: null });
    dispatch.mockRejectedValue(new Error('down'));
    emitter.emit(CMD_SNOOZE_NOTIFICATION, 1700000000);
    await flushPromises();
    expect(snoozeCall(dispatch)[1].id).toBe(undefined);
    expect(useAlert).not.toHaveBeenCalled();
  });

  it('picks a custom snooze time from the modal', async () => {
    const { wrapper, dispatch } = mountHeader();
    emitter.emit(CMD_SNOOZE_NOTIFICATION, 'until_custom_time');
    await flushPromises();
    const modal = wrapper.findComponent(SnoozeModal);
    modal.vm.$emit('chooseTime', new Date('2026-11-01T00:00:00Z'));
    await flushPromises();
    expect(wrapper.find('.modal').exists()).toBe(false);
    expect(snoozeCall(dispatch)[1].snoozedUntil).toBe(1793491200);

    dispatch.mockClear();
    emitter.emit(CMD_SNOOZE_NOTIFICATION, 'until_custom_time');
    await flushPromises();
    wrapper.findComponent(SnoozeModal).vm.$emit('chooseTime', new Date(0));
    await flushPromises();
    expect(snoozeCall(dispatch)[1].snoozedUntil).toBe(null);

    dispatch.mockClear();
    emitter.emit(CMD_SNOOZE_NOTIFICATION, 'until_custom_time');
    await flushPromises();
    wrapper.findComponent(SnoozeModal).vm.$emit('chooseTime', null);
    await flushPromises();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('closes the custom snooze modal', async () => {
    const { wrapper } = mountHeader();
    emitter.emit(CMD_SNOOZE_NOTIFICATION, 'until_custom_time');
    await flushPromises();
    wrapper.findComponent(SnoozeModal).vm.$emit('close');
    await flushPromises();
    expect(wrapper.find('.modal').exists()).toBe(false);
    emitter.emit(CMD_SNOOZE_NOTIFICATION, 'until_custom_time');
    await flushPromises();
    wrapper.findComponent(Modal).vm.$emit('update:show', false);
    await flushPromises();
    expect(wrapper.find('.modal').exists()).toBe(false);
  });

  it('deletes the notification and returns to the list', async () => {
    const { wrapper, dispatch, router } = mountHeader();
    await button(wrapper, 'INBOX.ACTION_HEADER.DELETE').trigger('click');
    await flushPromises();
    expect(useTrack).toHaveBeenCalledWith(INBOX_EVENTS.DELETE_NOTIFICATION);
    expect(dispatch).toHaveBeenCalledWith('notifications/delete', {
      notification: { id: 9 },
      unread_count: 2,
      count: 5,
    });
    expect(useAlert).toHaveBeenCalledWith('INBOX.ALERTS.DELETE');
    expect(router.replace).toHaveBeenCalledWith({ name: 'inbox_view' });
    wrapper.vm.onClickGoToInboxList();
    expect(router.replace).toHaveBeenCalledTimes(2);
  });

  it('stops listening to the palette when unmounted', async () => {
    const { wrapper, dispatch } = mountHeader();
    wrapper.unmount();
    emitter.emit(CMD_SNOOZE_NOTIFICATION, 1700000000);
    await flushPromises();
    expect(dispatch).not.toHaveBeenCalled();
  });
});
