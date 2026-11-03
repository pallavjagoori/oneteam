/**
 * OneTeam behaviour spec for the contacts page header.
 *
 * Covers the title and search box (and hiding it), searching, the filter
 * button with its active dot, saving filters as a segment, editing and
 * deleting a segment, hiding filter controls on label and active views,
 * passing sort changes and the add, import and export actions on, and the
 * new conversation button.
 */
import { mount } from '@vue/test-utils';
import ContactHeader from '../ContactHeader.vue';

const Button = {
  name: 'Button',
  props: ['icon', 'label'],
  emits: ['click'],
  template:
    '<button :class="icon" @click="$emit(\'click\')">{{ label }}<slot /></button>',
};
const Input = {
  name: 'Input',
  props: ['modelValue'],
  emits: ['input'],
  template:
    '<div><slot name="prefix" /><input :value="modelValue" @input="$emit(\'input\', $event)" /></div>',
};
const SortMenu = {
  name: 'ContactSortMenu',
  props: ['activeSort', 'activeOrdering'],
  emits: ['update:sort'],
  template: '<div />',
};
const MoreActions = {
  name: 'ContactMoreActions',
  emits: ['add', 'import', 'export'],
  template: '<div />',
};

const mountHeader = props =>
  mount(ContactHeader, {
    props: { headerTitle: 'Contacts', buttonLabel: 'Message', ...props },
    slots: { filter: '<span class="filter-slot" />' },
    global: {
      stubs: {
        Button,
        Input,
        Icon: { template: '<i class="search-icon" />' },
        ContactSortMenu: SortMenu,
        ContactMoreActions: MoreActions,
        ComposeConversation: { template: '<div><slot name="trigger" /></div>' },
      },
    },
  });

const has = (wrapper, icon) => wrapper.find(`button.${icon}`).exists();

describe('ContactHeader behaviour', () => {
  it('shows the title, searches and can hide the search', async () => {
    const wrapper = mountHeader({ searchValue: 'ja' });
    expect(wrapper.text()).toContain('Contacts');
    expect(wrapper.text()).toContain('Message');
    const input = wrapper.find('input');
    expect(input.element.value).toBe('ja');
    expect(wrapper.find('.search-icon').exists()).toBe(true);
    await input.setValue('jane');
    expect(wrapper.emitted('search').at(-1)).toEqual(['jane']);
    expect(mountHeader({ showSearch: false }).find('input').exists()).toBe(
      false
    );
  });

  it('filters and saves the filters as a segment', async () => {
    const plain = mountHeader();
    expect(plain.find('.rounded-full').exists()).toBe(false);
    expect(has(plain, 'i-lucide-save')).toBe(false);
    expect(plain.find('.filter-slot').exists()).toBe(true);

    const wrapper = mountHeader({ hasActiveFilters: true });
    expect(wrapper.find('.rounded-full').exists()).toBe(true);
    await wrapper.find('button.i-lucide-list-filter').trigger('click');
    await wrapper.find('button.i-lucide-save').trigger('click');
    expect(wrapper.emitted('filter')).toHaveLength(1);
    expect(wrapper.emitted('createSegment')).toHaveLength(1);
  });

  it('edits and deletes a segment', async () => {
    const wrapper = mountHeader({
      isSegmentsView: true,
      hasActiveFilters: true,
    });
    expect(wrapper.find('.rounded-full').exists()).toBe(false);
    expect(has(wrapper, 'i-lucide-save')).toBe(false);
    await wrapper.find('button.i-lucide-pen-line').trigger('click');
    await wrapper.find('button.i-lucide-trash').trigger('click');
    expect(wrapper.emitted('filter')).toHaveLength(1);
    expect(wrapper.emitted('deleteSegment')).toHaveLength(1);
  });

  it('hides filter controls on label and active views', () => {
    [{ isLabelView: true }, { isActiveView: true }].forEach(view => {
      const wrapper = mountHeader({
        ...view,
        isSegmentsView: true,
        hasActiveFilters: true,
      });
      expect(has(wrapper, 'i-lucide-pen-line')).toBe(false);
      expect(has(wrapper, 'i-lucide-trash')).toBe(false);
      expect(has(wrapper, 'i-lucide-save')).toBe(false);
    });
    const labelFilters = mountHeader({
      isLabelView: true,
      hasActiveFilters: true,
    });
    expect(has(labelFilters, 'i-lucide-save')).toBe(false);
  });

  it('passes sorting and contact actions on', async () => {
    const wrapper = mountHeader({ activeSort: 'name', activeOrdering: '-' });
    const sort = wrapper.findComponent(SortMenu);
    expect(sort.props()).toEqual({ activeSort: 'name', activeOrdering: '-' });
    await sort.vm.$emit('update:sort', { sort: 'email' });
    expect(wrapper.emitted('update:sort')).toEqual([[{ sort: 'email' }]]);

    const actions = wrapper.findComponent(MoreActions);
    await actions.vm.$emit('add');
    await actions.vm.$emit('import');
    await actions.vm.$emit('export');
    expect(wrapper.emitted('add')).toHaveLength(1);
    expect(wrapper.emitted('import')).toHaveLength(1);
    expect(wrapper.emitted('export')).toHaveLength(1);
  });
});
