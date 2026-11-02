/**
 * OneTeam behaviour spec for the offline / reconnecting banner.
 *
 * Covers going offline and back online, a dropped websocket keeping the
 * banner up when the browser comes back online, reconnecting on a
 * conversation or inbox route versus elsewhere, the "reconnected" banner
 * closing itself after two seconds, refreshing the page and closing the
 * banner by hand.
 */
import { mount } from '@vue/test-utils';
import NetworkNotification from '../NetworkNotification.vue';

const env = vi.hoisted(() => ({ listeners: {}, bus: {}, route: {} }));

vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  useEventListener: (name, handler) => {
    env.listeners[name] = handler;
  },
}));
vi.mock('dashboard/composables/emitter', () => ({
  useEmitter: (name, handler) => {
    env.bus[name] = handler;
  },
}));
vi.mock('vue-router', () => ({ useRoute: () => env.route }));
vi.mock('dashboard/helper/routeHelpers', () => ({
  isAConversationRoute: name => name === 'conversation',
  isAInboxViewRoute: name => name === 'inbox_view',
}));

const Button = {
  name: 'NextButton',
  props: ['icon'],
  emits: ['click'],
  template: '<button :data-icon="icon" @click="$emit(\'click\')" />',
};
const FluentIcon = { name: 'FluentIcon', props: ['icon'], template: '<i :data-icon="icon" />' };

const mountBanner = () =>
  mount(NetworkNotification, {
    global: { stubs: { NextButton: Button, Button, FluentIcon, transition: { template: '<div><slot /></div>' } } },
  });
const shown = wrapper =>
  !(wrapper.find('.fixed').attributes('style') || '').includes('display: none');
const text = wrapper => wrapper.find('span').text();

describe('Network notification behaviour', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    env.route = { name: 'conversation' };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows when offline and briefly confirms when back online', async () => {
    const wrapper = mountBanner();
    expect(shown(wrapper)).toBe(false);
    env.listeners.offline({ type: 'offline' });
    await wrapper.vm.$nextTick();
    expect(shown(wrapper)).toBe(true);
    expect(text(wrapper)).toBe('NETWORK.NOTIFICATION.OFFLINE');
    expect(wrapper.find('i').attributes('data-icon')).toBe('wifi-off');
    expect(wrapper.find('[data-icon="i-lucide-refresh-ccw"]').exists()).toBe(true);

    env.listeners.online({ type: 'online' });
    await wrapper.vm.$nextTick();
    expect(text(wrapper)).toBe('NETWORK.NOTIFICATION.RECONNECT_SUCCESS');
    expect(wrapper.find('i').attributes('data-icon')).toBe('wifi');
    expect(wrapper.find('[data-icon="i-lucide-refresh-ccw"]').exists()).toBe(false);
    vi.advanceTimersByTime(2000);
    await wrapper.vm.$nextTick();
    expect(shown(wrapper)).toBe(false);
  });

  it('keeps the banner while the websocket is down and reconnects on chat routes', async () => {
    const wrapper = mountBanner();
    env.bus.WEBSOCKET_DISCONNECT();
    env.listeners.online({ type: 'online' });
    env.listeners.online({ type: 'other' });
    await wrapper.vm.$nextTick();
    expect(text(wrapper)).toBe('NETWORK.NOTIFICATION.OFFLINE');

    env.bus.WEBSOCKET_RECONNECT();
    await wrapper.vm.$nextTick();
    expect(text(wrapper)).toBe('NETWORK.NOTIFICATION.RECONNECTING');
    expect(wrapper.find('[data-icon="i-lucide-refresh-ccw"]').exists()).toBe(false);
    env.bus.WEBSOCKET_RECONNECT_COMPLETED();
    await wrapper.vm.$nextTick();
    expect(text(wrapper)).toBe('NETWORK.NOTIFICATION.RECONNECT_SUCCESS');
    wrapper.unmount();
  });

  it('treats a reconnect elsewhere as already completed', async () => {
    env.route = { name: 'inbox_view' };
    let wrapper = mountBanner();
    env.bus.WEBSOCKET_RECONNECT();
    await wrapper.vm.$nextTick();
    expect(text(wrapper)).toBe('NETWORK.NOTIFICATION.RECONNECTING');

    env.route = { name: 'settings' };
    wrapper = mountBanner();
    env.bus.WEBSOCKET_RECONNECT();
    await wrapper.vm.$nextTick();
    expect(text(wrapper)).toBe('NETWORK.NOTIFICATION.RECONNECT_SUCCESS');
  });

  it('refreshes the page or closes the banner by hand', async () => {
    const reload = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { value: { reload }, configurable: true });
    const wrapper = mountBanner();
    env.listeners.offline({ type: 'offline' });
    await wrapper.vm.$nextTick();
    await wrapper.find('[data-icon="i-lucide-refresh-ccw"]').trigger('click');
    expect(reload).toHaveBeenCalled();
    await wrapper.find('[data-icon="i-lucide-x"]').trigger('click');
    expect(shown(wrapper)).toBe(false);
    Object.defineProperty(window, 'location', { value: original, configurable: true });
  });
});
