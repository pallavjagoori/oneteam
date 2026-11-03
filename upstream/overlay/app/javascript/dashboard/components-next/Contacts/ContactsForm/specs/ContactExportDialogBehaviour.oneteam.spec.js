/**
 * OneTeam behaviour spec for the contacts export dialog.
 *
 * Covers exporting everything, the active segment's query, a segment id
 * that matches no saved segment, the applied filters, the label from the
 * route, and closing the dialog after confirming.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import ContactExportDialog from '../ContactExportDialog.vue';

const env = vi.hoisted(() => ({ params: {}, filters: {}, closed: 0 }));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: env.params }),
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: name =>
    ({
      'customViews/getContactCustomViews': ref([
        { id: 5, query: { payload: ['segment'] } },
      ]),
      'contacts/getAppliedContactFilters': ref(env.filters),
      'contacts/getUIFlags': ref({ isExporting: false }),
    })[name],
}));
vi.mock('dashboard/helper/filterQueryGenerator', () => ({
  default: filters => ({ payload: ['filtered', filters] }),
}));

const Dialog = {
  name: 'Dialog',
  emits: ['confirm'],
  setup: () => ({
    close: () => {
      env.closed += 1;
    },
  }),
  template: '<div />',
};

const exportWith = async (params, filters = {}) => {
  env.params = params;
  env.filters = filters;
  const wrapper = mount(ContactExportDialog, {
    global: { stubs: { Dialog } },
  });
  await wrapper.findComponent(Dialog).vm.$emit('confirm');
  await Promise.resolve();
  expect(wrapper.vm.dialogRef).toBeTruthy();
  if (!params.segmentId) expect(wrapper.vm.activeSegment).toBeUndefined();
  return wrapper.emitted('export')[0][0];
};

describe('ContactExportDialog behaviour', () => {
  beforeEach(() => {
    env.closed = 0;
  });

  it('exports by segment, filters or everything', async () => {
    expect(await exportWith({})).toEqual({ payload: [], label: '' });
    expect(await exportWith({ segmentId: '5', label: 'vip' })).toEqual({
      payload: ['segment'],
      label: 'vip',
    });
    expect(await exportWith({ segmentId: '9' })).toEqual({
      payload: [],
      label: '',
    });
    expect(await exportWith({}, { status: 'open' })).toEqual({
      payload: ['filtered', { status: 'open' }],
      label: '',
    });
    expect(env.closed).toBe(4);
  });
});
