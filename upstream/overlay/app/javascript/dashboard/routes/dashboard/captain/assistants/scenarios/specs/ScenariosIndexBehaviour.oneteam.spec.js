/**
 * OneTeam behaviour spec for the Captain assistant scenarios page.
 *
 * Child components are stubbed. Covers loading scenarios and tools,
 * suggested examples (add one, add all, dismiss), search, bulk selection
 * and delete, and updating, toggling, deleting and adding scenarios with
 * their success and error alerts.
 */
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import ScenariosIndex from '../Index.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
}));
vi.mock('dashboard/composables', () => ({
  useAlert: (...args) => env.alert(...args),
}));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
  useMapGetter: name => env.getters[name],
}));
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({
    uiSettings: env.uiSettings,
    updateUISettings: (...args) => env.updateUISettings(...args),
  }),
}));
vi.mock('shared/composables/useMessageFormatter', () => ({
  useMessageFormatter: () => ({ formatMessage: text => `<p>${text}</p>` }),
}));

const stub = (name, props = [], template = '<div><slot /></div>') => ({
  name,
  props,
  emits: [
    'close',
    'add',
    'click',
    'bulkDelete',
    'update:modelValue',
    'select',
    'delete',
    'update',
    'toggle',
    'hover',
  ],
  template,
});

const stubs = {
  PageLayout: stub(
    'PageLayout',
    ['isFetching'],
    '<div><slot name="body" /></div>'
  ),
  SettingsHeader: stub('SettingsHeader'),
  SuggestedScenarios: stub(
    'SuggestedRules',
    ['items'],
    '<div class="suggested"><slot v-for="item in items" :item="item" /></div>'
  ),
  ScenariosCard: stub(
    'ScenariosCard',
    ['id', 'isUpdating', 'isSelected', 'selectable', 'enabled'],
    '<div class="card" />'
  ),
  BulkSelectBar: stub(
    'BulkSelectBar',
    ['modelValue', 'allItems', 'selectAllLabel', 'selectedCountLabel'],
    '<div><slot name="default-actions" /></div>'
  ),
  AddNewScenariosDialog: stub('AddNewScenariosDialog'),
  Button: stub('Button', ['label'], '<button @click="$emit(\'click\')" />'),
  Input: stub('Input', ['modelValue'], '<input class="search" />'),
};

const scenario = (id, extra = {}) => ({
  id,
  title: `Scenario ${id}`,
  description: `About ${id}`,
  instruction: `Do ${id}`,
  enabled: true,
  ...extra,
});

const mountPage = async () => {
  const wrapper = mount(ScenariosIndex, {
    global: { stubs, directives: { dompurifyHtml: {} } },
  });
  await flushPromises();
  return wrapper;
};

const cards = wrapper => wrapper.findAllComponents({ name: 'ScenariosCard' });
const bulk = wrapper => wrapper.findComponent({ name: 'BulkSelectBar' });
const alerts = () => env.alert.mock.calls.map(c => c[0]);

describe('Captain scenarios page behaviour', () => {
  beforeEach(() => {
    env.route = { params: { assistantId: '3' } };
    env.alert = vi.fn();
    env.dispatch = vi.fn(() => Promise.resolve());
    env.updateUISettings = vi.fn();
    env.uiSettings = ref({});
    env.getters = {
      'captainScenarios/getUIFlags': ref({ fetchingList: false }),
      'captainScenarios/getRecords': ref([
        scenario(1, { title: 'Refund request' }),
        scenario(2, { title: 'Buyer', description: 'Sales lead' }),
      ]),
    };
  });

  it('loads scenarios and tools for the assistant', async () => {
    const wrapper = await mountPage();
    expect(env.dispatch).toHaveBeenCalledWith('captainScenarios/get', {
      assistantId: 3,
    });
    expect(env.dispatch).toHaveBeenCalledWith('captainTools/getTools', {
      assistantId: 3,
    });
    expect(cards(wrapper).map(c => c.props('id'))).toEqual([1, 2]);
    expect(bulk(wrapper).props('selectAllLabel')).toBe(
      'CAPTAIN.ASSISTANTS.SCENARIOS.BULK_ACTION.SELECT_ALL'
    );
  });

  it('shows the suggested example and adds it alone or with add all', async () => {
    const wrapper = await mountPage();
    const suggested = wrapper.find('.suggested');
    expect(suggested.text()).toContain('Prospective Buyer');
    expect(suggested.text()).toContain(
      '@add_private_note, @add_label_to_conversation, @handoff'
    );

    await suggested.find('button').trigger('click');
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith(
      'captainScenarios/create',
      expect.objectContaining({
        assistantId: 3,
        title: 'Prospective Buyer',
        tools: ['add_private_note', 'add_label_to_conversation', 'handoff'],
      })
    );
    expect(alerts()).toContain('CAPTAIN.ASSISTANTS.SCENARIOS.API.ADD.SUCCESS');

    env.dispatch.mockClear();
    wrapper.findComponent({ name: 'SuggestedRules' }).vm.$emit('add');
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith(
      'captainScenarios/create',
      expect.objectContaining({ assistantId: 3, id: 1 })
    );
  });

  it('dismisses the suggestions and hides them once turned off', async () => {
    const wrapper = await mountPage();
    wrapper.findComponent({ name: 'SuggestedRules' }).vm.$emit('close');
    expect(env.updateUISettings).toHaveBeenCalledWith({
      show_scenarios_suggestions: false,
    });
    env.uiSettings.value = { show_scenarios_suggestions: false };
    await flushPromises();
    expect(wrapper.find('.suggested').exists()).toBe(false);
    env.uiSettings.value = null;
    await flushPromises();
    expect(wrapper.find('.suggested').exists()).toBe(true);
  });

  it('searches scenarios and shows a no-results message', async () => {
    const wrapper = await mountPage();
    const search = wrapper.findComponent({ name: 'Input' });
    search.vm.$emit('update:modelValue', 'refund');
    await flushPromises();
    expect(cards(wrapper).map(c => c.props('id'))).toEqual([1]);
    search.vm.$emit('update:modelValue', 'sales');
    await flushPromises();
    expect(cards(wrapper).map(c => c.props('id'))).toEqual([2]);
    search.vm.$emit('update:modelValue', 'zzzz');
    await flushPromises();
    expect(wrapper.text()).toContain(
      'CAPTAIN.ASSISTANTS.SCENARIOS.SEARCH_EMPTY_MESSAGE'
    );
    search.vm.$emit('update:modelValue', '   ');
    await flushPromises();
    expect(cards(wrapper)).toHaveLength(2);
  });

  it('shows the empty message without scenarios', async () => {
    env.getters['captainScenarios/getRecords'].value = [];
    const wrapper = await mountPage();
    expect(wrapper.text()).toContain(
      'CAPTAIN.ASSISTANTS.SCENARIOS.EMPTY_MESSAGE'
    );
    expect(wrapper.findComponent({ name: 'Input' }).exists()).toBe(false);
    expect(bulk(wrapper).props('selectAllLabel')).toBe(
      'CAPTAIN.ASSISTANTS.SCENARIOS.BULK_ACTION.SELECT_ALL'
    );
  });

  it('selects cards on hover and in bulk, then deletes them', async () => {
    const wrapper = await mountPage();
    cards(wrapper)[0].vm.$emit('hover', true);
    await flushPromises();
    expect(cards(wrapper)[0].props('selectable')).toBe(true);
    expect(cards(wrapper)[1].props('selectable')).toBe(false);
    cards(wrapper)[0].vm.$emit('hover', false);
    await flushPromises();
    expect(cards(wrapper)[0].props('selectable')).toBe(false);

    cards(wrapper)[0].vm.$emit('select', 1);
    await flushPromises();
    expect(cards(wrapper)[0].props('isSelected')).toBe(true);
    expect(cards(wrapper)[1].props('selectable')).toBe(true);
    expect(wrapper.findComponent({ name: 'Input' }).exists()).toBe(false);
    expect(bulk(wrapper).props('selectedCountLabel')).toBe(
      'CAPTAIN.ASSISTANTS.SCENARIOS.BULK_ACTION.SELECTED'
    );
    cards(wrapper)[1].vm.$emit('select', 2);
    await flushPromises();
    expect(bulk(wrapper).props('selectAllLabel')).toBe(
      'CAPTAIN.ASSISTANTS.SCENARIOS.BULK_ACTION.UNSELECT_ALL'
    );
    cards(wrapper)[1].vm.$emit('select', 2);
    await flushPromises();
    expect(cards(wrapper)[1].props('isSelected')).toBe(false);

    bulk(wrapper).vm.$emit('bulkDelete');
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('captainScenarios/delete', {
      id: 1,
      assistantId: 3,
    });
    expect(cards(wrapper)[0].props('isSelected')).toBe(false);

    bulk(wrapper).vm.$emit('bulkDelete', [2]);
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('captainScenarios/delete', {
      id: 2,
      assistantId: 3,
    });
    expect(alerts()).toContain(
      'CAPTAIN.ASSISTANTS.SCENARIOS.API.DELETE.SUCCESS'
    );

    bulk(wrapper).vm.$emit('update:modelValue', new Set([2]));
    await flushPromises();
    expect(cards(wrapper)[1].props('isSelected')).toBe(true);
  });

  it('updates a scenario with tools parsed from its instruction', async () => {
    const wrapper = await mountPage();
    cards(wrapper)[0].vm.$emit('update', {
      id: 1,
      instruction:
        'Use [a](tool://note) and [b](tool://note) then [c](tool://handoff)',
    });
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('captainScenarios/update', {
      id: 1,
      assistantId: 3,
      instruction:
        'Use [a](tool://note) and [b](tool://note) then [c](tool://handoff)',
      tools: ['note', 'handoff'],
    });
    expect(alerts()).toContain(
      'CAPTAIN.ASSISTANTS.SCENARIOS.API.UPDATE.SUCCESS'
    );

    cards(wrapper)[0].vm.$emit('update', { id: 1 });
    await flushPromises();
    expect(env.dispatch).toHaveBeenLastCalledWith(
      'captainScenarios/update',
      expect.objectContaining({ tools: [] })
    );
  });

  it.each([
    ['update', 'UPDATE', c => c.vm.$emit('update', { id: 1 })],
    ['delete', 'DELETE', c => c.vm.$emit('delete')],
  ])('alerts when %s fails', async (_, key, act) => {
    const wrapper = await mountPage();
    env.dispatch = vi.fn(() =>
      Promise.reject({ response: { message: 'Server says no' } })
    );
    act(cards(wrapper)[0]);
    await flushPromises();
    expect(alerts()).toContain('Server says no');
    env.dispatch = vi.fn(() => Promise.reject(new Error('x')));
    act(cards(wrapper)[0]);
    await flushPromises();
    expect(alerts()).toContain(`CAPTAIN.ASSISTANTS.SCENARIOS.API.${key}.ERROR`);
  });

  it('deletes a single scenario', async () => {
    const wrapper = await mountPage();
    cards(wrapper)[1].vm.$emit('delete');
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('captainScenarios/delete', {
      id: 2,
      assistantId: 3,
    });
    expect(alerts()).toContain(
      'CAPTAIN.ASSISTANTS.SCENARIOS.API.DELETE.SUCCESS'
    );
  });

  it('toggles a scenario once at a time with the right alerts', async () => {
    const wrapper = await mountPage();
    let finish;
    env.dispatch = vi.fn(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    cards(wrapper)[0].vm.$emit('toggle', { id: 1, enabled: false });
    await flushPromises();
    expect(cards(wrapper)[0].props('isUpdating')).toBe(true);
    cards(wrapper)[0].vm.$emit('toggle', { id: 1, enabled: true });
    expect(env.dispatch).toHaveBeenCalledTimes(1);
    finish();
    await flushPromises();
    expect(cards(wrapper)[0].props('isUpdating')).toBe(false);
    expect(alerts()).toContain(
      'CAPTAIN.ASSISTANTS.SCENARIOS.API.TOGGLE.DISABLED'
    );

    env.dispatch = vi.fn(() => Promise.resolve());
    cards(wrapper)[0].vm.$emit('toggle', { id: 1, enabled: true });
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('captainScenarios/update', {
      id: 1,
      assistantId: 3,
      enabled: true,
    });
    expect(alerts()).toContain(
      'CAPTAIN.ASSISTANTS.SCENARIOS.API.TOGGLE.ENABLED'
    );

    env.dispatch = vi.fn(() => Promise.reject(new Error('x')));
    cards(wrapper)[0].vm.$emit('toggle', { id: 1, enabled: false });
    await flushPromises();
    expect(alerts()).toContain('CAPTAIN.ASSISTANTS.SCENARIOS.API.TOGGLE.ERROR');
    expect(cards(wrapper)[0].props('isUpdating')).toBe(false);
  });

  it('adds a scenario from the dialog and alerts on failure', async () => {
    const wrapper = await mountPage();
    const dialog = wrapper.findComponent({ name: 'AddNewScenariosDialog' });
    dialog.vm.$emit('add', { title: 'New', instruction: '[x](tool://ping)' });
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('captainScenarios/create', {
      assistantId: 3,
      title: 'New',
      instruction: '[x](tool://ping)',
      tools: ['ping'],
    });
    env.dispatch = vi.fn(() =>
      Promise.reject({ response: { message: 'Limit reached' } })
    );
    dialog.vm.$emit('add', { title: 'Again' });
    await flushPromises();
    expect(alerts()).toContain('Limit reached');
    env.dispatch = vi.fn(() => Promise.reject(new Error('x')));
    dialog.vm.$emit('add', { title: 'Again' });
    await flushPromises();
    expect(alerts()).toContain('CAPTAIN.ASSISTANTS.SCENARIOS.API.ADD.ERROR');
  });

  it('reloads tools when the assistant changes', async () => {
    env.route = { params: { assistantId: '3' } };
    const route = ref(env.route);
    env.route = new Proxy({}, { get: (_, key) => route.value[key] });
    await mountPage();
    route.value = { params: { assistantId: '4' } };
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('captainTools/getTools', {
      assistantId: 4,
    });
  });
});
