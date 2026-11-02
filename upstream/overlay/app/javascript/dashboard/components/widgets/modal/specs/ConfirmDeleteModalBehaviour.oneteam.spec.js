/**
 * OneTeam behaviour spec for the type-to-confirm delete modal.
 *
 * Covers the title, message, placeholder and button labels, keeping the
 * delete button disabled until the typed value matches (ignoring outer
 * spaces), marking the field after blur, confirming by submit, closing
 * by the reject button or the modal (clearing the typed value), and
 * passing visibility changes up.
 */
import { mount } from '@vue/test-utils';
import ConfirmDeleteModal from '../ConfirmDeleteModal.vue';

const Modal = {
  name: 'Modal',
  props: ['show', 'onClose'],
  emits: ['update:show'],
  template: '<div class="modal"><slot /></div>',
};
const WootModalHeader = {
  name: 'WootModalHeader',
  props: ['headerTitle', 'headerContent'],
  template: '<header>{{ headerTitle }}|{{ headerContent }}</header>',
};
const WootInput = {
  name: 'WootInput',
  props: ['modelValue', 'placeholder'],
  emits: ['update:modelValue', 'blur'],
  template: '<input :value="modelValue" :placeholder="placeholder" />',
};
const NextButton = {
  name: 'NextButton',
  props: { label: String, type: String, disabled: Boolean },
  emits: ['click'],
  template:
    '<button :type="type" :disabled="disabled" @click="$emit(\'click\', $event)">{{ label }}</button>',
};

const mountModal = () =>
  mount(ConfirmDeleteModal, {
    props: {
      show: true,
      title: 'Delete inbox',
      message: 'This cannot be undone',
      confirmText: 'Delete',
      rejectText: 'Cancel',
      confirmValue: 'Support',
      confirmPlaceHolderText: 'Type Support',
    },
    global: { stubs: { Modal, WootModalHeader, WootInput, NextButton } },
  });

const input = wrapper => wrapper.findComponent(WootInput);
const buttons = wrapper => wrapper.findAllComponents(NextButton);

describe('ConfirmDeleteModal behaviour', () => {
  it('shows the texts and enables delete once the value matches', async () => {
    const wrapper = mountModal();
    expect(wrapper.find('header').text()).toBe(
      'Delete inbox|This cannot be undone'
    );
    expect(input(wrapper).props('placeholder')).toBe('Type Support');
    expect(buttons(wrapper).map(b => b.props('label'))).toEqual([
      'Cancel',
      'Delete',
    ]);
    expect(buttons(wrapper)[1].props('disabled')).toBe(true);

    await input(wrapper).vm.$emit('update:modelValue', 'Sales');
    await input(wrapper).vm.$emit('blur');
    expect(input(wrapper).classes()).toContain('error');
    expect(buttons(wrapper)[1].props('disabled')).toBe(true);

    await input(wrapper).vm.$emit('update:modelValue', '  Support ');
    expect(input(wrapper).classes()).not.toContain('error');
    expect(buttons(wrapper)[1].props('disabled')).toBe(false);

    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('onConfirm')).toHaveLength(1);
  });

  it('treats a missing target value as empty', async () => {
    const wrapper = mountModal();
    await wrapper.setProps({ confirmValue: null });
    await input(wrapper).vm.$emit('update:modelValue', ' ');
    expect(wrapper.vm.v$.value.isEqual.$invalid).toBe(false);
    await input(wrapper).vm.$emit('update:modelValue', null);
    expect(wrapper.vm.v$.value.isEqual.$invalid).toBe(false);
  });

  it('closes and clears the value from the reject button or the modal', async () => {
    const wrapper = mountModal();
    await input(wrapper).vm.$emit('update:modelValue', 'Sup');
    await buttons(wrapper)[0].trigger('click');
    expect(wrapper.emitted('onClose')).toHaveLength(1);
    expect(input(wrapper).props('modelValue')).toBe('');

    await input(wrapper).vm.$emit('update:modelValue', 'Sup');
    wrapper.findComponent(Modal).props('onClose')();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('onClose')).toHaveLength(2);
    expect(input(wrapper).props('modelValue')).toBe('');
  });

  it('passes visibility changes up', async () => {
    const wrapper = mountModal();
    expect(wrapper.findComponent(Modal).props('show')).toBe(true);
    await wrapper.findComponent(Modal).vm.$emit('update:show', false);
    expect(wrapper.emitted('update:show')).toEqual([[false]]);
  });
});
