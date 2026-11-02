/**
 * OneTeam behaviour spec for the contacts list bulk action bar.
 *
 * Covers the select-all and selected-count labels, selecting or clearing
 * all visible contacts through the bar, clearing the selection, assigning
 * and removing labels, deleting for administrators, and disabling the
 * actions with nothing selected or while loading.
 */
import { mount } from '@vue/test-utils';
import ContactsBulkActionBar from '../ContactsBulkActionBar.vue';

const BulkSelectBar = {
  name: 'BulkSelectBar',
  props: ['modelValue', 'allItems', 'selectAllLabel', 'selectedCountLabel'],
  emits: ['update:modelValue'],
  template: '<div><slot name="primaryActions" /><slot name="actions" /></div>',
};
const Button = {
  name: 'Button',
  props: { label: String, disabled: Boolean, isLoading: Boolean },
  emits: ['click'],
  template:
    '<button :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
};
const BulkLabelActions = {
  name: 'BulkLabelActions',
  props: { action: String, disabled: Boolean, isLoading: Boolean },
  emits: ['assign', 'remove'],
  template: '<span class="labels" />',
};

const mountBar = props =>
  mount(ContactsBulkActionBar, {
    props,
    global: {
      stubs: {
        BulkSelectBar,
        Button,
        BulkLabelActions,
        Policy: { template: '<div class="policy"><slot /></div>' },
      },
      directives: { tooltip: {} },
    },
  });

const bar = wrapper => wrapper.findComponent(BulkSelectBar);
const labelActions = wrapper => wrapper.findAllComponents(BulkLabelActions);
const buttons = wrapper => wrapper.findAllComponents(Button);

describe('ContactsBulkActionBar behaviour', () => {
  it('shows the selection and selects or clears all visible contacts', async () => {
    const wrapper = mountBar({
      visibleContactIds: [1, 2],
      selectedContactIds: [1],
    });
    expect(bar(wrapper).props()).toMatchObject({
      allItems: [{ id: 1 }, { id: 2 }],
      selectAllLabel: 'CONTACTS_BULK_ACTIONS.SELECT_ALL',
      selectedCountLabel: 'CONTACTS_BULK_ACTIONS.SELECTED_COUNT',
    });
    expect([...bar(wrapper).props('modelValue')]).toEqual([1]);

    await bar(wrapper).vm.$emit('update:modelValue', new Set([1, 2]));
    await bar(wrapper).vm.$emit('update:modelValue', new Set([1]));
    expect(wrapper.emitted('toggleAll')).toEqual([[true], [false]]);
  });

  it('has no select-all label and deselects with no visible contacts', async () => {
    const wrapper = mountBar();
    expect(bar(wrapper).props('selectAllLabel')).toBe('');
    await bar(wrapper).vm.$emit('update:modelValue', new Set([1]));
    expect(wrapper.emitted('toggleAll')).toEqual([[false]]);
    expect(labelActions(wrapper).every(l => l.props('disabled'))).toBe(true);
    expect(buttons(wrapper)[1].props('disabled')).toBe(true);
  });

  it('clears, labels and deletes the selection', async () => {
    const wrapper = mountBar({
      visibleContactIds: [1],
      selectedContactIds: [1],
    });
    const [clear, remove] = buttons(wrapper);
    expect(clear.props('label')).toBe('CONTACTS_BULK_ACTIONS.CLEAR_SELECTION');
    await clear.trigger('click');
    expect(wrapper.emitted('clearSelection')).toHaveLength(1);

    const [assign, unassign] = labelActions(wrapper);
    expect(assign.props('disabled')).toBe(false);
    expect(unassign.props('action')).toBe('remove');
    await assign.vm.$emit('assign', ['vip']);
    await unassign.vm.$emit('remove', ['old']);
    expect(wrapper.emitted('assignLabels')).toEqual([[['vip']]]);
    expect(wrapper.emitted('removeLabels')).toEqual([[['old']]]);

    expect(wrapper.find('.policy').exists()).toBe(true);
    await remove.trigger('click');
    expect(wrapper.emitted('deleteSelected')).toHaveLength(1);
  });

  it('disables deleting while loading', () => {
    const wrapper = mountBar({
      visibleContactIds: [1],
      selectedContactIds: [1],
      isLoading: true,
    });
    expect(buttons(wrapper)[1].props()).toMatchObject({
      disabled: true,
      isLoading: true,
    });
    expect(labelActions(wrapper)[0].props('isLoading')).toBe(true);
  });
});
