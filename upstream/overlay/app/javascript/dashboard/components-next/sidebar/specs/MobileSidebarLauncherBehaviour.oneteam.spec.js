/**
 * OneTeam behaviour spec for the mobile sidebar launcher.
 *
 * Covers hiding it on conversation screens, sliding it with the open
 * sidebar, and toggling the sidebar.
 */
import { mount } from '@vue/test-utils';
import MobileSidebarLauncher from '../MobileSidebarLauncher.vue';

const env = vi.hoisted(() => ({ routeName: 'home' }));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ name: env.routeName }),
}));

const Button = {
  name: 'Button',
  emits: ['click'],
  template: '<button @click="$emit(\'click\')" />',
};
const ButtonGroup = { name: 'ButtonGroup', template: '<div><slot /></div>' };

/**
 * Mounts the launcher.
 *
 * @param {object} props Launcher props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountLauncher = props =>
  mount(MobileSidebarLauncher, {
    props,
    global: { stubs: { Button, ButtonGroup } },
  });

describe('MobileSidebarLauncher behaviour', () => {
  it('toggles the sidebar and slides while it is open', async () => {
    env.routeName = 'home';
    const wrapper = mountLauncher({ isMobileSidebarOpen: true });
    expect(wrapper.get('#mobile-sidebar-launcher').classes()).toContain(
      'ltr:translate-x-48'
    );
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('toggle')).toHaveLength(1);
    expect(
      mountLauncher().get('#mobile-sidebar-launcher').classes()
    ).not.toContain('ltr:translate-x-48');
  });

  it('hides on conversation screens', () => {
    env.routeName = 'inbox_conversation';
    expect(mountLauncher().find('#mobile-sidebar-launcher').exists()).toBe(
      false
    );
  });
});
