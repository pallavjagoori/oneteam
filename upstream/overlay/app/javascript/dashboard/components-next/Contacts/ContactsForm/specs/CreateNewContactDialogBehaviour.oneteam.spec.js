/**
 * OneTeam behaviour spec for the new contact dialog.
 *
 * Covers ignoring confirm until the form has data, emitting the contact
 * on confirm, the save button state (invalid form, creating), resetting
 * and closing on success, and cancelling.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import CreateNewContactDialog from '../CreateNewContactDialog.vue';

const flags = ref({});
const close = vi.fn();
const resetForm = vi.fn();

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => flags,
}));

const Dialog = {
  name: 'Dialog',
  emits: ['confirm'],
  setup: () => ({ close }),
  template: '<div><slot /><slot name="footer" /></div>',
};
const ContactsForm = {
  name: 'ContactsForm',
  emits: ['update'],
  setup: () => ({ resetForm, isFormInvalid: true }),
  template: '<form />',
};
const Button = {
  name: 'Button',
  props: ['label', 'type', 'isLoading', 'disabled'],
  emits: ['click'],
  template: '<button :type="type" @click="$emit(\'click\')" />',
};

const mountDialog = () =>
  mount(CreateNewContactDialog, {
    global: { stubs: { Dialog, ContactsForm, Button } },
  });

describe('CreateNewContactDialog behaviour', () => {
  it('emits the contact on confirm and resets on success', async () => {
    flags.value = { isCreating: true };
    const wrapper = mountDialog();
    await wrapper.vm.$nextTick();
    const save = wrapper.findAllComponents(Button)[1];
    expect(save.props()).toMatchObject({ disabled: true, isLoading: true });

    wrapper.findComponent(Dialog).vm.$emit('confirm');
    expect(wrapper.emitted('create')).toBeUndefined();
    wrapper.findComponent(ContactsForm).vm.$emit('update', { name: 'Ann' });
    wrapper.findComponent(Dialog).vm.$emit('confirm');
    expect(wrapper.emitted('create')).toEqual([[{ name: 'Ann' }]]);

    wrapper.vm.onSuccess();
    expect(resetForm).toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);

    await wrapper.find('button[type="reset"]').trigger('click');
    expect(close).toHaveBeenCalledTimes(2);
  });

  it('closes on success even without the form ref', () => {
    const wrapper = mountDialog();
    wrapper.vm.contactsFormRef = null;
    resetForm.mockClear();
    wrapper.vm.onSuccess();
    expect(resetForm).not.toHaveBeenCalled();
  });
});
