/**
 * OneTeam behaviour spec for the dropdown menu DropdownContainer.
 *
 * Covers toggling from the trigger slot, the inline and teleported
 * menus, and closing on outside clicks only while open.
 */
import { mount } from '@vue/test-utils';
import DropdownContainer from '../DropdownContainer.vue';

const env = vi.hoisted(() => ({ outside: null, teleport: false }));

vi.mock('@vueuse/components', () => ({
  vOnClickOutside: {
    mounted: (el, binding) => {
      env.outside = binding.value;
    },
  },
}));

vi.mock('@vueuse/core', async importOriginal => {
  const { ref: vueRef } = await import('vue');
  return {
    ...(await importOriginal()),
    useToggle: () => {
      const state = vueRef(false);
      return [
        state,
        value => {
          state.value = typeof value === 'boolean' ? value : !state.value;
        },
      ];
    },
  };
});

vi.mock('../provider.js', async importOriginal => ({
  ...(await importOriginal()),
  useDropdownTeleport: () => env.teleport,
}));

const FloatingStub = {
  name: 'DropdownFloating',
  props: ['trigger'],
  template: '<div class="floating"><slot /></div>',
};

/**
 * Mounts the container with a trigger button and a menu.
 *
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountContainer = () =>
  mount(DropdownContainer, {
    slots: {
      trigger: `<template #trigger="{ toggle }">
        <button class="trigger" @click="toggle">Open</button>
      </template>`,
      default: '<p class="menu">Menu</p>',
    },
    global: { stubs: { DropdownFloating: FloatingStub } },
  });

describe('DropdownContainer behaviour', () => {
  beforeEach(() => {
    env.teleport = false;
  });

  it('ignores outside clicks while closed', () => {
    const wrapper = mountContainer();
    const [closeMenu, options] = env.outside;
    expect(options.ignore).toEqual(['[data-dropdown-menu]']);
    closeMenu();
    expect(wrapper.emitted('close')).toBeUndefined();
  });

  it('opens inline and closes on an outside click', async () => {
    const wrapper = mountContainer();
    await wrapper.find('.trigger').trigger('click');
    expect(wrapper.find('.absolute .menu').exists()).toBe(true);
    env.outside[0]();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('close')).toHaveLength(1);
    expect(wrapper.find('.menu').exists()).toBe(false);
  });

  it('teleports the menu and resolves the trigger element', async () => {
    env.teleport = true;
    const wrapper = mountContainer();
    await wrapper.find('.trigger').trigger('click');
    const floating = wrapper.findComponent(FloatingStub);
    expect(floating.find('.menu').exists()).toBe(true);
    expect(floating.props('trigger')()).toBe(wrapper.find('.trigger').element);
    wrapper.unmount();
    expect(floating.props('trigger')()).toBeNull();
  });
});
