/**
 * OneTeam behaviour spec for the inbox filter on the search page.
 *
 * Covers the button label (no inbox, a known inbox, an unknown id),
 * opening the dropdown with a cleared search, listing inboxes with the
 * selected one marked, filtering by search text, selecting and
 * unselecting an inbox (closing the menu and emitting change), and
 * closing on an outside click.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import SearchInboxSelector from '../SearchInboxSelector.vue';

const inboxes = ref([]);
let outside;

vi.mock('@vueuse/core', async importOriginal => {
  const { ref: appRef } = await import('vue');
  return {
    ...(await importOriginal()),
    useToggle: () => {
      const state = appRef(false);
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
      outside = binding.value;
    },
  },
}));
vi.mock('dashboard/composables/store.js', () => ({
  useMapGetter: () => inboxes,
}));

const Button = {
  name: 'Button',
  props: ['label', 'variant'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};
const DropdownMenu = {
  name: 'DropdownMenu',
  props: ['menuSections'],
  emits: ['search', 'action'],
  template: '<div class="menu" />',
};

const mountSelector = (modelValue = null) =>
  mount(SearchInboxSelector, {
    props: {
      label: 'Inbox',
      modelValue,
      'onUpdate:modelValue': value =>
        wrapperRef.setProps({ modelValue: value }),
    },
    global: { stubs: { Button, DropdownMenu } },
  });
let wrapperRef;

const items = wrapper =>
  wrapper.findComponent(DropdownMenu).props('menuSections')[0].items;

describe('SearchInboxSelector behaviour', () => {
  beforeEach(() => {
    inboxes.value = [
      { id: 1, name: 'Email', avatar_url: 'e.png' },
      { id: 2, name: 'Website' },
    ];
  });

  it('labels the button with the selection', async () => {
    wrapperRef = mountSelector();
    expect(wrapperRef.find('button').text()).toBe('Inbox');
    await wrapperRef.setProps({ modelValue: 2 });
    expect(wrapperRef.find('button').text()).toBe('Inbox: Website');
    await wrapperRef.setProps({ modelValue: 9 });
    expect(wrapperRef.find('button').text()).toBe('Inbox: 9');
    inboxes.value = null;
    await wrapperRef.vm.$nextTick();
    expect(wrapperRef.find('button').text()).toBe('Inbox: 9');
  });

  it('lists, searches and selects inboxes', async () => {
    wrapperRef = mountSelector(1);
    await wrapperRef.find('button').trigger('click');
    const menu = wrapperRef.findComponent(DropdownMenu);
    expect(menu.props('menuSections')[0]).toMatchObject({
      title: 'SEARCH.FILTERS.INBOXES',
      emptyState: 'SEARCH.FILTERS.NO_INBOXES',
    });
    expect(items(wrapperRef)).toEqual([
      {
        label: 'Email',
        value: 1,
        action: 'select',
        type: 'inbox',
        thumbnail: { name: 'Email', src: 'e.png' },
        isSelected: true,
      },
      {
        label: 'Website',
        value: 2,
        action: 'select',
        type: 'inbox',
        thumbnail: { name: 'Website', src: undefined },
        isSelected: false,
      },
    ]);

    await menu.vm.$emit('search', 'WEB');
    expect(items(wrapperRef).map(i => i.value)).toEqual([2]);

    await menu.vm.$emit('action', { value: 2 });
    expect(wrapperRef.props('modelValue')).toBe(2);
    expect(wrapperRef.emitted('change')).toHaveLength(1);
    expect(wrapperRef.findComponent(DropdownMenu).exists()).toBe(false);

    await wrapperRef.find('button').trigger('click');
    expect(items(wrapperRef)).toHaveLength(2);
    await wrapperRef
      .findComponent(DropdownMenu)
      .vm.$emit('action', { value: 2 });
    expect(wrapperRef.props('modelValue')).toBe(null);
  });

  it('closes on a second click or an outside click', async () => {
    wrapperRef = mountSelector();
    const button = wrapperRef.find('button');
    await button.trigger('click');
    await button.trigger('click');
    expect(wrapperRef.findComponent(DropdownMenu).exists()).toBe(false);
    await button.trigger('click');
    outside();
    await wrapperRef.vm.$nextTick();
    expect(wrapperRef.findComponent(DropdownMenu).exists()).toBe(false);
  });
});
