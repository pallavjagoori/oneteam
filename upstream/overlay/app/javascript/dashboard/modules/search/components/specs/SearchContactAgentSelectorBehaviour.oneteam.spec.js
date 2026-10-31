/**
 * OneTeam behaviour spec for the search page "from" filter, which picks
 * a contact (searched on the server) or an agent.
 *
 * Covers the button label for each kind of selection, opening and
 * closing the menu, searching contacts (including aborted and failed
 * searches and keeping the selected contact on top), filtering agents,
 * selecting and clearing, and resolving a contact id from the URL.
 */
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import Selector from '../SearchContactAgentSelector.vue';

const env = vi.hoisted(() => ({}));

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
    mounted: (_, binding) => {
      env.outside = binding.value;
    },
  },
}));
vi.mock('@chatwoot/utils', () => ({ debounce: fn => fn }));
vi.mock('dashboard/composables/store.js', () => ({
  useMapGetter: () => env.agents,
}));
vi.mock(
  'dashboard/components-next/NewConversation/helpers/composeConversationHelper',
  () => ({
    createContactSearcher:
      () =>
      (...args) =>
        env.search(...args),
  })
);
vi.mock('../../helpers/searchHelper', () => ({
  fetchContactDetails: id => env.fetchContact(id),
}));

const Button = {
  name: 'Button',
  props: ['label', 'variant'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};
const DropdownMenu = {
  name: 'DropdownMenu',
  props: ['menuSections', 'isSearching'],
  emits: ['search', 'action'],
  template: '<div class="menu" />',
};

const mountSelector = async (modelValue = null) => {
  const wrapper = mount(Selector, {
    props: {
      label: 'From',
      modelValue,
      'onUpdate:modelValue': value => wrapper.setProps({ modelValue: value }),
    },
    global: { stubs: { Button, DropdownMenu } },
  });
  await flushPromises();
  return wrapper;
};

const button = wrapper => wrapper.findComponent({ name: 'Button' });
const menu = wrapper => wrapper.findComponent({ name: 'DropdownMenu' });
const open = async wrapper => {
  await button(wrapper).trigger('click');
  await flushPromises();
};
const section = (wrapper, index) => menu(wrapper).props('menuSections')[index];

describe('SearchContactAgentSelector behaviour', () => {
  beforeEach(() => {
    env.agents = ref([
      { id: 1, name: 'Alice', avatar_url: 'a.png' },
      { id: 2, name: 'Bob', avatar_url: 'b.png' },
    ]);
    env.search = vi.fn(() =>
      Promise.resolve([
        { id: 7, name: 'Carol', email: 'c@x.test' },
        { id: 8, name: 'Dan', phone_number: '+1' },
      ])
    );
    env.fetchContact = vi.fn(() => Promise.resolve(null));
  });

  it('shows the plain label and opens the menu with agents', async () => {
    const wrapper = await mountSelector();
    expect(button(wrapper).text()).toBe('From');
    expect(button(wrapper).props('variant')).toBe('ghost');
    await open(wrapper);
    expect(button(wrapper).props('variant')).toBe('faded');
    expect(section(wrapper, 0)).toMatchObject({
      title: 'SEARCH.FILTERS.CONTACTS',
      items: [],
      isLoading: false,
    });
    expect(section(wrapper, 1).items).toEqual([
      {
        label: 'Alice',
        value: 'agent:1',
        action: 'select',
        type: 'agent',
        thumbnail: { name: 'Alice', src: 'a.png' },
        isSelected: false,
      },
      expect.objectContaining({ label: 'Bob', value: 'agent:2' }),
    ]);
    await open(wrapper);
    expect(menu(wrapper).exists()).toBe(false);
  });

  it('closes on an outside click', async () => {
    const wrapper = await mountSelector();
    await open(wrapper);
    env.outside();
    await flushPromises();
    expect(menu(wrapper).exists()).toBe(false);
  });

  it('copes with no agents loaded', async () => {
    env.agents = ref(null);
    const wrapper = await mountSelector('agent:1');
    expect(button(wrapper).text()).toBe('From: 1');
    await open(wrapper);
    expect(section(wrapper, 1).items).toEqual([]);
  });

  it('searches contacts and filters agents by the query', async () => {
    const wrapper = await mountSelector();
    await open(wrapper);
    menu(wrapper).vm.$emit('search', 'bo');
    await flushPromises();
    expect(env.search).toHaveBeenCalledWith('bo', { skipMinLength: true });
    expect(section(wrapper, 0).items.map(i => i.description)).toEqual([
      'c@x.test',
      '+1',
    ]);
    expect(section(wrapper, 1).items.map(i => i.label)).toEqual(['Bob']);
    expect(menu(wrapper).props('isSearching')).toBe(false);

    menu(wrapper).vm.$emit('search', '');
    await flushPromises();
    expect(section(wrapper, 0).items).toEqual([]);
    expect(section(wrapper, 1).items).toHaveLength(2);
  });

  it('keeps the spinner for an aborted search and stops it on errors', async () => {
    const wrapper = await mountSelector();
    await open(wrapper);
    env.search = vi.fn(() => Promise.resolve(null));
    menu(wrapper).vm.$emit('search', 'c');
    await flushPromises();
    expect(menu(wrapper).props('isSearching')).toBe(true);
    env.search = vi.fn(() => Promise.reject(new Error('x')));
    menu(wrapper).vm.$emit('search', 'ca');
    await flushPromises();
    expect(menu(wrapper).props('isSearching')).toBe(false);
  });

  it('selects a contact, keeps it on top of later searches and clears it', async () => {
    const wrapper = await mountSelector();
    await open(wrapper);
    menu(wrapper).vm.$emit('search', 'c');
    await flushPromises();
    menu(wrapper).vm.$emit('action', section(wrapper, 0).items[0]);
    await flushPromises();
    expect(wrapper.emitted('change')).toHaveLength(1);
    expect(wrapper.props('modelValue')).toBe('contact:7');
    expect(menu(wrapper).exists()).toBe(false);
    expect(button(wrapper).text()).toBe('From: Carol');
    expect(env.fetchContact).not.toHaveBeenCalled();

    await open(wrapper);
    expect(section(wrapper, 0).items.map(i => i.label)).toEqual(['Carol']);
    expect(section(wrapper, 0).items[0].isSelected).toBe(true);
    env.search = vi.fn(() =>
      Promise.resolve([
        { id: 7, name: 'Carol' },
        { id: 9, name: 'Eve' },
      ])
    );
    menu(wrapper).vm.$emit('search', 'e');
    expect(section(wrapper, 0).items.map(i => i.label)).toEqual(['Carol']);
    await flushPromises();
    expect(section(wrapper, 0).items.map(i => i.label)).toEqual([
      'Carol',
      'Eve',
    ]);
    menu(wrapper).vm.$emit('search', '');
    await flushPromises();
    expect(section(wrapper, 0).items.map(i => i.label)).toEqual(['Carol']);

    menu(wrapper).vm.$emit('action', section(wrapper, 0).items[0]);
    await flushPromises();
    expect(wrapper.props('modelValue')).toBe(null);
    expect(button(wrapper).text()).toBe('From');
  });

  it('selects an agent instead of a contact', async () => {
    const wrapper = await mountSelector();
    await open(wrapper);
    menu(wrapper).vm.$emit('search', 'c');
    await flushPromises();
    menu(wrapper).vm.$emit('action', section(wrapper, 0).items[0]);
    await flushPromises();
    await open(wrapper);
    menu(wrapper).vm.$emit('action', section(wrapper, 1).items[1]);
    await flushPromises();
    expect(wrapper.props('modelValue')).toBe('agent:2');
    expect(button(wrapper).text()).toBe('From: Bob');
    await open(wrapper);
    expect(section(wrapper, 0).items).toEqual([]);
  });

  it('labels a contact found in the search results', async () => {
    const wrapper = await mountSelector();
    await open(wrapper);
    menu(wrapper).vm.$emit('search', 'd');
    await flushPromises();
    await wrapper.setProps({ modelValue: 'contact:8' });
    await flushPromises();
    expect(button(wrapper).text()).toBe('From: Dan');
  });

  it('resolves a contact from the URL value', async () => {
    env.fetchContact = vi.fn(() =>
      Promise.resolve({ id: 7, name: 'Carol', thumbnail: 'c.png' })
    );
    const wrapper = await mountSelector('contact:7');
    expect(env.fetchContact).toHaveBeenCalledWith(7);
    expect(button(wrapper).text()).toBe('From: Carol');
    await open(wrapper);
    expect(section(wrapper, 0).items[0].thumbnail).toEqual({
      name: 'Carol',
      src: 'c.png',
    });
  });

  it('does not duplicate a resolved contact already in the results', async () => {
    const wrapper = await mountSelector();
    await open(wrapper);
    menu(wrapper).vm.$emit('search', 'c');
    await flushPromises();
    env.fetchContact = vi.fn(() => Promise.resolve({ id: 7, name: 'Carol' }));
    await wrapper.setProps({ modelValue: 'contact:7' });
    await flushPromises();
    expect(section(wrapper, 0).items.map(i => i.label)).toEqual([
      'Carol',
      'Dan',
    ]);
  });

  it('falls back to the id for unknown contacts and types', async () => {
    const wrapper = await mountSelector('contact:42');
    expect(env.fetchContact).toHaveBeenCalledWith(42);
    expect(button(wrapper).text()).toBe('From: 42');
    env.fetchContact.mockClear();
    await wrapper.setProps({ modelValue: 'agent:99' });
    expect(button(wrapper).text()).toBe('From: 99');
    await wrapper.setProps({ modelValue: 'team:3' });
    expect(button(wrapper).text()).toBe('From: 3');
    expect(env.fetchContact).not.toHaveBeenCalled();
  });
});
