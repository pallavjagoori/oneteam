/**
 * OneTeam behaviour spec for the context menu scroll lock.
 *
 * Covers locking the scroll of the injected list element while the
 * menu is open.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import ContextMenu from '../ContextMenu.vue';

describe('ContextMenu scroll lock', () => {
  it('locks the injected list element', async () => {
    const list = document.createElement('div');
    document.body.appendChild(list);
    const wrapper = mount(ContextMenu, {
      props: { x: 10, y: 20 },
      global: {
        provide: { contextMenuElementTarget: ref({ $el: list }) },
        stubs: { TeleportWithDirection: { template: '<div><slot /></div>' } },
      },
    });
    await wrapper.vm.$nextTick();
    expect(list.style.overflow).toBe('hidden');
    wrapper.unmount();
    list.remove();
  });
});
