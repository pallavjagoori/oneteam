/**
 * OneTeam behaviour spec for the bulk "change status" menu on the
 * conversation list.
 *
 * Covers toggling the menu, the resolve, reopen and snooze options (each
 * can be hidden), emitting the chosen status and closing, opening the
 * command bar's snooze picker for "snooze until" (also when the command
 * bar is missing), and closing on an outside click.
 */
import { mount } from '@vue/test-utils';
import BulkUpdateActions from '../BulkUpdateActions.vue';

const env = vi.hoisted(() => ({ outside: null }));

vi.mock('@vueuse/core', async importOriginal => {
  const { ref: appRef } = await import('vue');
  return {
    ...(await importOriginal()),
    useToggle: initial => {
      const state = appRef(initial);
      const toggle = value => {
        state.value = typeof value === 'boolean' ? value : !state.value;
      };
      return [state, toggle];
    },
  };
});
vi.mock('@vueuse/components', () => ({
  vOnClickOutside: {
    mounted: (el, binding) => {
      [env.outside] = binding.value;
    },
  },
}));

const Button = {
  name: 'Button',
  emits: ['click'],
  template: '<button class="toggle" @click="$emit(\'click\')" />',
};
const DropdownMenu = {
  name: 'DropdownMenu',
  props: ['menuItems'],
  emits: ['action'],
  template: '<ul class="menu" />',
};

const mountMenu = props =>
  mount(BulkUpdateActions, {
    props,
    global: {
      stubs: {
        Button,
        NextButton: Button,
        DropdownMenu,
        Transition: { template: '<div><slot /></div>' },
      },
    },
  });

const open = async wrapper => {
  await wrapper.find('.toggle').trigger('click');
  return wrapper.findComponent(DropdownMenu);
};

describe('BulkUpdateActions behaviour', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('lists every status and emits the chosen one', async () => {
    const wrapper = mountMenu();
    expect(wrapper.find('.menu').exists()).toBe(false);
    const menu = await open(wrapper);
    expect(wrapper.find('.toggle').classes()).toContain('bg-n-alpha-2');
    expect(menu.props('menuItems').map(i => i.value)).toEqual([
      'resolved',
      'open',
      'snoozed',
    ]);
    await menu.vm.$emit('action', { value: 'resolved' });
    expect(wrapper.emitted('update')[0]).toEqual(['resolved']);
    expect(wrapper.find('.menu').exists()).toBe(false);

    await open(wrapper);
    await wrapper.find('.toggle').trigger('click');
    expect(wrapper.find('.menu').exists()).toBe(false);
  });

  it('opens the command bar snooze picker', async () => {
    const ninja = document.createElement('ninja-keys');
    ninja.open = vi.fn();
    document.body.appendChild(ninja);
    const wrapper = mountMenu();
    await (await open(wrapper)).vm.$emit('action', { value: 'snoozed' });
    expect(ninja.open).toHaveBeenCalledWith({
      parent: 'bulk_action_snooze_conversation',
    });
    expect(wrapper.emitted('update')).toBeUndefined();

    ninja.remove();
    await (await open(wrapper)).vm.$emit('action', { value: 'snoozed' });
    expect(wrapper.find('.menu').exists()).toBe(false);
  });

  it('hides options and closes on an outside click', async () => {
    const wrapper = mountMenu({
      showResolve: false,
      showReopen: false,
      showSnooze: false,
    });
    const menu = await open(wrapper);
    expect(menu.props('menuItems')).toEqual([]);
    env.outside();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.menu').exists()).toBe(false);
  });
});
