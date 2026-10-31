/**
 * OneTeam behaviour spec for the calls page filter bar.
 *
 * Covers the "all calls" heading with and without a count, the active
 * activity chip (with count, clearing it) and the quick chips, the
 * "other activity", assignee and "more filters" (inbox) dropdowns
 * staying mutually exclusive, closing on outside clicks, the selected
 * assignee avatar and label, and the highlighted states.
 */
import { mount } from '@vue/test-utils';
import CallsFilterBar from '../CallsFilterBar.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({
    t: (key, params) => (params ? `${key}:${params.count}` : key),
  }),
}));

const Button = {
  name: 'Button',
  props: ['label', 'icon', 'color'],
  emits: ['click'],
  template:
    '<button :data-icon="icon" @click="$emit(\'click\', $event)"><slot name="icon" />{{ label }}<slot /></button>',
};
const DropdownMenu = {
  name: 'DropdownMenu',
  props: ['menuItems', 'menuSections', 'showSearch'],
  emits: ['action'],
  template: '<div class="menu" />',
};
const OnClickOutside = {
  name: 'OnClickOutside',
  emits: ['trigger'],
  template: '<div class="outside"><slot /></div>',
};
const Avatar = {
  name: 'Avatar',
  props: ['src', 'name', 'size'],
  template: '<i class="avatar" />',
};

const agents = [
  { id: 7, name: 'Ana', thumbnail: 'ana.png' },
  { id: 8, name: 'Bo', thumbnail: '' },
];
const inboxes = [{ id: 3, name: 'Phone' }];

const mountBar = props =>
  mount(CallsFilterBar, {
    props: { agents, inboxes, ...props },
    global: {
      stubs: { Button, DropdownMenu, OnClickOutside, Avatar, Icon: true },
    },
  });
const byIcon = (wrapper, icon) =>
  wrapper.findAllComponents(Button).find(b => b.props('icon') === icon);
const menu = wrapper => wrapper.findComponent(DropdownMenu);

describe('CallsFilterBar behaviour', () => {
  it('shows the all calls heading with and without a count', () => {
    expect(mountBar().text()).toContain('CALLS_PAGE.ALL_CALLS');
    expect(mountBar({ totalCount: 12 }).text()).toContain(
      'CALLS_PAGE.ALL_CALLS_COUNT:12'
    );
  });

  it('picks a quick chip', async () => {
    const wrapper = mountBar();
    expect(
      wrapper
        .findAllComponents(Button)
        .map(b => b.props('label'))
        .filter(Boolean)
    ).toEqual(['CALLS_PAGE.FILTERS.MISSED', 'CALLS_PAGE.FILTERS.NO_REPLY']);
    await byIcon(wrapper, 'i-lucide-phone-missed').trigger('click');
    expect(wrapper.emitted('update:activity')).toEqual([['missed']]);
  });

  it('shows the active chip with its count and clears it', async () => {
    const wrapper = mountBar({ activity: 'missed', totalCount: 4 });
    const chip = byIcon(wrapper, 'i-lucide-phone-missed');
    expect(chip.text()).toContain('CALLS_PAGE.FILTERS.MISSED (4)');
    expect(byIcon(wrapper, 'i-lucide-phone-outgoing').props('label')).toBe(
      'CALLS_PAGE.FILTERS.NO_REPLY'
    );
    await chip.trigger('click');
    expect(wrapper.emitted('update:activity')).toEqual([[null]]);
    expect(mountBar({ activity: 'missed' }).text()).toContain(
      'CALLS_PAGE.FILTERS.MISSED'
    );
  });

  it('picks another activity from its dropdown', async () => {
    const wrapper = mountBar({ activity: 'incoming' });
    const toggle = byIcon(wrapper, 'i-lucide-phone');
    expect(toggle.classes()).toContain('text-n-slate-12');
    await toggle.trigger('click');
    expect(
      menu(wrapper)
        .props('menuItems')
        .map(i => i.isSelected)
    ).toEqual([true, false, false]);
    menu(wrapper).vm.$emit('action', { value: 'outgoing' });
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:activity')).toEqual([['outgoing']]);
    expect(menu(wrapper).exists()).toBe(false);
    expect(byIcon(mountBar(), 'i-lucide-phone').classes()).toContain(
      'text-n-slate-11'
    );
  });

  it('keeps one dropdown open at a time and closes on outside clicks', async () => {
    const wrapper = mountBar({ showAssignee: true });
    const outsides = wrapper.findAllComponents(OnClickOutside);
    await byIcon(wrapper, 'i-lucide-phone').trigger('click');
    await byIcon(wrapper, 'i-woot-empty-assignee').trigger('click');
    expect(wrapper.findAllComponents(DropdownMenu)).toHaveLength(1);
    expect(menu(wrapper).props('showSearch')).toBe('');
    outsides[0].vm.$emit('trigger');
    await wrapper.vm.$nextTick();
    expect(menu(wrapper).exists()).toBe(true);
    outsides[1].vm.$emit('trigger');
    await wrapper.vm.$nextTick();
    expect(menu(wrapper).exists()).toBe(false);
    await byIcon(wrapper, 'i-lucide-list-filter').trigger('click');
    await byIcon(wrapper, 'i-lucide-list-filter').trigger('click');
    expect(menu(wrapper).exists()).toBe(false);
  });

  it('hides the assignee filter for self-scoped viewers', () => {
    expect(byIcon(mountBar(), 'i-woot-empty-assignee')).toBe(undefined);
  });

  it('picks an assignee and shows the selection', async () => {
    const wrapper = mountBar({ showAssignee: true });
    const toggle = byIcon(wrapper, 'i-woot-empty-assignee');
    expect(toggle.text()).toContain('CALLS_PAGE.FILTERS.ASSIGNEE');
    expect(toggle.classes()).toContain('text-n-slate-11');
    await toggle.trigger('click');
    const items = menu(wrapper).props('menuItems');
    expect(items.map(i => [i.label, i.isSelected])).toEqual([
      ['CALLS_PAGE.FILTERS.ALL_ASSIGNEES', true],
      ['Ana', false],
      ['Bo', false],
    ]);
    expect(items[1].thumbnail).toEqual({ name: 'Ana', src: 'ana.png' });
    menu(wrapper).vm.$emit('action', { value: 7 });
    expect(wrapper.emitted('update:assigneeId')).toEqual([[7]]);

    const selected = mountBar({ showAssignee: true, assigneeId: 8 });
    const chosen = byIcon(selected, 'i-woot-empty-assignee');
    expect(chosen.text()).toContain('Bo');
    expect(chosen.classes()).toContain('text-n-slate-12');
    expect(selected.findComponent(Avatar).props('name')).toBe('Bo');
    await chosen.trigger('click');
    expect(menu(selected).props('menuItems')[2].isSelected).toBe(true);
  });

  it('filters by inbox from the more filters menu', async () => {
    const wrapper = mountBar();
    const toggle = byIcon(wrapper, 'i-lucide-list-filter');
    expect(toggle.props('color')).toBe('slate');
    await toggle.trigger('click');
    const [section] = menu(wrapper).props('menuSections');
    expect(section.title).toBe('CALLS_PAGE.FILTERS.INBOX');
    expect(section.items.map(i => [i.label, i.isSelected])).toEqual([
      ['CALLS_PAGE.FILTERS.ALL_INBOXES', true],
      ['Phone', false],
    ]);
    menu(wrapper).vm.$emit('action', { action: 'other', value: 1 });
    expect(wrapper.emitted('update:inboxId')).toBeUndefined();
    await toggle.trigger('click');
    menu(wrapper).vm.$emit('action', { action: 'inbox', value: 3 });
    expect(wrapper.emitted('update:inboxId')).toEqual([[3]]);

    const filtered = mountBar({ inboxId: 3 });
    const active = byIcon(filtered, 'i-lucide-list-filter');
    expect(active.props('color')).toBe('blue');
    await active.trigger('click');
    expect(menu(filtered).props('menuSections')[0].items[1].isSelected).toBe(
      true
    );
  });
});
