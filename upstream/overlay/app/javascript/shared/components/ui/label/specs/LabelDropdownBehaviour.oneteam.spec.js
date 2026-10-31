/**
 * OneTeam behaviour spec for the label picker dropdown.
 *
 * Covers focusing the search box, listing labels with their selection,
 * adding and removing a label, searching (including no results), and
 * creating a label from the search text (only when allowed and few
 * results remain, disabled on an exact match, modal open and close).
 */
import { flushPromises, mount } from '@vue/test-utils';
import LabelDropdown from '../LabelDropdown.vue';

const Item = {
  name: 'LabelDropdownItem',
  props: ['title', 'color', 'selected'],
  emits: ['selectLabel'],
  template: '<li class="item" />',
};
const NextButton = {
  name: 'NextButton',
  props: ['label', 'disabled'],
  emits: ['click'],
  template:
    '<button class="create" :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
};
const Modal = {
  name: 'WootModal',
  props: ['show', 'onClose'],
  emits: ['update:show'],
  template: '<div v-if="show" class="modal"><slot /></div>',
};
const AddLabel = {
  name: 'AddLabel',
  props: ['prefillTitle'],
  emits: ['close'],
  template: '<div class="add-label" />',
};

const labels = [
  { title: 'billing', color: '#f00' },
  { title: 'bug', color: '#0f0' },
  { title: 'vip', color: '#00f' },
  { title: 'sales', color: '#ff0' },
];

const mountDropdown = props =>
  mount(LabelDropdown, {
    props: { accountLabels: labels, selectedLabels: ['vip'], ...props },
    attachTo: document.body,
    global: {
      stubs: {
        LabelDropdownItem: Item,
        NextButton,
        WootModal: Modal,
        AddLabel,
        AddLabelModal: AddLabel,
        Hotkey: true,
        WootDropdownMenu: { template: '<ul><slot /></ul>' },
      },
      mocks: { $t: key => key },
    },
  });
const items = wrapper => wrapper.findAllComponents(Item);
const search = async (wrapper, value) => {
  await wrapper.find('input').setValue(value);
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('LabelDropdown behaviour', () => {
  it('focuses the search and lists labels with their selection', () => {
    const wrapper = mountDropdown();
    expect(document.activeElement).toBe(wrapper.find('input').element);
    expect(
      items(wrapper).map(i => [i.props('title'), i.props('selected')])
    ).toEqual([
      ['billing', false],
      ['bug', false],
      ['vip', true],
      ['sales', false],
    ]);
    expect(wrapper.find('.create').exists()).toBe(false);
  });

  it('adds unselected labels and removes selected ones', async () => {
    const wrapper = mountDropdown();
    items(wrapper)[0].vm.$emit('selectLabel');
    items(wrapper)[2].vm.$emit('selectLabel');
    expect(wrapper.emitted('add')[0][0]).toEqual(labels[0]);
    expect(wrapper.emitted('remove')[0][0]).toBe('vip');
    wrapper.vm.updateLabels(['bug']);
    expect(wrapper.emitted('update')[0][0]).toEqual(['bug']);
  });

  it('searches and shows no results', async () => {
    const wrapper = mountDropdown();
    await search(wrapper, 'bi');
    expect(items(wrapper).map(i => i.props('title'))).toContain('billing');
    await search(wrapper, 'zzz');
    expect(items(wrapper)).toHaveLength(0);
    expect(wrapper.text()).toContain(
      'CONTACT_PANEL.LABELS.LABEL_SELECT.NO_RESULT'
    );
  });

  it('offers to create a label from the search text', async () => {
    const wrapper = mountDropdown({ allowCreation: true });
    expect(wrapper.find('.create').exists()).toBe(false);
    await search(wrapper, 'New Tag');
    const create = wrapper.findComponent(NextButton);
    expect(create.props()).toEqual({
      label: 'CONTACT_PANEL.LABELS.LABEL_SELECT.CREATE_LABEL: new-tag',
      disabled: false,
    });
    await create.trigger('click');
    expect(wrapper.findComponent(AddLabel).props('prefillTitle')).toBe(
      'new-tag'
    );
    wrapper.findComponent(AddLabel).vm.$emit('close');
    await flushPromises();
    expect(wrapper.find('.modal').exists()).toBe(false);
    await create.trigger('click');
    wrapper.findComponent(Modal).props('onClose')();
    await flushPromises();
    expect(wrapper.find('.modal').exists()).toBe(false);
  });

  it('disables creating an exact match and labels an empty search plainly', async () => {
    const wrapper = mountDropdown({
      allowCreation: true,
      accountLabels: labels.slice(0, 2),
    });
    expect(wrapper.findComponent(NextButton).props('label')).toBe(
      'CONTACT_PANEL.LABELS.LABEL_SELECT.CREATE_LABEL '
    );
    await search(wrapper, 'bug');
    expect(wrapper.findComponent(NextButton).props('disabled')).toBe(true);
  });
});
