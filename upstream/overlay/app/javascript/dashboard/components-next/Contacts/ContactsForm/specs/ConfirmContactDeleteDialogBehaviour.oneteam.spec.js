/**
 * OneTeam behaviour spec for the delete contact confirmation.
 *
 * Covers going back to the list and deleting the routed or selected
 * contact, the success and error alerts, skipping when there is no id,
 * and closing the dialog afterwards.
 */
import { mount, flushPromises } from '@vue/test-utils';
import ConfirmContactDeleteDialog from '../ConfirmContactDeleteDialog.vue';
import { useAlert } from 'dashboard/composables';

const dispatch = vi.fn();
const close = vi.fn();
const route = vi.hoisted(() => ({ params: {} }));

vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch }),
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => route,
}));

const Dialog = {
  name: 'Dialog',
  emits: ['confirm'],
  setup: () => ({ close }),
  template: '<div />',
};
const mountDialog = selectedContact =>
  mount(ConfirmContactDeleteDialog, {
    props: { selectedContact },
    global: { stubs: { Dialog } },
  });
const confirm = async wrapper => {
  wrapper.findComponent(Dialog).vm.$emit('confirm');
  await flushPromises();
};

describe('ConfirmContactDeleteDialog behaviour', () => {
  beforeEach(() => {
    route.params = {};
  });

  it('deletes the routed contact, then the selected one', async () => {
    dispatch.mockResolvedValue();
    route.params = { contactId: '5' };
    const wrapper = mountDialog({ id: 8 });
    expect(wrapper.vm.dialogRef).toBeTruthy();
    await confirm(wrapper);
    expect(wrapper.emitted('goToContactsList')).toHaveLength(1);
    expect(dispatch).toHaveBeenCalledWith('contacts/delete', '5');
    expect(useAlert).toHaveBeenCalledWith(
      'CONTACTS_LAYOUT.DETAILS.DELETE_DIALOG.API.SUCCESS_MESSAGE'
    );
    expect(close).toHaveBeenCalled();

    route.params = {};
    await confirm(wrapper);
    expect(dispatch).toHaveBeenLastCalledWith('contacts/delete', 8);
  });

  it('alerts failures and skips without an id', async () => {
    dispatch.mockRejectedValueOnce(new Error('no'));
    await confirm(mountDialog({ id: 8 }));
    expect(useAlert).toHaveBeenCalledWith(
      'CONTACTS_LAYOUT.DETAILS.DELETE_DIALOG.API.ERROR_MESSAGE'
    );
    const wrapper = mountDialog({});
    await confirm(wrapper);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalled();
  });
});
