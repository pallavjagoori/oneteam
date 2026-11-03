/**
 * OneTeam behaviour spec for the inbox InboxContextMenu.
 *
 * Covers positioning, closing the menu and selecting an action.
 */
import { mount } from '@vue/test-utils';
import InboxContextMenu from '../InboxContextMenu.vue';

const ContextMenuStub = {
  name: 'ContextMenu',
  props: ['x', 'y'],
  emits: ['close'],
  template: '<div><slot /></div>',
};

/**
 * Mounts the menu.
 *
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountMenu = () =>
  mount(InboxContextMenu, {
    props: {
      contextMenuPosition: { x: 10, y: 20 },
      menuItems: [
        { key: 'delete', label: 'Delete' },
        { key: 'read', label: 'Read' },
      ],
    },
    global: {
      stubs: {
        ContextMenu: ContextMenuStub,
        MenuItem: {
          props: ['option'],
          emits: ['click'],
          template:
            '<button @click="$emit(\'click\', $event)">{{ option.label }}</button>',
        },
      },
    },
  });

describe('InboxContextMenu behaviour', () => {
  it('positions the menu and closes it', () => {
    const wrapper = mountMenu();
    const menu = wrapper.findComponent(ContextMenuStub);
    expect(menu.props()).toEqual({ x: 10, y: 20 });
    menu.vm.$emit('close');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('selects an action and closes', async () => {
    const wrapper = mountMenu();
    await wrapper.findAll('button')[1].trigger('click');
    expect(wrapper.emitted('selectAction')).toEqual([['read']]);
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
