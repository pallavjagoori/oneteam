/**
 * OneTeam behaviour spec for the delete-portal confirm dialog.
 *
 * Covers emitting deletePortal on confirm and exposing the dialog ref.
 */
import { mount } from '@vue/test-utils';
import ConfirmDeletePortalDialog from '../ConfirmDeletePortalDialog.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const Dialog = {
  name: 'Dialog',
  emits: ['confirm'],
  template: '<div />',
};

describe('ConfirmDeletePortalDialog behaviour', () => {
  it('deletes the portal on confirm', () => {
    const wrapper = mount(ConfirmDeletePortalDialog, {
      props: { activePortalName: 'Docs' },
      global: { stubs: { Dialog } },
    });
    wrapper.getComponent(Dialog).vm.$emit('confirm');
    expect(wrapper.emitted('deletePortal')).toHaveLength(1);
    expect(wrapper.vm.dialogRef).toBeTruthy();
  });
});
