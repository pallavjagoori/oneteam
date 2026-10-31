/**
 * OneTeam behaviour spec for deleting a saved folder or segment.
 *
 * Covers the confirmation modal (shown via v-model, view name in the
 * message), deleting conversation folders and contact segments (alerts,
 * tracking, reopening the last item), failures, closing, and the
 * folder/segment section flags.
 *
 * FINDING (Chatwoot): on failure the alert reuses the SUCCESS message
 * because of operator precedence (`a || b ? x : y`), and tracking reads
 * `this.filterType`, which does not exist, so every delete is tracked as
 * a "segment". The specs pin the current behaviour.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert, useTrack } from 'dashboard/composables';
import { CONTACTS_EVENTS } from 'dashboard/helper/AnalyticsHelper/events';
import DeleteCustomViews from '../DeleteCustomViews.vue';

vi.mock('dashboard/composables', () => ({
  useAlert: vi.fn(),
  useTrack: vi.fn(),
}));

const DeleteModal = {
  name: 'WootDeleteModal',
  props: [
    'show',
    'onClose',
    'onConfirm',
    'messageValue',
    'confirmText',
    'rejectText',
  ],
  emits: ['update:show'],
  template: '<div class="delete" />',
};

const mountModal = (props, routeName = 'folder_conversations') => {
  const dispatch = vi.fn().mockResolvedValue();
  const reopen = vi.fn();
  const wrapper = mount(DeleteCustomViews, {
    props: {
      show: true,
      activeCustomView: { name: 'VIP' },
      customViewsId: '7',
      openLastItemAfterDelete: reopen,
      ...props,
    },
    global: {
      stubs: { WootDeleteModal: DeleteModal },
      mocks: {
        $t: key => key,
        $route: { name: routeName },
        $store: { dispatch },
      },
    },
  });
  return { wrapper, dispatch, reopen };
};
const modal = wrapper => wrapper.findComponent(DeleteModal);

describe('DeleteCustomViews behaviour', () => {
  it('hides the modal when not shown', () => {
    const { wrapper } = mountModal({ show: false });
    expect(modal(wrapper).exists()).toBe(false);
  });

  it('shows the confirmation with the view name', () => {
    const { wrapper } = mountModal();
    expect(modal(wrapper).props()).toMatchObject({
      messageValue: ' VIP?',
      confirmText: 'FILTER.CUSTOM_VIEWS.DELETE.MODAL.CONFIRM.YES',
      rejectText: 'FILTER.CUSTOM_VIEWS.DELETE.MODAL.CONFIRM.NO',
    });
    expect(
      mountModal({ activeCustomView: null })
        .wrapper.findComponent(DeleteModal)
        .props('messageValue')
    ).toBe(' null?');
  });

  it('deletes a conversation folder', async () => {
    const { wrapper, dispatch, reopen } = mountModal();
    await modal(wrapper).props('onConfirm')();
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith('customViews/delete', {
      id: 7,
      filterType: 'conversation',
    });
    expect(wrapper.emitted('close')).toHaveLength(1);
    expect(useAlert).toHaveBeenCalledWith(
      'FILTER.CUSTOM_VIEWS.DELETE.API_FOLDERS.SUCCESS_MESSAGE'
    );
    expect(useTrack).toHaveBeenCalledWith(CONTACTS_EVENTS.DELETE_FILTER, {
      type: 'segment',
    });
    expect(reopen).toHaveBeenCalled();
  });

  it('deletes a contact segment', async () => {
    const { wrapper, dispatch } = mountModal({ activeFilterType: 1 });
    await modal(wrapper).props('onConfirm')();
    expect(dispatch.mock.calls[0][1].filterType).toBe('contact');
    expect(useAlert).toHaveBeenCalledWith(
      'FILTER.CUSTOM_VIEWS.DELETE.API_SEGMENTS.SUCCESS_MESSAGE'
    );
  });

  it('sends no filter type for unknown filters', async () => {
    const { wrapper, dispatch } = mountModal({ activeFilterType: 2 });
    await modal(wrapper).props('onConfirm')();
    expect(dispatch.mock.calls[0][1].filterType).toBe('');
  });

  it('alerts and still reopens the last item when deleting fails', async () => {
    const folder = mountModal();
    folder.dispatch.mockRejectedValue({ response: { message: 'Locked' } });
    await modal(folder.wrapper).props('onConfirm')();
    expect(useAlert).toHaveBeenCalledWith(
      'FILTER.CUSTOM_VIEWS.DELETE.API_FOLDERS.SUCCESS_MESSAGE'
    );
    expect(folder.reopen).toHaveBeenCalled();
    expect(folder.wrapper.emitted('close')).toBeUndefined();

    const segment = mountModal({ activeFilterType: 1 });
    segment.dispatch.mockRejectedValue(new Error('down'));
    await modal(segment.wrapper).props('onConfirm')();
    expect(useAlert).toHaveBeenLastCalledWith(
      'FILTER.CUSTOM_VIEWS.DELETE.API_SEGMENTS.SUCCESS_MESSAGE'
    );
  });

  it('closes from the modal', () => {
    const { wrapper } = mountModal();
    modal(wrapper).props('onClose')();
    modal(wrapper).vm.$emit('update:show', false);
    expect(wrapper.emitted('close')).toHaveLength(1);
    expect(wrapper.emitted('update:show')).toEqual([[false]]);
  });

  it('knows when it is inside a folder or segment section', () => {
    expect(
      mountModal({}, 'folder_conversations').wrapper.vm.isFolderSection
    ).toBe(true);
    expect(mountModal({}, 'home').wrapper.vm.isFolderSection).toBe(false);
    expect(mountModal({ activeFilterType: 1 }).wrapper.vm.isFolderSection).toBe(
      false
    );
    expect(
      mountModal({ activeFilterType: 1 }, 'segment').wrapper.vm.isSegmentSection
    ).toBe(true);
    expect(
      mountModal({ activeFilterType: 1 }, 'contacts_dashboard').wrapper.vm
        .isSegmentSection
    ).toBe(false);
    expect(mountModal().wrapper.vm.isSegmentSection).toBe(false);
  });
});
