/**
 * OneTeam behaviour spec for the save-as-segment dialog.
 *
 * Covers the required name error, creating a contact segment and
 * clearing the field, and the busy confirm button.
 */
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import CreateSegmentDialog from '../CreateSegmentDialog.vue';

const flags = ref({});

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => flags,
}));

const Dialog = {
  name: 'Dialog',
  props: ['isLoading', 'disableConfirmButton'],
  emits: ['confirm'],
  template: '<div><slot /></div>',
};
const Input = {
  name: 'Input',
  props: ['modelValue', 'message', 'messageType'],
  emits: ['update:modelValue'],
  template: '<input />',
};
const mountDialog = () =>
  mount(CreateSegmentDialog, { global: { stubs: { Dialog, Input } } });

describe('CreateSegmentDialog behaviour', () => {
  it('requires a name, creates the segment and clears it', async () => {
    flags.value = {};
    const wrapper = mountDialog();
    expect(wrapper.vm.dialogRef).toBeTruthy();
    const dialog = wrapper.findComponent(Dialog);
    const input = wrapper.findComponent(Input);
    dialog.vm.$emit('confirm');
    await flushPromises();
    expect(wrapper.emitted('create')).toBeUndefined();
    expect(input.props()).toMatchObject({
      message: 'CONTACTS_LAYOUT.HEADER.ACTIONS.FILTERS.CREATE_SEGMENT.ERROR',
      messageType: 'error',
    });

    input.vm.$emit('update:modelValue', 'VIPs');
    dialog.vm.$emit('confirm');
    await flushPromises();
    expect(wrapper.emitted('create')).toEqual([
      [{ name: 'VIPs', filter_type: 1 }],
    ]);
    expect(input.props()).toMatchObject({
      modelValue: '',
      message: '',
      messageType: 'info',
    });
  });

  it('shows a busy confirm button while creating', () => {
    flags.value = { isCreating: true };
    expect(mountDialog().findComponent(Dialog).props()).toEqual({
      isLoading: true,
      disableConfirmButton: true,
    });
  });
});
