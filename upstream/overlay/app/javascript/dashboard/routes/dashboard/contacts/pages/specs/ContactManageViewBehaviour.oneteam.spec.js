/**
 * OneTeam behaviour spec for the single contact page.
 *
 * Covers loading the contact, its contactable inboxes, notes,
 * conversations and attributes; the spinners while loading or merging;
 * the sidebar tabs (attributes, history, notes, media, merge, and the
 * merge panel sending the agent back to attributes); going back to the
 * list (browser back, or the contacts list when there is no history);
 * and blocking or unblocking the contact (success and failure).
 */
import { reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import ContactManageView from '../ContactManageView.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
  useRouter: () => env.router,
}));
vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return {
    useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
    useMapGetter: name =>
      name === 'contacts/getUIFlags'
        ? computed(() => env.uiFlags)
        : computed(() => id => env.contacts[id]),
  };
});

const Layout = {
  name: 'ContactsDetailsLayout',
  props: ['selectedContact', 'isUpdating'],
  emits: ['goToContactsList', 'toggleBlock'],
  template:
    '<div><slot /><div class="tabs"><slot name="sidebarHeader" /></div><aside><slot name="sidebar" /></aside></div>',
};
const TabBar = {
  name: 'TabBar',
  props: ['tabs', 'initialActiveTab'],
  emits: ['tabChanged'],
  template: '<nav />',
};
const panel = name => ({
  name,
  props: ['selectedContact'],
  emits: ['goToContactsList', 'resetTab'],
  template: `<div class="${name}" />`,
});
const ContactDetails = panel('ContactDetails');
const ContactMerge = panel('ContactMerge');

const mountPage = () =>
  mount(ContactManageView, {
    global: {
      stubs: {
        ContactsDetailsLayout: Layout,
        TabBar,
        ContactDetails,
        ContactMerge,
        ContactNotes: panel('ContactNotes'),
        ContactHistory: panel('ContactHistory'),
        ContactMedia: panel('ContactMedia'),
        ContactCustomAttributes: panel('ContactCustomAttributes'),
        Spinner: { template: '<i class="spinner" />' },
      },
    },
  });

const tab = async (wrapper, value) =>
  wrapper.findComponent(TabBar).vm.$emit('tabChanged', { value });

describe('ContactManageView behaviour', () => {
  const realHistory = window.history;

  beforeEach(() => {
    env.route = { params: { accountId: 1, contactId: '7' } };
    env.router = { back: vi.fn(), push: vi.fn() };
    env.dispatch = vi.fn().mockResolvedValue();
    env.uiFlags = reactive({});
    env.contacts = { 7: { id: 7, name: 'Ann', blocked: false } };
    useAlert.mockClear();
  });

  afterEach(() => {
    Object.defineProperty(window, 'history', {
      value: realHistory,
      configurable: true,
    });
  });

  it('loads the contact and its related records', async () => {
    const wrapper = mountPage();
    await flushPromises();
    expect(env.dispatch.mock.calls).toEqual([
      ['contacts/show', { id: '7' }],
      ['contactNotes/get', { contactId: '7' }],
      ['contactConversations/get', '7'],
      ['attributes/get'],
      ['contacts/fetchContactableInbox', '7'],
    ]);
    expect(
      wrapper.findComponent(ContactDetails).props('selectedContact')
    ).toEqual(env.contacts[7]);
    expect(wrapper.findComponent(TabBar).props('tabs')).toHaveLength(5);
    expect(wrapper.find('.ContactCustomAttributes').exists()).toBe(true);
  });

  it('skips contact fetches without a contact id', async () => {
    env.route = { params: { accountId: 1 } };
    const wrapper = mountPage();
    await flushPromises();
    expect(env.dispatch.mock.calls).toEqual([['attributes/get']]);
    expect(wrapper.findComponent(ContactDetails).exists()).toBe(false);
  });

  it('shows spinners while loading or merging', async () => {
    env.uiFlags.isFetchingItem = true;
    const wrapper = mountPage();
    expect(wrapper.findAll('.spinner')).toHaveLength(2);
    env.uiFlags.isFetchingItem = false;
    env.uiFlags.isMerging = true;
    await flushPromises();
    expect(wrapper.findAll('.spinner')).toHaveLength(1);
  });

  it('switches sidebar tabs', async () => {
    Object.defineProperty(window, 'history', {
      value: { state: null, length: 3 },
      configurable: true,
    });
    const wrapper = mountPage();
    await tab(wrapper, 'history');
    expect(wrapper.find('.ContactHistory').exists()).toBe(true);
    await tab(wrapper, 'notes');
    expect(wrapper.find('.ContactNotes').exists()).toBe(true);
    await tab(wrapper, 'media');
    expect(wrapper.find('.ContactMedia').exists()).toBe(true);
    await tab(wrapper, 'merge');
    expect(wrapper.findComponent(TabBar).props('initialActiveTab')).toBe(4);
    const merge = wrapper.findComponent(ContactMerge);
    await merge.vm.$emit('goToContactsList');
    expect(env.router.back).toHaveBeenCalled();
    await merge.vm.$emit('resetTab');
    expect(wrapper.find('.ContactCustomAttributes').exists()).toBe(true);
  });

  it('goes back to the list with or without history', async () => {
    Object.defineProperty(window, 'history', {
      value: { state: { back: '/contacts' }, length: 1 },
      configurable: true,
    });
    const wrapper = mountPage();
    await wrapper.findComponent(Layout).vm.$emit('goToContactsList');
    expect(env.router.back).toHaveBeenCalledTimes(1);

    Object.defineProperty(window, 'history', {
      value: { state: null, length: 1 },
      configurable: true,
    });
    await wrapper.findComponent(ContactDetails).vm.$emit('goToContactsList');
    expect(env.router.push).toHaveBeenCalledWith(
      '/app/accounts/1/contacts?page=1'
    );
  });

  it('blocks and unblocks the contact', async () => {
    env.uiFlags.isUpdating = true;
    const wrapper = mountPage();
    const layout = wrapper.findComponent(Layout);
    expect(layout.props('isUpdating')).toBe(true);

    await layout.vm.$emit('toggleBlock', false);
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('contacts/update', {
      id: 7,
      name: 'Ann',
      blocked: true,
    });
    expect(useAlert).toHaveBeenLastCalledWith(
      'CONTACTS_LAYOUT.HEADER.ACTIONS.BLOCK_SUCCESS_MESSAGE'
    );
    await layout.vm.$emit('toggleBlock', true);
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'CONTACTS_LAYOUT.HEADER.ACTIONS.UNBLOCK_SUCCESS_MESSAGE'
    );

    env.dispatch.mockRejectedValueOnce(new Error('no'));
    await layout.vm.$emit('toggleBlock', false);
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'CONTACTS_LAYOUT.HEADER.ACTIONS.BLOCK_ERROR_MESSAGE'
    );
    env.dispatch.mockRejectedValueOnce(new Error('no'));
    await layout.vm.$emit('toggleBlock', true);
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'CONTACTS_LAYOUT.HEADER.ACTIONS.UNBLOCK_ERROR_MESSAGE'
    );
  });
});
