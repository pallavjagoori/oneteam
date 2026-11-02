/**
 * OneTeam behaviour spec for Captain's document bulk actions bar.
 *
 * Covers the select-all / unselect-all and selected-count labels,
 * forwarding selection changes, opening the bulk delete dialog and
 * relaying its success, showing "sync" only when a selected document can
 * sync (web pages that are available, or an explicit syncable flag), and
 * the sync alerts for zero, one, many (count or ids) and failure.
 */
import { flushPromises, mount } from '@vue/test-utils';
import DocumentBulkActions from '../DocumentBulkActions.vue';

const env = vi.hoisted(() => ({ dispatch: null, alert: null, open: null }));

vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
}));
vi.mock('dashboard/composables', () => ({
  useAlert: (...args) => env.alert(...args),
}));

const BulkSelectBar = {
  name: 'BulkSelectBar',
  props: ['modelValue', 'selectAllLabel', 'selectedCountLabel'],
  emits: ['update:modelValue', 'bulkDelete'],
  template: '<div class="bar"><slot name="secondaryActions" /></div>',
};
const BulkDeleteDialog = {
  name: 'BulkDeleteDialog',
  props: ['bulkIds', 'type'],
  emits: ['deleteSuccess'],
  setup: () => ({ dialogRef: { open: (...args) => env.open(...args) } }),
  template: '<div class="dialog" />',
};
const Button = {
  name: 'NextButton',
  props: ['label'],
  emits: ['click'],
  template:
    '<button class="sync" @click="$emit(\'click\')">{{ label }}</button>',
};

const documents = [
  { id: 1, status: 'available' },
  { id: 2, status: 'available', pdf_document: { id: 9 } },
  { id: 3, status: 'in_progress' },
  { id: 4, status: 'available', pdf_document: {}, syncable: true },
];
const mountBar = ids =>
  mount(DocumentBulkActions, {
    props: { documents, selectedIds: new Set(ids) },
    global: {
      stubs: { BulkSelectBar, BulkDeleteDialog, NextButton: Button, Button },
      mocks: { $t: key => key },
    },
  });
const bar = wrapper => wrapper.findComponent(BulkSelectBar);
const sync = async wrapper => {
  await wrapper.find('.sync').trigger('click');
  await flushPromises();
};

describe('Document bulk actions behaviour', () => {
  beforeEach(() => {
    env.dispatch = vi.fn(() => Promise.resolve({ count: 2 }));
    env.alert = vi.fn();
    env.open = vi.fn();
  });

  it('labels the selection and relays selection and deletes', async () => {
    const none = mountBar([]);
    expect(bar(none).props('selectAllLabel')).toBe(
      'CAPTAIN.DOCUMENTS.SELECT_ALL'
    );
    expect(none.find('.sync').exists()).toBe(false);
    expect(none.find('.bar').classes()).not.toContain('mb-2');

    const all = mountBar([1, 2, 3, 4]);
    expect(bar(all).props('selectAllLabel')).toBe(
      'CAPTAIN.DOCUMENTS.UNSELECT_ALL'
    );
    expect(bar(all).props('selectedCountLabel')).toBe(
      'CAPTAIN.DOCUMENTS.SELECTED'
    );
    expect(all.find('.bar').classes()).toContain('mb-2');
    bar(all).vm.$emit('update:modelValue', new Set([1]));
    expect(all.emitted('update:selectedIds')[0][0]).toEqual(new Set([1]));
    bar(all).vm.$emit('bulkDelete');
    expect(env.open).toHaveBeenCalled();
    all.findComponent(BulkDeleteDialog).vm.$emit('deleteSuccess');
    expect(all.emitted('bulkDeleteSucceeded')).toHaveLength(1);
  });

  it('only offers sync for syncable documents', () => {
    expect(mountBar([2, 3]).find('.sync').exists()).toBe(false);
    expect(mountBar([4]).find('.sync').exists()).toBe(true);
  });

  it('syncs the syncable selection and reports how many were queued', async () => {
    const wrapper = mountBar([1, 2, 4]);
    await sync(wrapper);
    expect(env.dispatch).toHaveBeenCalledWith(
      'captainBulkActions/handleBulkSync',
      { ids: [1, 4] }
    );
    expect(env.alert).toHaveBeenLastCalledWith(
      'CAPTAIN.DOCUMENTS.BULK_SYNC.SUCCESS_MESSAGE'
    );
    expect(wrapper.emitted('update:selectedIds')[0][0]).toEqual(new Set());
    expect(wrapper.emitted('bulkSyncQueued')).toHaveLength(1);

    env.dispatch = vi.fn(() => Promise.resolve({ ids: [1] }));
    await sync(wrapper);
    expect(env.alert).toHaveBeenLastCalledWith(
      'CAPTAIN.DOCUMENTS.BULK_SYNC.SUCCESS_MESSAGE_ONE'
    );

    env.dispatch = vi.fn(() => Promise.resolve(null));
    await sync(wrapper);
    expect(env.alert).toHaveBeenLastCalledWith(
      'CAPTAIN.DOCUMENTS.BULK_SYNC.ZERO_MESSAGE'
    );
    expect(wrapper.emitted('bulkSyncQueued')).toHaveLength(2);

    env.dispatch = vi.fn(() => Promise.reject(new Error('down')));
    await sync(wrapper);
    expect(env.alert).toHaveBeenLastCalledWith(
      'CAPTAIN.DOCUMENTS.BULK_SYNC.ERROR_MESSAGE'
    );
  });
});
