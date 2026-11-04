/**
 * OneTeam behaviour spec for Popover across the mobile breakpoint.
 *
 * Covers recalculating the desktop position when an open popover
 * leaves the mobile layout, and ignoring breakpoint changes while
 * closed or when entering mobile.
 */
import { mount } from '@vue/test-utils';
import Popover from '../Popover.vue';

const env = vi.hoisted(() => ({ belowMd: null, updatePosition: vi.fn() }));

vi.mock('@vueuse/core', async importOriginal => {
  const { ref: vueRef } = await import('vue');
  env.belowMd = vueRef(true);
  return {
    ...(await importOriginal()),
    useBreakpoints: () => ({ smaller: () => env.belowMd }),
    useEventListener: () => {},
  };
});
vi.mock('dashboard/composables/useDropdownPosition', async () => {
  const { ref: vueRef } = await import('vue');
  return {
    useDropdownPosition: () => ({
      fixedPosition: vueRef({ class: '', style: {} }),
      updatePosition: env.updatePosition,
    }),
  };
});
vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: () => {},
}));

/**
 * Mounts the popover with a trigger and content.
 *
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountPopover = () =>
  mount(Popover, {
    slots: {
      default: '<button class="trigger">Open</button>',
      content: '<p class="content">Body</p>',
    },
    global: {
      directives: { onClickOutside: {} },
      stubs: { TeleportWithDirection: { template: '<div><slot /></div>' } },
    },
  });

describe('Popover breakpoint behaviour', () => {
  beforeEach(() => {
    env.belowMd.value = true;
  });

  it('repositions when an open popover leaves the mobile layout', async () => {
    const wrapper = mountPopover();
    await wrapper.vm.show();
    expect(env.updatePosition).not.toHaveBeenCalled();
    expect(wrapper.find('[data-popover-backdrop]').exists()).toBe(true);
    env.belowMd.value = false;
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    expect(env.updatePosition).toHaveBeenCalled();
    env.updatePosition.mockClear();
    env.belowMd.value = true;
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    expect(env.updatePosition).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('ignores breakpoint changes while closed', async () => {
    mountPopover();
    env.belowMd.value = false;
    await Promise.resolve();
    await Promise.resolve();
    expect(env.updatePosition).not.toHaveBeenCalled();
  });
});
