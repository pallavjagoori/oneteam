/**
 * OneTeam behaviour spec for the auth app's toast container.
 *
 * Covers showing toasts from the event bus, removing each after the
 * default or its own duration, tolerating a toast that was already
 * removed, and ignoring toasts after unmount.
 */
import { mount } from '@vue/test-utils';
import { emitter } from 'shared/helpers/mitt';
import { BUS_EVENTS } from 'shared/constants/busEvents';
import Container from '../Container.vue';

const SnackbarItem = {
  name: 'SnackbarItem',
  props: ['message', 'action'],
  template: '<p class="toast">{{ message }}</p>',
};

const mountContainer = () =>
  mount(Container, {
    props: { duration: 1000 },
    global: {
      stubs: {
        SnackbarItem,
        TransitionGroup: { template: '<div><slot /></div>' },
      },
    },
  });

const toast = async (wrapper, message, action) => {
  emitter.emit(BUS_EVENTS.SHOW_TOAST, { message, action });
  await wrapper.vm.$nextTick();
};
const texts = wrapper => wrapper.findAll('.toast').map(t => t.text());

describe('v3 SnackBar Container behaviour', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows toasts and removes them after their duration', async () => {
    const wrapper = mountContainer();
    await toast(wrapper, 'Saved');
    vi.advanceTimersByTime(1);
    await toast(wrapper, 'Check your email', { duration: 3000 });
    expect(texts(wrapper)).toEqual(['Saved', 'Check your email']);
    expect(wrapper.findAllComponents(SnackbarItem)[1].props('action')).toEqual({
      duration: 3000,
    });

    vi.advanceTimersByTime(1000);
    await wrapper.vm.$nextTick();
    expect(texts(wrapper)).toEqual(['Check your email']);
    vi.advanceTimersByTime(2000);
    await wrapper.vm.$nextTick();
    expect(texts(wrapper)).toEqual([]);
    wrapper.unmount();
  });

  it('tolerates a toast that is already gone and stops on unmount', async () => {
    const wrapper = mountContainer();
    await toast(wrapper, 'Saved');
    wrapper.vm.snackbarAlertMessages = [];
    expect(() => vi.advanceTimersByTime(1000)).not.toThrow();

    wrapper.unmount();
    emitter.emit(BUS_EVENTS.SHOW_TOAST, { message: 'late' });
    expect(vi.getTimerCount()).toBe(0);
  });
});
