/**
 * OneTeam behaviour spec for the contact's company picker.
 *
 * Covers loading companies when the list opens, searching (and a failed
 * or empty search), keeping the linked company visible before it loads,
 * offering "Add <name>" for a new name but not for an existing one,
 * picking and clearing a company, creating one from the dialog (success
 * and failure), and the details-view styling.
 */
import { flushPromises, mount } from '@vue/test-utils';
import CompanyAPI from 'dashboard/api/companies';
import { useAlert } from 'dashboard/composables';
import CompanySelector from '../CompanySelector.vue';

const env = vi.hoisted(() => ({ log: [] }));

vi.mock('dashboard/api/companies', () => ({
  default: { get: vi.fn(), search: vi.fn(), create: vi.fn() },
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  useDebounceFn: fn => fn,
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({
    t: (key, params) => (params ? `${key} ${params.name}` : key),
  }),
}));

const ComboBox = {
  name: 'ComboBox',
  props: ['modelValue', 'options', 'displayLabel'],
  emits: ['open', 'search', 'update:modelValue'],
  template: '<div class="combo" />',
};
const CreateDialog = {
  name: 'CompanyCreateDialog',
  props: ['isLoading'],
  emits: ['create'],
  methods: {
    open(company) {
      env.log.push(['open', company]);
    },
    onSuccess() {
      env.log.push(['success']);
    },
  },
  template: '<div class="dialog" />',
};

const companies = [
  { id: 1, name: 'Acme' },
  { id: 2, name: 'Globex' },
];

const mountSelector = props => {
  const wrapper = mount(CompanySelector, {
    props,
    global: { stubs: { ComboBox, CompanyCreateDialog: CreateDialog } },
  });
  return { wrapper, combo: wrapper.findComponent(ComboBox) };
};
const labels = combo => combo.props('options').map(o => o.label);

beforeEach(() => {
  env.log = [];
  CompanyAPI.get.mockResolvedValue({ data: { payload: companies } });
  CompanyAPI.search.mockResolvedValue({ data: { payload: [companies[1]] } });
});

describe('CompanySelector behaviour', () => {
  it('loads companies when the list opens', async () => {
    const { combo } = mountSelector({});
    expect(combo.props('options')).toEqual([]);
    combo.vm.$emit('open');
    await flushPromises();
    expect(CompanyAPI.get).toHaveBeenCalledWith({ page: 1 });
    expect(combo.props('options')).toEqual([
      { label: 'Acme', value: 1 },
      { label: 'Globex', value: 2 },
    ]);
  });

  it('searches, offering to add a new name only', async () => {
    const { combo } = mountSelector({});
    combo.vm.$emit('search', ' Glob ');
    await flushPromises();
    expect(CompanyAPI.search).toHaveBeenCalledWith('Glob');
    expect(labels(combo)).toEqual([
      'Globex',
      'COMPANIES.SELECTOR.CREATE_OPTION Glob',
    ]);
    combo.vm.$emit('search', 'globex');
    await flushPromises();
    expect(labels(combo)).toEqual(['Globex']);
    combo.vm.$emit('search', undefined);
    await flushPromises();
    expect(CompanyAPI.get).toHaveBeenCalled();
  });

  it('empties the list when a search fails or returns nothing', async () => {
    const { combo } = mountSelector({});
    combo.vm.$emit('open');
    await flushPromises();
    CompanyAPI.get.mockResolvedValueOnce({ data: {} });
    combo.vm.$emit('open');
    await flushPromises();
    expect(combo.props('options')).toEqual([]);
    CompanyAPI.search.mockRejectedValueOnce(new Error('down'));
    combo.vm.$emit('search', 'x');
    await flushPromises();
    expect(labels(combo)).toEqual(['COMPANIES.SELECTOR.CREATE_OPTION x']);
  });

  it('keeps the linked company visible before the list loads', async () => {
    const { combo } = mountSelector({
      modelValue: '7',
      selectedName: 'Initech',
    });
    expect(combo.props('options')).toEqual([{ label: 'Initech', value: 7 }]);
    expect(combo.props('displayLabel')).toBe('Initech');
    combo.vm.$emit('open');
    await flushPromises();
    expect(labels(combo)).toEqual(['Initech', 'Acme', 'Globex']);

    const { combo: loaded } = mountSelector({
      modelValue: 1,
      selectedName: 'Acme',
    });
    loaded.vm.$emit('open');
    await flushPromises();
    expect(labels(loaded)).toEqual(['Acme', 'Globex']);
  });

  it('shows a name-only entry when no id is linked', () => {
    const { combo } = mountSelector({ selectedName: 'Pending Co' });
    expect(combo.props('options')).toEqual([
      { label: 'Pending Co', value: '' },
    ]);
  });

  it('picks and clears a company', async () => {
    const { wrapper, combo } = mountSelector({});
    combo.vm.$emit('open');
    await flushPromises();
    combo.vm.$emit('update:modelValue', '2');
    combo.vm.$emit('update:modelValue', 99);
    combo.vm.$emit('update:modelValue', '');
    expect(wrapper.emitted('select')).toEqual([
      [{ id: 2, name: 'Globex' }],
      [{ id: 99, name: '' }],
      [{ id: '', name: '' }],
    ]);
  });

  it('opens the create dialog for a new name and creates it', async () => {
    const { wrapper, combo } = mountSelector({});
    combo.vm.$emit('search', 'Umbrella');
    await flushPromises();
    combo.vm.$emit('update:modelValue', 'create:Umbrella');
    await flushPromises();
    expect(env.log).toEqual([['open', { name: 'Umbrella' }]]);
    expect(labels(combo)).toEqual(['Globex']);

    CompanyAPI.create.mockResolvedValue({
      data: { payload: { id: 5, name: 'Umbrella' } },
    });
    const dialog = wrapper.findComponent(CreateDialog);
    dialog.vm.$emit('create', { name: 'Umbrella' });
    await flushPromises();
    expect(CompanyAPI.create).toHaveBeenCalledWith({
      company: { name: 'Umbrella' },
    });
    expect(env.log.at(-1)).toEqual(['success']);
    expect(wrapper.emitted('select')).toEqual([[{ id: 5, name: 'Umbrella' }]]);
    expect(useAlert).toHaveBeenCalledWith('COMPANIES.CREATE.MESSAGES.SUCCESS');
    expect(dialog.props('isLoading')).toBe(false);
  });

  it('alerts when creating fails', async () => {
    const { wrapper } = mountSelector({ isDetailsView: true });
    expect(wrapper.findComponent(ComboBox).classes()).toContain(
      '[&>div>button]:!bg-n-alpha-black2'
    );
    CompanyAPI.create.mockRejectedValue(new Error('taken'));
    wrapper.findComponent(CreateDialog).vm.$emit('create', { name: 'X' });
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('COMPANIES.CREATE.MESSAGES.ERROR');
    expect(wrapper.emitted('select')).toBeUndefined();
  });
});
