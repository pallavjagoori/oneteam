/**
 * OneTeam behaviour spec for the contacts list header wrapper.
 *
 * Covers the header events (search, sort, dialogs), creating, importing
 * and exporting contacts with their error messages, the advanced filter
 * panel (fresh, re-opened and segment-based filters), and creating,
 * updating and deleting segments.
 */
import { reactive } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import {
  DuplicateContactException,
  ExceptionWithMessage,
} from 'shared/helpers/CustomErrors';
import HeaderWrapper from '../ContactListHeaderWrapper.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => env.router,
}));
vi.mock('dashboard/composables', () => ({
  useAlert: vi.fn(),
  useTrack: vi.fn(),
}));
vi.mock('dashboard/helper/filterQueryGenerator', () => ({
  default: payload => ({ payload: payload.map(f => f.attribute_key) }),
}));
vi.mock('dashboard/helper/customViewsHelper', () => ({
  generateValuesForEditCustomViews: (filter, params) => {
    env.editParams = params;
    return [`edited:${filter.attribute_key}`];
  },
}));
vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  const getters = {
    'contacts/getAppliedContactFiltersV4': () => env.state.applied,
    'attributes/getContactAttributes': () => env.state.attributes,
    'labels/getLabels': () => env.state.labels,
  };
  return {
    useMapGetter: key => computed(getters[key]),
    useStore: () => env.store,
  };
});

const { useAlert, useTrack } = await import('dashboard/composables');

const P = 'CONTACTS_LAYOUT.HEADER.ACTIONS';

const dialogStub = (name, event, extra = {}) => ({
  name,
  emits: [event],
  data: () => ({ dialogRef: env.dialogs[name] }),
  methods: extra,
  template: '<div />',
});

const Header = {
  name: 'ContactHeader',
  props: [
    'showSearch',
    'searchValue',
    'activeSort',
    'activeOrdering',
    'headerTitle',
    'isSegmentsView',
    'isLabelView',
    'isActiveView',
    'hasActiveFilters',
    'buttonLabel',
  ],
  emits: [
    'search',
    'update:sort',
    'add',
    'import',
    'export',
    'filter',
    'createSegment',
    'deleteSegment',
  ],
  template: '<div><slot name="filter" /></div>',
};
const Filter = {
  name: 'ContactsFilter',
  props: ['modelValue', 'segmentName', 'isSegmentView'],
  emits: [
    'update:modelValue',
    'applyFilter',
    'updateSegment',
    'close',
    'clearFilters',
  ],
  template: '<div class="filter" />',
};

const mountWrapper = (props = {}) =>
  mount(HeaderWrapper, {
    props,
    global: {
      stubs: {
        ContactsHeader: Header,
        ContactsFilter: Filter,
        CreateNewContactDialog: dialogStub('CreateNewContactDialog', 'create', {
          onSuccess: () => env.onSuccess(),
        }),
        ContactExportDialog: dialogStub('ContactExportDialog', 'export'),
        ContactImportDialog: dialogStub('ContactImportDialog', 'import'),
        CreateSegmentDialog: dialogStub('CreateSegmentDialog', 'create'),
        DeleteSegmentDialog: dialogStub('DeleteSegmentDialog', 'delete'),
      },
    },
  });

const header = wrapper => wrapper.findComponent(Header);
const filter = wrapper => wrapper.findComponent(Filter);
const dialog = (wrapper, name) => wrapper.findComponent({ name });

describe('ContactListHeaderWrapper behaviour', () => {
  beforeEach(() => {
    env.router = { push: vi.fn() };
    env.store = { dispatch: vi.fn(async () => ({})) };
    env.onSuccess = vi.fn();
    env.dialogs = Object.fromEntries(
      [
        'CreateNewContactDialog',
        'ContactExportDialog',
        'ContactImportDialog',
        'CreateSegmentDialog',
        'DeleteSegmentDialog',
      ].map(name => [name, { open: vi.fn(), close: vi.fn() }])
    );
    env.state = reactive({
      applied: [{ attributeKey: 'email', filterOperator: 'contains' }],
      attributes: [{ attributeKey: 'plan' }],
      labels: [{ title: 'vip' }],
    });
  });

  it('passes header props and forwards search and sort', () => {
    const wrapper = mountWrapper({
      headerTitle: 'Contacts',
      searchValue: 'ann',
      isLabelView: true,
      hasAppliedFilters: true,
    });
    expect(header(wrapper).props()).toMatchObject({
      showSearch: true,
      searchValue: 'ann',
      activeSort: 'last_activity_at',
      headerTitle: 'Contacts',
      // `activeSegment && …` yields null, not false, without a segment.
      isSegmentsView: null,
      isLabelView: true,
      hasActiveFilters: true,
      buttonLabel: 'CONTACTS_LAYOUT.HEADER.MESSAGE_BUTTON',
    });
    header(wrapper).vm.$emit('search', 'bob');
    header(wrapper).vm.$emit('update:sort', 'name');
    expect(wrapper.emitted('search')).toEqual([['bob']]);
    expect(wrapper.emitted('update:sort')).toEqual([['name']]);
  });

  it.each([
    ['add', 'CreateNewContactDialog'],
    ['import', 'ContactImportDialog'],
    ['export', 'ContactExportDialog'],
    ['createSegment', 'CreateSegmentDialog'],
    ['deleteSegment', 'DeleteSegmentDialog'],
  ])('opens the dialog for %s', (event, name) => {
    const wrapper = mountWrapper();
    header(wrapper).vm.$emit(event);
    expect(env.dialogs[name].open).toHaveBeenCalled();
  });

  describe('creating a contact', () => {
    it('creates and confirms', async () => {
      const wrapper = mountWrapper();
      dialog(wrapper, 'CreateNewContactDialog').vm.$emit('create', {
        name: 'Ann',
      });
      await flushPromises();
      expect(env.store.dispatch).toHaveBeenCalledWith('contacts/create', {
        name: 'Ann',
      });
      expect(env.onSuccess).toHaveBeenCalled();
      expect(useAlert).toHaveBeenCalledWith(
        `${P}.CONTACT_CREATION.SUCCESS_MESSAGE`
      );
    });

    it.each([
      [new DuplicateContactException(['email']), 'EMAIL_ADDRESS_DUPLICATE'],
      [
        new DuplicateContactException(['phone_number']),
        'PHONE_NUMBER_DUPLICATE',
      ],
      [new Error('boom'), 'ERROR_MESSAGE'],
    ])('explains failure %#', async (error, key) => {
      env.store.dispatch.mockRejectedValueOnce(error);
      const wrapper = mountWrapper();
      dialog(wrapper, 'CreateNewContactDialog').vm.$emit('create', {});
      await flushPromises();
      expect(useAlert).toHaveBeenCalledWith(`${P}.CONTACT_CREATION.${key}`);
      expect(env.onSuccess).not.toHaveBeenCalled();
    });

    it('stays silent for a duplicate on another field', async () => {
      env.store.dispatch.mockRejectedValueOnce(
        new DuplicateContactException(['identifier'])
      );
      const wrapper = mountWrapper();
      dialog(wrapper, 'CreateNewContactDialog').vm.$emit('create', {});
      await flushPromises();
      expect(useAlert).not.toHaveBeenCalled();
    });

    it('shows a server message as is', async () => {
      env.store.dispatch.mockRejectedValueOnce(
        new ExceptionWithMessage('Name too long')
      );
      const wrapper = mountWrapper();
      dialog(wrapper, 'CreateNewContactDialog').vm.$emit('create', {});
      await flushPromises();
      expect(useAlert).toHaveBeenCalledWith('Name too long');
    });
  });

  it('imports contacts and tracks the outcome', async () => {
    const wrapper = mountWrapper();
    const importer = dialog(wrapper, 'ContactImportDialog');
    importer.vm.$emit('import', 'FILE');
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenCalledWith('contacts/import', 'FILE');
    expect(env.dialogs.ContactImportDialog.close).toHaveBeenCalled();
    expect(useAlert).toHaveBeenCalledWith(
      `${P}.IMPORT_CONTACT.SUCCESS_MESSAGE`
    );
    expect(useTrack).toHaveBeenLastCalledWith('Imported contacts successfully');

    env.store.dispatch.mockRejectedValueOnce(new Error('Bad CSV'));
    importer.vm.$emit('import', 'FILE');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('Bad CSV');
    expect(useTrack).toHaveBeenLastCalledWith('Import contacts failed');

    env.store.dispatch.mockRejectedValueOnce({});
    importer.vm.$emit('import', 'FILE');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      `${P}.IMPORT_CONTACT.ERROR_MESSAGE`
    );
  });

  it('exports contacts', async () => {
    const wrapper = mountWrapper();
    const exporter = dialog(wrapper, 'ContactExportDialog');
    exporter.vm.$emit('export', { label: 'vip' });
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenCalledWith('contacts/export', {
      label: 'vip',
    });
    expect(useAlert).toHaveBeenCalledWith(
      `${P}.EXPORT_CONTACT.SUCCESS_MESSAGE`
    );

    env.store.dispatch.mockRejectedValueOnce(new Error('Too many'));
    exporter.vm.$emit('export', {});
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('Too many');

    env.store.dispatch.mockRejectedValueOnce(new Error(''));
    exporter.vm.$emit('export', {});
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      `${P}.EXPORT_CONTACT.ERROR_MESSAGE`
    );
  });

  describe('filters', () => {
    it('opens with a blank name filter, applies and closes', async () => {
      const wrapper = mountWrapper();
      expect(filter(wrapper).exists()).toBe(false);
      header(wrapper).vm.$emit('filter');
      await flushPromises();
      expect(filter(wrapper).props()).toMatchObject({
        isSegmentView: null,
        modelValue: [
          {
            attributeKey: 'name',
            filterOperator: 'equal_to',
            values: '',
            queryOperator: 'and',
            attributeModel: 'standard',
          },
        ],
      });

      filter(wrapper).vm.$emit('applyFilter', [{ attributeKey: 'email' }]);
      await flushPromises();
      expect(wrapper.emitted('applyFilter')).toEqual([
        [{ payload: ['email'] }],
      ]);
      expect(filter(wrapper).exists()).toBe(false);

      // The applied query becomes the new segment's query.
      dialog(wrapper, 'CreateSegmentDialog').vm.$emit('create', {
        name: 'Emails',
      });
      await flushPromises();
      expect(env.store.dispatch).toHaveBeenCalledWith('customViews/create', {
        name: 'Emails',
        query: { payload: ['email'] },
      });
    });

    it('re-opens with the applied filters and supports clear and close', async () => {
      const wrapper = mountWrapper({ hasAppliedFilters: true });
      wrapper.vm.onToggleFilters();
      await flushPromises();
      expect(filter(wrapper).props('modelValue')).toEqual([
        { attributeKey: 'email', filterOperator: 'contains' },
      ]);
      filter(wrapper).vm.$emit('clearFilters');
      await flushPromises();
      expect(wrapper.emitted('clearFilters')).toHaveLength(1);
      filter(wrapper).vm.$emit('close');
      await flushPromises();
      expect(filter(wrapper).exists()).toBe(false);
    });

    it('loads a segment query into the panel and updates the segment', async () => {
      const segment = {
        id: 5,
        name: 'VIPs',
        query: {
          payload: [
            {
              attribute_key: 'labels',
              filter_operator: 'equal_to',
              values: ['vip'],
              attribute_model: 'standard',
            },
            {
              attribute_key: 'city',
              filter_operator: 'is_present',
              values: 'x',
              query_operator: 'or',
              custom_attribute_type: 'text',
              timezone: 'UTC',
            },
          ],
        },
      };
      const wrapper = mountWrapper({ activeSegment: segment, segmentsId: 5 });
      expect(header(wrapper).props('isSegmentsView')).toBe(true);
      header(wrapper).vm.$emit('filter');
      await flushPromises();
      expect(filter(wrapper).props()).toMatchObject({
        segmentName: 'VIPs',
        isSegmentView: true,
      });
      expect(filter(wrapper).props('modelValue')).toEqual([
        {
          attributeKey: 'labels',
          timezone: undefined,
          attributeModel: 'standard',
          customAttributeType: undefined,
          filterOperator: 'equal_to',
          queryOperator: 'and',
          values: ['edited:labels'],
        },
        {
          attributeKey: 'city',
          timezone: 'UTC',
          attributeModel: undefined,
          customAttributeType: 'text',
          filterOperator: 'is_present',
          queryOperator: 'or',
          values: [],
        },
      ]);
      expect(env.editParams).toMatchObject({
        allCustomAttributes: [{ attribute_key: 'plan' }],
        labels: [{ title: 'vip' }],
      });
      expect(env.editParams.countries.length).toBeGreaterThan(0);

      filter(wrapper).vm.$emit(
        'updateSegment',
        [{ attributeKey: 'city' }],
        'Big VIPs'
      );
      await flushPromises();
      expect(env.store.dispatch).toHaveBeenCalledWith('customViews/update', {
        ...segment,
        name: 'Big VIPs',
        query: { payload: ['city'] },
      });
      expect(filter(wrapper).exists()).toBe(false);
    });

    it('passes no labels when none are loaded', async () => {
      env.state.labels = null;
      const wrapper = mountWrapper({
        activeSegment: {
          query: { payload: [{ attribute_key: 'labels', values: ['a'] }] },
        },
        segmentsId: '3',
      });
      header(wrapper).vm.$emit('filter');
      await flushPromises();
      expect(env.editParams.labels).toEqual([]);
    });

    it('opens empty for a segment without a query payload', async () => {
      const wrapper = mountWrapper({
        activeSegment: { name: 'Odd', query: {} },
        segmentsId: 2,
      });
      header(wrapper).vm.$emit('filter');
      await flushPromises();
      expect(filter(wrapper).props('modelValue')).toEqual([]);
    });

    it('ignores a segment while no segment id is selected', async () => {
      const wrapper = mountWrapper({ activeSegment: { name: 'X' } });
      expect(header(wrapper).props('isSegmentsView')).toBe(false);
      header(wrapper).vm.$emit('filter');
      await flushPromises();
      expect(filter(wrapper).props('modelValue')[0].attributeKey).toBe('name');
    });
  });

  describe('segments', () => {
    it('opens the created segment', async () => {
      env.store.dispatch.mockResolvedValueOnce({ data: { id: 12 } });
      const wrapper = mountWrapper();
      dialog(wrapper, 'CreateSegmentDialog').vm.$emit('create', { name: 'A' });
      await flushPromises();
      expect(env.dialogs.CreateSegmentDialog.close).toHaveBeenCalled();
      expect(useAlert).toHaveBeenCalledWith(
        `${P}.FILTERS.CREATE_SEGMENT.SUCCESS_MESSAGE`
      );
      expect(env.router.push).toHaveBeenCalledWith({
        name: 'contacts_dashboard_segments_index',
        params: { segmentId: 12 },
        query: { page: 1 },
      });
    });

    it('stays put without a new segment id, and reports failures', async () => {
      env.store.dispatch.mockResolvedValueOnce(undefined);
      const wrapper = mountWrapper();
      dialog(wrapper, 'CreateSegmentDialog').vm.$emit('create', { name: 'A' });
      await flushPromises();
      expect(env.router.push).not.toHaveBeenCalled();

      env.store.dispatch.mockRejectedValueOnce(new Error('dup'));
      dialog(wrapper, 'CreateSegmentDialog').vm.$emit('create', { name: 'A' });
      await flushPromises();
      expect(useAlert).toHaveBeenLastCalledWith(
        `${P}.FILTERS.CREATE_SEGMENT.ERROR_MESSAGE`
      );
    });

    it('deletes the active segment and goes back to all contacts', async () => {
      const wrapper = mountWrapper({ segmentsId: '7' });
      const deleter = dialog(wrapper, 'DeleteSegmentDialog');
      deleter.vm.$emit('delete', { filterType: 1 });
      await flushPromises();
      expect(env.store.dispatch).toHaveBeenCalledWith('customViews/delete', {
        id: 7,
        filterType: 1,
      });
      expect(env.router.push).toHaveBeenCalledWith({
        name: 'contacts_dashboard_index',
        query: { page: 1 },
      });
      expect(env.dialogs.DeleteSegmentDialog.close).toHaveBeenCalled();
      expect(useAlert).toHaveBeenCalledWith(
        `${P}.FILTERS.DELETE_SEGMENT.SUCCESS_MESSAGE`
      );

      env.store.dispatch.mockRejectedValueOnce(new Error('nope'));
      deleter.vm.$emit('delete', {});
      await flushPromises();
      expect(useAlert).toHaveBeenLastCalledWith(
        `${P}.FILTERS.DELETE_SEGMENT.ERROR_MESSAGE`
      );
    });
  });
});
