/**
 * OneTeam behaviour spec for the floating dropdown menu and its context.
 *
 * Covers positioning the menu against its trigger, the missing-parent
 * error, and the teleport opt-in.
 */
import { h, ref } from 'vue';
import { mount } from '@vue/test-utils';
import DropdownFloating from '../DropdownFloating.vue';
import {
  useDropdownContext,
  provideDropdownContext,
  provideDropdownTeleport,
  useDropdownTeleport,
} from '../provider';

const env = vi.hoisted(() => ({ calls: [] }));

vi.mock('dashboard/composables/useDropdownPosition', async () => {
  const { computed } = await import('vue');
  return {
    useDropdownPosition: (...args) => {
      env.calls.push(args);
      return {
        fixedPosition: computed(() => ({
          class: 'fixed-menu',
          style: { top: '10px' },
        })),
      };
    },
  };
});

const TeleportWithDirection = {
  name: 'TeleportWithDirection',
  props: ['to'],
  template: '<div class="teleport"><slot /></div>',
};

describe('DropdownFloating behaviour', () => {
  it('positions the menu against its trigger', () => {
    const trigger = () => null;
    const wrapper = mount(DropdownFloating, {
      props: { trigger },
      slots: { default: '<ul class="menu" />' },
      global: { stubs: { TeleportWithDirection } },
    });
    expect(wrapper.getComponent(TeleportWithDirection).props('to')).toBe(
      'body'
    );
    const box = wrapper.get('[data-dropdown-menu]');
    expect(box.classes()).toContain('fixed-menu');
    expect(box.attributes('style')).toContain('top: 10px');
    expect(wrapper.find('.menu').exists()).toBe(true);
    const [passedTrigger, menuRef, isFixed, options] = env.calls.at(-1);
    expect(passedTrigger).toBe(trigger);
    expect(menuRef.value).toBe(box.element.firstElementChild);
    expect(isFixed).toBe(true);
    expect(options).toEqual({ align: 'start' });
  });
});

describe('dropdown provider behaviour', () => {
  /**
   * Mounts a child that reads the dropdown context under a parent.
   *
   * @param {Function} parentSetup Parent setup that may provide context.
   * @returns {object} What the child read.
   */
  const readContext = parentSetup => {
    const seen = {};
    const Child = {
      setup() {
        seen.teleport = useDropdownTeleport();
        try {
          seen.context = useDropdownContext();
        } catch (error) {
          seen.error = error.message;
        }
        return () => null;
      },
    };
    mount({
      setup() {
        parentSetup();
        return () => h(Child);
      },
    });
    return seen;
  };

  it('shares context and the teleport opt-in with children', () => {
    const context = { isOpen: ref(true) };
    const seen = readContext(() => {
      provideDropdownContext(context);
      provideDropdownTeleport();
    });
    expect(seen.context).toBe(context);
    expect(seen.teleport).toBe(true);
  });

  it('throws without a dropdown container', () => {
    const seen = readContext(() => {});
    expect(seen.error).toBe(
      'Component is missing a parent <DropdownContainer /> component.'
    );
    expect(seen.teleport).toBe(false);
  });
});
