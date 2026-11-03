/**
 * OneTeam behaviour spec for the delete-segment confirm dialog.
 *
 * Covers the deleting state and emitting a contact-filter delete.
 */
import { computed } from 'vue';
import { mount } from '@vue/test-utils';
import DeleteSegmentDialog from '../DeleteSegmentDialog.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => computed(() => ({ isDeleting: true })),
}));

const Dialog = {
  name: 'Dialog',
  props: { isLoading: Boolean, disableConfirmButton: Boolean },
  emits: ['confirm'],
  template: '<div />',
};

describe('DeleteSegmentDialog behaviour', () => {
  it('deletes the contact segment', () => {
    const wrapper = mount(DeleteSegmentDialog, {
      global: { stubs: { Dialog } },
    });
    const dialog = wrapper.getComponent(Dialog);
    expect(dialog.props()).toEqual({
      isLoading: true,
      disableConfirmButton: true,
    });
    dialog.vm.$emit('confirm');
    expect(wrapper.emitted('delete')).toEqual([[{ filterType: 'contact' }]]);
  });
});
