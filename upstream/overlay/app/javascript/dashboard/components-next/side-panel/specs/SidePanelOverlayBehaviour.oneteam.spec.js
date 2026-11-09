/**
 * OneTeam behaviour spec for the side panel overlay.
 *
 * Covers closing on an overlay click, and staying open when outside
 * clicks are disabled.
 */
import { mount } from '@vue/test-utils';
import SidePanel from '../SidePanel.vue';

/**
 * Mounts and opens the panel.
 *
 * @param {boolean} closeOnClickOutside whether outside clicks close it
 * @returns {Promise<import('@vue/test-utils').VueWrapper>}
 */
const openPanel = async closeOnClickOutside => {
  const wrapper = mount(SidePanel, {
    props: { title: 'Panel', closeOnClickOutside },
    global: {
      stubs: {
        TeleportWithDirection: { template: '<div><slot /></div>' },
        Transition: { template: '<div><slot /></div>' },
        Button: true,
      },
    },
  });
  wrapper.vm.open();
  await wrapper.vm.$nextTick();
  return wrapper;
};

describe('SidePanel overlay', () => {
  it('closes on an overlay click', async () => {
    const wrapper = await openPanel(true);
    await wrapper.find('[role="presentation"]').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
    wrapper.unmount();
  });

  it('stays open when outside clicks are disabled', async () => {
    const wrapper = await openPanel(false);
    await wrapper.find('[role="presentation"]').trigger('click');
    expect(wrapper.emitted('close')).toBeUndefined();
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
    wrapper.unmount();
  });
});
