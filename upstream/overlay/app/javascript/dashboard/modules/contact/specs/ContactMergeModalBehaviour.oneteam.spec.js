/**
 * OneTeam behaviour spec for the merge-contacts popover.
 *
 * Covers searching for contacts to merge into (leaving out the primary
 * contact, with a loading state and an error alert), resetting the
 * search when the primary contact changes, merging with tracking,
 * success and error alerts, and closing on cancel or hide.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import { useAlert, useTrack } from 'dashboard/composables';
import ContactAPI from 'dashboard/api/contacts';
import { CONTACTS_EVENTS } from 'dashboard/helper/AnalyticsHelper/events';
import ContactMergeModal from '../ContactMergeModal.vue';

vi.mock('dashboard/composables', () => ({
  useAlert: vi.fn(),
  useTrack: vi.fn(),
}));
vi.mock('dashboard/api/contacts', () => ({
  default: { search: vi.fn() },
}));

const hide = vi.fn();
const Popover = {
  name: 'Popover',
  emits: ['hide'],
  setup() {
    return { hide };
  },
  template: '<div><slot /><slot name="content" :hide="hide" /></div>',
};
const MergeContact = {
  name: 'MergeContact',
  props: ['primaryContact', 'isSearching', 'isMerging', 'searchResults'],
  emits: ['search', 'cancel', 'submit'],
  template: '<div class="merge" />',
};

const mountModal = (dispatch = vi.fn().mockResolvedValue()) => {
  const store = createStore({
    getters: { 'contacts/getUIFlags': () => ({ isMerging: true }) },
  });
  store.dispatch = dispatch;
  const wrapper = mount(ContactMergeModal, {
    props: { primaryContact: { id: 1, name: 'Ann' } },
    slots: { trigger: '<button class="trigger">Merge</button>' },
    global: { plugins: [store], stubs: { Popover, MergeContact } },
  });
  return { wrapper, dispatch };
};

describe('ContactMergeModal behaviour', () => {
  it('renders the trigger and the merge form', () => {
    const { wrapper } = mountModal();
    expect(wrapper.find('.trigger').exists()).toBe(true);
    expect(wrapper.text()).toContain('MERGE_CONTACTS.TITLE');
    expect(wrapper.text()).toContain('MERGE_CONTACTS.DESCRIPTION');
    const form = wrapper.findComponent(MergeContact);
    expect(form.props('isMerging')).toBe(true);
    expect(form.props('primaryContact')).toEqual({ id: 1, name: 'Ann' });
  });

  it('searches without the primary contact and resets on change', async () => {
    let resolve;
    ContactAPI.search.mockReturnValue(
      new Promise(done => {
        resolve = done;
      })
    );
    const { wrapper } = mountModal();
    const form = () => wrapper.findComponent(MergeContact);
    await form().vm.$emit('search', 'an');
    expect(ContactAPI.search).toHaveBeenCalledWith('an');
    expect(form().props('isSearching')).toBe(true);
    resolve({ data: { payload: [{ id: 1 }, { id: 2 }] } });
    await flushPromises();
    expect(form().props('isSearching')).toBe(false);
    expect(form().props('searchResults')).toEqual([{ id: 2 }]);

    await wrapper.setProps({ primaryContact: { id: 5 } });
    expect(form().props('searchResults')).toEqual([]);
  });

  it('alerts when the search fails', async () => {
    ContactAPI.search.mockRejectedValue(new Error('down'));
    const { wrapper } = mountModal();
    await wrapper.findComponent(MergeContact).vm.$emit('search', 'x');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'MERGE_CONTACTS.SEARCH.ERROR_MESSAGE'
    );
    expect(wrapper.findComponent(MergeContact).props('isSearching')).toBe(
      false
    );
  });

  it('merges, alerts, hides and closes', async () => {
    const { wrapper, dispatch } = mountModal();
    await wrapper.findComponent(MergeContact).vm.$emit('submit', 9);
    await flushPromises();
    expect(useTrack).toHaveBeenCalledWith(CONTACTS_EVENTS.MERGED_CONTACTS);
    expect(dispatch).toHaveBeenCalledWith('contacts/merge', {
      childId: 1,
      parentId: 9,
    });
    expect(useAlert).toHaveBeenCalledWith(
      'MERGE_CONTACTS.FORM.SUCCESS_MESSAGE'
    );
    expect(hide).toHaveBeenCalled();
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('alerts when merging fails and stays open', async () => {
    const { wrapper } = mountModal(vi.fn().mockRejectedValue(new Error('x')));
    await wrapper.findComponent(MergeContact).vm.$emit('submit', 9);
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('MERGE_CONTACTS.FORM.ERROR_MESSAGE');
    expect(hide).not.toHaveBeenCalled();
    expect(wrapper.emitted('close')).toBeUndefined();
  });

  it('cancels with hide and closes when the popover hides', async () => {
    const { wrapper } = mountModal();
    await wrapper.findComponent(MergeContact).vm.$emit('cancel');
    expect(hide).toHaveBeenCalled();
    await wrapper.findComponent(Popover).vm.$emit('hide');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
