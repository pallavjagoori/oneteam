/**
 * OneTeam behaviour spec for the conversation contact sidebar.
 *
 * Covers showing the contact panel when the sidebar setting is open,
 * hiding it otherwise, and closing it on outside clicks on small
 * screens only.
 */
import { mount } from '@vue/test-utils';
import ConversationSidebar from '../ConversationSidebar.vue';

const env = vi.hoisted(() => ({
  settings: {},
  update: vi.fn(),
  width: 500,
  outside: null,
}));

vi.mock('dashboard/composables/useUISettings', async () => {
  const { ref: appRef } = await import('vue');
  return {
    useUISettings: () => ({
      uiSettings: appRef(env.settings),
      updateUISettings: env.update,
    }),
  };
});
vi.mock('@vueuse/core', async importOriginal => {
  const { ref: appRef } = await import('vue');
  return {
    ...(await importOriginal()),
    useWindowSize: () => ({ width: appRef(env.width) }),
  };
});
vi.mock('@vueuse/components', () => ({
  vOnClickOutside: {
    mounted: (el, binding) => {
      [env.outside] = binding.value;
    },
  },
}));

/**
 * Mounts the sidebar.
 *
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountSidebar = () =>
  mount(ConversationSidebar, {
    props: { currentChat: { id: 3, inbox_id: 4 } },
    global: {
      stubs: {
        ContactPanel: {
          name: 'ContactPanel',
          props: ['conversationId', 'inboxId'],
          template: '<div class="panel" />',
        },
      },
    },
  });

describe('ConversationSidebar behaviour', () => {
  it('shows the panel and closes it outside on small screens', () => {
    env.settings = { is_contact_sidebar_open: true };
    env.width = 500;
    const wrapper = mountSidebar();
    expect(wrapper.classes()).toContain('md:flex');
    expect(wrapper.findComponent({ name: 'ContactPanel' }).props()).toEqual({
      conversationId: 3,
      inboxId: 4,
    });
    env.outside();
    expect(env.update).toHaveBeenCalledWith({
      is_contact_sidebar_open: false,
      is_copilot_panel_open: false,
    });
  });

  it('keeps the panel on large screens and hides it when closed', () => {
    env.settings = { is_contact_sidebar_open: true };
    env.width = 1400;
    mountSidebar();
    env.outside();
    env.settings = {};
    env.width = 500;
    const wrapper = mountSidebar();
    expect(wrapper.classes()).toContain('md:hidden');
    env.outside();
    expect(env.update).not.toHaveBeenCalled();
  });
});
