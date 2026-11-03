/**
 * OneTeam behaviour spec for the contacts header "more" menu.
 *
 * Covers toggling the menu (and closing on an outside click), the add
 * item for everyone, export and import for managers, and emitting each
 * action (ignoring unknown ones).
 */
import { mount } from '@vue/test-utils';
import ContactMoreActions from '../ContactMoreActions.vue';

const env = vi.hoisted(() => ({ manager: true }));
let outside;

vi.mock('dashboard/composables/usePolicy', () => ({
  usePolicy: () => ({ checkPermissions: () => env.manager }),
}));

const DropdownMenu = {
  name: 'DropdownMenu',
  props: ['menuItems'],
  emits: ['action'],
  template: '<ul />',
};
const mountMenu = () =>
  mount(ContactMoreActions, {
    global: {
      stubs: {
        DropdownMenu,
        Button: {
          emits: ['click'],
          template: '<button @click="$emit(\'click\')" />',
        },
      },
      directives: {
        onClickaway: {
          mounted: (el, binding) => {
            outside = binding.value;
          },
        },
      },
    },
  });

describe('ContactMoreActions behaviour', () => {
  it('lists manager actions and emits them', async () => {
    env.manager = true;
    const wrapper = mountMenu();
    const button = wrapper.find('button');
    await button.trigger('click');
    expect(button.classes()).toContain('bg-n-alpha-2');
    const menu = wrapper.findComponent(DropdownMenu);
    expect(menu.props('menuItems').map(item => item.action)).toEqual([
      'add',
      'export',
      'import',
    ]);
    ['add', 'import', 'export', 'other'].forEach(action =>
      menu.vm.$emit('action', { action })
    );
    expect(Object.keys(wrapper.emitted())).toEqual(
      expect.arrayContaining(['add', 'import', 'export'])
    );
    expect(wrapper.emitted('other')).toBeUndefined();

    await button.trigger('click');
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);
    await button.trigger('click');
    outside();
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);
  });

  it('only offers add to other agents', async () => {
    env.manager = false;
    const wrapper = mountMenu();
    await wrapper.find('button').trigger('click');
    expect(wrapper.findComponent(DropdownMenu).props('menuItems')).toHaveLength(
      1
    );
  });
});
