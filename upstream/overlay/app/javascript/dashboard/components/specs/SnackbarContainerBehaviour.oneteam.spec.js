/**
 * OneTeam behaviour spec for the toast (snackbar) container.
 *
 * Covers showing toasts sent on the event bus (translated when asked),
 * re-opening the popover so it stays on top (and ignoring browsers
 * without popover support), removing each toast after the default or
 * its own duration, and ignoring toasts after unmount.
 */
import { mount } from '@vue/test-utils';
import { emitter } from 'shared/helpers/mitt';
import SnackbarContainer from '../SnackbarContainer.vue';

const WootSnackbar = {
  name: 'WootSnackbar',
  props: ['message', 'action'],
  template: '<p class="snack">{{ message }}</p>',
};

const mountContainer = () =>
  mount(SnackbarContainer, {
    props: { duration: 1000 },
    global: {
      stubs: {
        WootSnackbar,
        TransitionGroup: { template: '<div><slot /></div>' },
      },
    },
  });

const toast = async (wrapper, message, action) => {
  emitter.emit('newToastMessage', { message, action });
  await wrapper.vm.$nextTick();
  await wrapper.vm.$nextTick();
};
const texts = wrapper => wrapper.findAll('.snack').map(s => s.text());

describe('SnackbarContainer behaviour', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows toasts on top and removes them after their duration', async () => {
    const wrapper = mountContainer();
    const el = wrapper.element;
    let open = false;
    const realMatches = el.matches.bind(el);
    el.matches = vi.fn(selector =>
      selector === ':popover-open' ? open : realMatches(selector)
    );
    el.hidePopover = vi.fn();
    el.showPopover = vi.fn(() => {
      open = true;
    });

    await toast(wrapper, 'Saved');
    expect(texts(wrapper)).toEqual(['Saved']);
    expect(el.matches).toHaveBeenCalledWith(':popover-open');
    expect(el.hidePopover).not.toHaveBeenCalled();
    expect(el.showPopover).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5);
    await toast(wrapper, 'CONVERSATION.CHANGE_STATUS', {
      usei18n: true,
      duration: 3000,
    });
    expect(texts(wrapper)).toEqual(['Saved', 'CONVERSATION.CHANGE_STATUS']);
    expect(wrapper.findAllComponents(WootSnackbar)[1].props('action')).toEqual({
      usei18n: true,
      duration: 3000,
    });
    expect(el.hidePopover).toHaveBeenCalledTimes(1);
    expect(el.showPopover).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(1000);
    await wrapper.vm.$nextTick();
    expect(texts(wrapper)).toHaveLength(1);
    vi.advanceTimersByTime(2000);
    await wrapper.vm.$nextTick();
    expect(texts(wrapper)).toEqual([]);
    wrapper.unmount();
  });

  it('ignores missing popover support and stops listening on unmount', async () => {
    const wrapper = mountContainer();
    wrapper.element.showPopover = () => {
      throw new Error('popover not supported');
    };
    await toast(wrapper, 'Hello');
    expect(texts(wrapper)).toEqual(['Hello']);

    wrapper.unmount();
    expect(() =>
      emitter.emit('newToastMessage', { message: 'x' })
    ).not.toThrow();
  });
});
