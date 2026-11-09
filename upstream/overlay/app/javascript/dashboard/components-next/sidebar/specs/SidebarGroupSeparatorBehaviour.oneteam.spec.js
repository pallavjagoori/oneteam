/**
 * OneTeam behaviour spec for SidebarGroupSeparator.
 *
 * A collapsible separator emits `toggle` from both its row and its chevron
 * button, and forwards the sort menu's choice as `update-sort`.
 */
import { mount } from '@vue/test-utils';
import SidebarGroupSeparator from '../SidebarGroupSeparator.vue';

const SidebarSortMenu = {
  name: 'SidebarSortMenu',
  props: {
    activeSort: { type: String, default: '' },
    options: { type: Array, default: () => [] },
  },
  emits: ['sort'],
  template: '<div class="sort-menu" />',
};

const mountSeparator = props =>
  mount(SidebarGroupSeparator, {
    props: { label: 'Teams', ...props },
    global: { stubs: { SidebarSortMenu, Icon: true } },
  });

describe('SidebarGroupSeparator behaviour', () => {
  it('emits toggle from the row and the chevron when collapsible', async () => {
    const wrapper = mountSeparator({ collapsible: true, isExpanded: false });
    const [row, chevron] = wrapper.findAll('button');
    await row.trigger('click');
    await chevron.trigger('click');
    expect(wrapper.emitted('toggle')).toHaveLength(2);
    expect(chevron.attributes('aria-expanded')).toBe('false');
    expect(chevron.find('span').classes()).toContain('i-lucide-chevron-down');
  });

  it('forwards the picked sort and stays inert when not collapsible', async () => {
    const wrapper = mountSeparator({
      sortOptions: [{ key: 'name', label: 'Name' }],
      activeSort: 'name',
    });
    expect(wrapper.findAll('button')).toHaveLength(0);
    await wrapper.findComponent(SidebarSortMenu).vm.$emit('sort', 'created');
    expect(wrapper.emitted('update-sort')).toEqual([['created']]);
    expect(wrapper.findComponent(SidebarSortMenu).props('activeSort')).toBe(
      'name'
    );
  });
});
