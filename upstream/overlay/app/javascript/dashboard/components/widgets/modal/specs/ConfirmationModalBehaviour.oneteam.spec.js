/**
 * OneTeam behaviour spec for the promise-based confirmation modal.
 *
 * Covers the default and custom title, description and button labels,
 * opening the modal through showConfirmation, and resolving the promise
 * with true on confirm or false on cancel or close.
 */
import { mount } from '@vue/test-utils';
import ConfirmationModal from '../ConfirmationModal.vue';

const Modal = {
  name: 'Modal',
  props: { show: Boolean, onClose: Function },
  template: '<div v-if="show" class="modal"><slot /></div>',
};
const NextButton = {
  name: 'NextButton',
  props: { label: String, type: String },
  emits: ['click'],
  template:
    '<button :type="type" @click="$emit(\'click\')">{{ label }}</button>',
};
const Header = {
  name: 'WootModalHeader',
  props: ['headerTitle', 'headerContent'],
  template: '<h2><b>{{ headerTitle }}</b><i>{{ headerContent }}</i></h2>',
};

const mountModal = (props = {}) =>
  mount(ConfirmationModal, {
    props,
    global: { stubs: { Modal, NextButton, WootModalHeader: Header } },
  });

describe('ConfirmationModal behaviour', () => {
  it('uses default and custom texts', async () => {
    const plain = mountModal();
    plain.vm.showConfirmation();
    await plain.vm.$nextTick();
    expect(plain.find('h2 b').text()).toBe('This is a title');
    expect(plain.find('h2 i').text()).toBe('This is your description');
    expect(plain.findAll('button').map(b => b.text())).toEqual(['No', 'Yes']);

    const custom = mountModal({
      title: 'Delete?',
      description: 'Gone for good',
      confirmLabel: 'Delete',
      cancelLabel: 'Keep',
    });
    custom.vm.showConfirmation();
    await custom.vm.$nextTick();
    expect(custom.find('h2 b').text()).toBe('Delete?');
    expect(custom.find('h2 i').text()).toBe('Gone for good');
    expect(custom.findAll('button').map(b => b.text())).toEqual([
      'Keep',
      'Delete',
    ]);
  });

  it('resolves true on confirm and closes', async () => {
    const wrapper = mountModal();
    expect(wrapper.find('.modal').exists()).toBe(false);
    const answer = wrapper.vm.showConfirmation();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.modal').exists()).toBe(true);
    await wrapper.find('button[type="submit"]').trigger('click');
    await expect(answer).resolves.toBe(true);
    expect(wrapper.find('.modal').exists()).toBe(false);
  });

  it('resolves false on cancel or close', async () => {
    const wrapper = mountModal();
    const cancelled = wrapper.vm.showConfirmation();
    await wrapper.vm.$nextTick();
    await wrapper.find('button[type="reset"]').trigger('click');
    await expect(cancelled).resolves.toBe(false);

    const closed = wrapper.vm.showConfirmation();
    await wrapper.vm.$nextTick();
    wrapper.findComponent(Modal).props('onClose')();
    await expect(closed).resolves.toBe(false);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.modal').exists()).toBe(false);

    wrapper.vm.showConfirmation();
    await wrapper.vm.$nextTick();
    await wrapper.findComponent(Modal).vm.$emit('update:show', false);
    expect(wrapper.find('.modal').exists()).toBe(false);
  });
});
