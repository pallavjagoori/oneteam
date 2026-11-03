/**
 * OneTeam behaviour spec for the generic delete confirmation modal.
 *
 * Covers the header text, the reject and confirm callbacks, and the show
 * v-model.
 */
import { mount } from '@vue/test-utils';
import DeleteModal from '../DeleteModal.vue';

const Modal = {
  name: 'Modal',
  props: ['show', 'onClose'],
  emits: ['update:show'],
  template: '<div class="modal"><slot /></div>',
};
const Header = {
  name: 'WootModalHeader',
  props: ['headerTitle', 'headerContent', 'headerContentValue'],
  template: '<header />',
};
const Button = {
  name: 'NextButton',
  props: ['label'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};

describe('DeleteModal behaviour', () => {
  it('wires the header, buttons and show model', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    const wrapper = mount(DeleteModal, {
      props: {
        show: true,
        onClose,
        onConfirm,
        title: 'Delete label',
        message: 'Remove',
        messageValue: 'billing',
        confirmText: 'Yes',
        rejectText: 'No',
      },
      global: { stubs: { Modal, WootModalHeader: Header, Button } },
    });
    expect(wrapper.getComponent(Header).props()).toEqual({
      headerTitle: 'Delete label',
      headerContent: 'Remove',
      headerContentValue: 'billing',
    });
    const [reject, confirm] = wrapper.findAll('button');
    expect(reject.text()).toBe('No');
    reject.trigger('click');
    confirm.trigger('click');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    wrapper.getComponent(Modal).vm.$emit('update:show', false);
    expect(wrapper.emitted('update:show')).toEqual([[false]]);
  });

  it('falls back to no-op callbacks', () => {
    const wrapper = mount(DeleteModal, {
      global: { stubs: { Modal, WootModalHeader: Header, Button } },
    });
    wrapper.findAll('button').forEach(button => button.trigger('click'));
    expect(wrapper.findAll('button')).toHaveLength(2);
  });
});
