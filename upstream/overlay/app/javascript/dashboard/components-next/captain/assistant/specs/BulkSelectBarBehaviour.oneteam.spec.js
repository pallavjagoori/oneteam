/**
 * OneTeam behaviour spec for the Captain bulk selection bar.
 *
 * Covers the default actions when nothing is selected, the labels and
 * the select-all checkbox (checked, indeterminate or clear for the items
 * on screen), selecting and clearing only the visible items while
 * keeping other selections, doing nothing with no visible items, the
 * default delete button, and the custom action slots.
 */
import { mount } from '@vue/test-utils';
import BulkSelectBar from '../BulkSelectBar.vue';

const Checkbox = {
  name: 'Checkbox',
  props: ['modelValue', 'indeterminate'],
  emits: ['update:modelValue'],
  template: '<input type="checkbox" class="all" />',
};
const Button = {
  name: 'Button',
  props: ['label'],
  emits: ['click'],
  template:
    '<button class="delete" @click="$emit(\'click\')">{{ label }}</button>',
};

const items = [{ id: 1 }, { id: 2 }, { id: 3 }];

const mountBar = (selected, props = {}, slots = {}) => {
  const wrapper = mount(BulkSelectBar, {
    props: {
      allItems: items,
      modelValue: new Set(selected),
      'onUpdate:modelValue': value => wrapper.setProps({ modelValue: value }),
      selectAllLabel: 'Select all',
      selectedCountLabel: '2 selected',
      ...props,
    },
    slots,
    global: {
      stubs: {
        Checkbox,
        Button,
        NextButton: Button,
        transition: { template: '<div><slot /></div>' },
      },
    },
  });
  return wrapper;
};

const checkbox = wrapper => wrapper.findComponent(Checkbox);
const selection = wrapper => [
  ...wrapper.emitted('update:modelValue').at(-1)[0],
];

describe('BulkSelectBar behaviour', () => {
  it('shows default actions with nothing selected', () => {
    const wrapper = mountBar(
      [],
      {},
      { 'default-actions': '<span class="filters" />' }
    );
    expect(wrapper.find('.filters').exists()).toBe(true);
    expect(checkbox(wrapper).exists()).toBe(false);
  });

  it('selects and clears the visible items', async () => {
    const wrapper = mountBar([2, 9]);
    expect(wrapper.text()).toContain('Select all');
    expect(wrapper.text()).toContain('2 selected');
    expect(checkbox(wrapper).props()).toEqual({
      modelValue: false,
      indeterminate: true,
    });

    await checkbox(wrapper).vm.$emit('update:modelValue', true);
    expect(selection(wrapper)).toEqual([2, 9, 1, 3]);
    expect(checkbox(wrapper).props()).toEqual({
      modelValue: true,
      indeterminate: false,
    });

    await checkbox(wrapper).vm.$emit('update:modelValue', false);
    expect(selection(wrapper)).toEqual([9]);
    expect(checkbox(wrapper).props()).toEqual({
      modelValue: false,
      indeterminate: false,
    });
  });

  it('does nothing without visible items', async () => {
    const wrapper = mountBar([9], { allItems: [] });
    expect(checkbox(wrapper).props('modelValue')).toBe(false);
    await checkbox(wrapper).vm.$emit('update:modelValue', true);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('deletes by default or uses custom actions', async () => {
    const wrapper = mountBar([1], { deleteLabel: 'Remove' });
    expect(wrapper.find('.delete').text()).toBe('Remove');
    await wrapper.find('.delete').trigger('click');
    expect(wrapper.emitted('bulkDelete')).toHaveLength(1);
    expect(wrapper.findAll('.bg-n-strong')).toHaveLength(0);

    const custom = mountBar(
      [1, 2],
      {},
      {
        primaryActions: '<button class="primary" />',
        secondaryActions: '<button class="secondary" />',
        actions: '<span class="count">{{ params.selectedCount }}</span>',
      }
    );
    expect(custom.find('.primary').exists()).toBe(true);
    expect(custom.find('.secondary').exists()).toBe(true);
    expect(custom.find('.count').text()).toBe('2');
    expect(custom.find('.delete').exists()).toBe(false);
    expect(custom.findAll('.bg-n-strong')).toHaveLength(2);
  });

  it('defaults to an empty selection', () => {
    const wrapper = mount(BulkSelectBar, {
      props: { allItems: items },
      global: {
        stubs: { Checkbox, transition: { template: '<div><slot /></div>' } },
      },
    });
    expect(wrapper.findComponent(Checkbox).exists()).toBe(false);
  });
});
