/**
 * OneTeam behaviour spec for the Captain assistant's connected inboxes
 * page.
 *
 * Covers loading the assistant's inboxes (again when the assistant
 * changes), the loading and empty states, listing inbox cards,
 * connecting an inbox from the header or the empty state and closing
 * that dialog, and confirming before disconnecting an inbox.
 */
import { mount, flushPromises } from '@vue/test-utils';
import { reactive, ref } from 'vue';
import InboxesPage from '../Index.vue';

const route = reactive({ params: { assistantId: '4' } });
const dispatch = vi.fn();
const assistantFlags = ref({ fetchingItem: false });
const inboxFlags = ref({ fetchingList: false });
const inboxes = ref([]);
const openConnect = vi.fn();
const openDelete = vi.fn();

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => route,
}));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch }),
  useMapGetter: name =>
    ({
      'captainAssistants/getUIFlags': assistantFlags,
      'captainInboxes/getUIFlags': inboxFlags,
      'captainInboxes/getRecords': inboxes,
    })[name],
}));

const PageLayout = {
  name: 'PageLayout',
  props: { isFetching: Boolean, isEmpty: Boolean, buttonLabel: String },
  emits: ['click'],
  template:
    '<div><button class="add" @click="$emit(\'click\')" /><slot v-if="isEmpty" name="emptyState" /><slot v-else name="body" /><slot /></div>',
};
const InboxCard = {
  name: 'InboxCard',
  props: ['inbox'],
  emits: ['action'],
  template: '<div class="card">{{ inbox.name }}</div>',
};
const DeleteDialog = {
  name: 'DeleteDialog',
  props: ['entity', 'deletePayload', 'type'],
  data: () => ({ dialogRef: { open: openDelete } }),
  template: '<div class="delete-dialog" />',
};
const ConnectInboxDialog = {
  name: 'ConnectInboxDialog',
  props: ['assistantId', 'type'],
  emits: ['close'],
  data: () => ({ dialogRef: { open: openConnect } }),
  template: '<div class="connect-dialog" />',
};

const mountPage = async () => {
  const wrapper = mount(InboxesPage, {
    global: {
      stubs: {
        PageLayout,
        InboxCard,
        DeleteDialog,
        ConnectInboxDialog,
        InboxPageEmptyState: {
          emits: ['click'],
          template: '<button class="empty" @click="$emit(\'click\')" />',
        },
      },
    },
  });
  await flushPromises();
  return wrapper;
};

describe('Captain inboxes page behaviour', () => {
  beforeEach(() => {
    route.params.assistantId = '4';
    assistantFlags.value = { fetchingItem: false };
    inboxFlags.value = { fetchingList: false };
    inboxes.value = [
      { id: 1, name: 'Email' },
      { id: 2, name: 'Chat' },
    ];
    vi.clearAllMocks();
  });

  it('loads inboxes for the assistant and reloads when it changes', async () => {
    const wrapper = await mountPage();
    expect(dispatch).toHaveBeenCalledWith('captainInboxes/get', {
      assistantId: '4',
    });
    route.params.assistantId = '5';
    await flushPromises();
    expect(dispatch).toHaveBeenLastCalledWith('captainInboxes/get', {
      assistantId: '5',
    });
    wrapper.unmount();
  });

  it('shows loading, empty and listed states', async () => {
    assistantFlags.value = { fetchingItem: true };
    expect(
      (await mountPage()).findComponent(PageLayout).props('isFetching')
    ).toBe(true);
    assistantFlags.value = { fetchingItem: false };
    inboxFlags.value = { fetchingList: true };
    expect(
      (await mountPage()).findComponent(PageLayout).props('isFetching')
    ).toBe(true);
    inboxFlags.value = { fetchingList: false };

    const listed = await mountPage();
    expect(listed.findComponent(PageLayout).props('isFetching')).toBe(false);
    expect(listed.findAll('.card').map(c => c.text())).toEqual([
      'Email',
      'Chat',
    ]);

    inboxes.value = [];
    const empty = await mountPage();
    expect(empty.findComponent(PageLayout).props('isEmpty')).toBe(true);
    expect(empty.find('.empty').exists()).toBe(true);
  });

  it('connects an inbox from the header or the empty state', async () => {
    const wrapper = await mountPage();
    expect(wrapper.find('.connect-dialog').exists()).toBe(false);
    await wrapper.find('.add').trigger('click');
    await flushPromises();
    const dialog = wrapper.findComponent(ConnectInboxDialog);
    expect(dialog.props()).toEqual({ assistantId: '4', type: 'create' });
    expect(openConnect).toHaveBeenCalledTimes(1);
    await dialog.vm.$emit('close');
    expect(wrapper.find('.connect-dialog').exists()).toBe(false);

    inboxes.value = [];
    const empty = await mountPage();
    await empty.find('.empty').trigger('click');
    await flushPromises();
    expect(openConnect).toHaveBeenCalledTimes(2);
  });

  it('confirms before disconnecting an inbox', async () => {
    const wrapper = await mountPage();
    const [, chat] = wrapper.findAllComponents(InboxCard);
    await chat.vm.$emit('action', { action: 'view', id: 2 });
    await flushPromises();
    expect(openDelete).not.toHaveBeenCalled();
    expect(wrapper.findComponent(DeleteDialog).props()).toEqual({
      entity: { id: 2, name: 'Chat' },
      deletePayload: { assistantId: '4', inboxId: 2 },
      type: 'Inboxes',
    });

    await chat.vm.$emit('action', { action: 'delete', id: 2 });
    await flushPromises();
    expect(openDelete).toHaveBeenCalledTimes(1);
  });
});
