/**
 * OneTeam behaviour spec for the suspended account page.
 *
 * Covers showing the support bubble on mount and on widget messages,
 * opening the support widget, the billing link for admins on Chatwoot
 * Cloud only, and doing nothing when the support widget isn't loaded.
 */
import { mount } from '@vue/test-utils';
import { computed } from 'vue';
import Suspended from '../Index.vue';

const env = vi.hoisted(() => ({ admin: true, cloud: true }));

vi.mock('dashboard/composables/useAdmin', async () => {
  const { computed: c } = await import('vue');
  return { useAdmin: () => ({ isAdmin: c(() => env.admin) }) };
});
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => computed(() => env.cloud),
}));

const NextButton = {
  name: 'NextButton',
  props: ['label', 'icon'],
  emits: ['click'],
  template: '<button class="support" @click="$emit(\'click\')" />',
};
const EmptyState = { name: 'EmptyState', template: '<div><slot /></div>' };

/**
 * Mounts the page with stubbed layout and router link.
 *
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountPage = () =>
  mount(Suspended, {
    global: {
      stubs: {
        NextButton,
        EmptyState,
        RouterLink: { template: '<a class="billing"><slot /></a>' },
      },
      mocks: { $t: key => key },
    },
  });

describe('Suspended page behaviour', () => {
  let listeners;

  beforeEach(() => {
    env.admin = true;
    env.cloud = true;
    listeners = {};
    vi.spyOn(window, 'addEventListener').mockImplementation((name, fn) => {
      listeners[name] = fn;
    });
    window.$chatwoot = {
      toggleBubbleVisibility: vi.fn(),
      toggle: vi.fn(),
    };
  });

  afterEach(() => {
    delete window.$chatwoot;
  });

  it('shows the support bubble on mount and on widget messages', () => {
    mountPage();
    expect(window.$chatwoot.toggleBubbleVisibility).toHaveBeenCalledWith(
      'show'
    );
    listeners['chatwoot:on-message']();
    expect(window.$chatwoot.toggleBubbleVisibility).toHaveBeenCalledTimes(2);
  });

  it('opens the support widget and shows billing to cloud admins', async () => {
    const wrapper = mountPage();
    await wrapper.get('.support').trigger('click');
    expect(window.$chatwoot.toggle).toHaveBeenCalled();
    expect(wrapper.find('.billing').exists()).toBe(true);
  });

  it('hides billing for agents or self-hosted installs', () => {
    env.admin = false;
    expect(mountPage().find('.billing').exists()).toBe(false);
    env.admin = true;
    env.cloud = false;
    expect(mountPage().find('.billing').exists()).toBe(false);
  });

  it('does nothing when the support widget is not loaded', async () => {
    delete window.$chatwoot;
    const wrapper = mountPage();
    listeners['chatwoot:on-message']();
    await wrapper.get('.support').trigger('click');
    expect(window.$chatwoot).toBeUndefined();
  });
});
