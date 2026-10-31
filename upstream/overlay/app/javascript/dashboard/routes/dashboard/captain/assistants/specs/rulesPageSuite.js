/**
 * Shared OneTeam behaviour suite for the Captain assistant rule pages
 * (response guidelines and guardrails), which only differ in their
 * attribute name, i18n keys and how "add all" saves.
 *
 * Each spec file mocks the store, alert, UI settings and route
 * composables onto the `env` object it passes in, then calls
 * `defineRulesPageSuite`.
 */
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';

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
    'edit',
    'hover',
  ],
  template,
});

const stubs = {
  SettingsPageLayout: stub('SettingsPageLayout'),
  SuggestedRules: stub(
    'SuggestedRules',
    ['items', 'title'],
    '<div class="suggested"><slot v-for="item in items" :item="item" /></div>'
  ),
  RuleCard: stub(
    'RuleCard',
    ['id', 'content', 'isSelected', 'selectable'],
    '<div class="card" />'
  ),
  BulkSelectBar: stub(
    'BulkSelectBar',
    ['modelValue', 'allItems', 'selectAllLabel', 'selectedCountLabel'],
    '<div><slot name="default-actions" /></div>'
  ),
  AddNewRulesDialog: stub('AddNewRulesDialog', ['modelValue']),
  AddNewRulesInput: stub('AddNewRulesInput', ['modelValue']),
  Button: stub('Button', ['label'], '<button @click="$emit(\'click\')" />'),
  Input: stub('Input', ['modelValue'], '<input class="search" />'),
};

/**
 * Defines the shared behaviour tests for one rule page.
 *
 * @param {object} config Page under test.
 * @param {object} config.component The page component.
 * @param {object} config.env Shared mock state used by the spec's mocks.
 * @param {string} config.attribute Assistant attribute holding the rules.
 * @param {string} config.i18n i18n key prefix under CAPTAIN.ASSISTANTS.
 * @param {string} config.suggestionsSetting UI setting that hides examples.
 * @param {boolean} config.addAllAwaits Whether "add all" awaits and alerts.
 */
export function defineRulesPageSuite({
  component,
  env,
  attribute,
  i18n,
  suggestionsSetting,
  addAllAwaits,
}) {
  const key = name => `CAPTAIN.ASSISTANTS.${i18n}.${name}`;
  const mountPage = async () => {
    const wrapper = mount(component, { global: { stubs } });
    await flushPromises();
    return wrapper;
  };
  const cards = wrapper => wrapper.findAllComponents({ name: 'RuleCard' });
  const bulk = wrapper => wrapper.findComponent({ name: 'BulkSelectBar' });
  const alerts = () => env.alert.mock.calls.map(c => c[0]);
  const saved = () => env.dispatch.mock.calls.at(-1)[1];

  beforeEach(() => {
    env.route = ref({ params: { assistantId: '3' } });
    env.alert = vi.fn();
    env.dispatch = vi.fn(() => Promise.resolve());
    env.updateUISettings = vi.fn();
    env.uiSettings = ref({});
    env.assistant = ref({ [attribute]: ['No refunds', 'Be polite'] });
  });

  it('lists the rules and labels bulk selection', async () => {
    const wrapper = await mountPage();
    expect(cards(wrapper).map(c => c.props('content'))).toEqual([
      'No refunds',
      'Be polite',
    ]);
    expect(bulk(wrapper).props('selectAllLabel')).toBe(
      key('BULK_ACTION.SELECT_ALL')
    );
  });

  it('shows the empty message without an assistant', async () => {
    env.assistant.value = null;
    const wrapper = await mountPage();
    expect(wrapper.text()).toContain(key('EMPTY_MESSAGE'));
    expect(wrapper.findComponent({ name: 'Input' }).exists()).toBe(false);
  });

  it('searches the rules', async () => {
    const wrapper = await mountPage();
    const search = wrapper.findComponent({ name: 'Input' });
    search.vm.$emit('update:modelValue', 'polite');
    await flushPromises();
    expect(cards(wrapper).map(c => c.props('id'))).toEqual([1]);
    search.vm.$emit('update:modelValue', 'zzzz');
    await flushPromises();
    expect(wrapper.text()).toContain(key('SEARCH_EMPTY_MESSAGE'));
    search.vm.$emit('update:modelValue', ' ');
    await flushPromises();
    expect(cards(wrapper)).toHaveLength(2);
  });

  it('adds a suggested rule, and dismisses the suggestions', async () => {
    const wrapper = await mountPage();
    const suggested = wrapper.find('.suggested');
    expect(suggested.findAll('button').length).toBeGreaterThan(0);
    await suggested.find('button').trigger('click');
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('captainAssistants/update', {
      id: 3,
      assistant: {
        [attribute]: ['No refunds', 'Be polite', expect.any(String)],
      },
    });
    expect(alerts()).toContain(key('API.ADD.SUCCESS'));

    wrapper.findComponent({ name: 'SuggestedRules' }).vm.$emit('close');
    expect(env.updateUISettings).toHaveBeenCalledWith({
      [suggestionsSetting]: false,
    });
    env.uiSettings.value = { [suggestionsSetting]: false };
    await flushPromises();
    expect(wrapper.find('.suggested').exists()).toBe(false);
    env.uiSettings.value = null;
    await flushPromises();
    expect(wrapper.find('.suggested').exists()).toBe(true);
  });

  it('adds all suggested rules at once', async () => {
    const wrapper = await mountPage();
    wrapper.findComponent({ name: 'SuggestedRules' }).vm.$emit('add');
    await flushPromises();
    expect(env.updateUISettings).toHaveBeenCalledWith({
      [suggestionsSetting]: false,
    });
    expect(saved().assistant[attribute]).toHaveLength(5);
    expect(alerts().includes(key('API.ADD.SUCCESS'))).toBe(addAllAwaits);
    if (addAllAwaits) {
      env.dispatch = vi.fn(() => Promise.reject(new Error('x')));
      wrapper.findComponent({ name: 'SuggestedRules' }).vm.$emit('add');
      await flushPromises();
      expect(alerts()).toContain(key('API.ADD.ERROR'));
    }
  });

  it('adds rules from the dialog and the inline input, alerting on failure', async () => {
    const wrapper = await mountPage();
    wrapper.findComponent({ name: 'AddNewRulesDialog' }).vm.$emit('add', 'One');
    await flushPromises();
    expect(saved().assistant[attribute]).toEqual([
      'No refunds',
      'Be polite',
      'One',
    ]);
    env.dispatch = vi.fn(() => Promise.reject(new Error('x')));
    wrapper.findComponent({ name: 'AddNewRulesInput' }).vm.$emit('add', 'Two');
    await flushPromises();
    expect(alerts()).toContain(key('API.ADD.ERROR'));
    // The v-models are wired to local refs.
    wrapper
      .findComponent({ name: 'AddNewRulesDialog' })
      .vm.$emit('update:modelValue', 'd');
    wrapper
      .findComponent({ name: 'AddNewRulesInput' })
      .vm.$emit('update:modelValue', 'i');
    await flushPromises();
    expect(
      wrapper.findComponent({ name: 'AddNewRulesDialog' }).props('modelValue')
    ).toBe('d');
    expect(
      wrapper.findComponent({ name: 'AddNewRulesInput' }).props('modelValue')
    ).toBe('i');
  });

  it('edits and deletes a rule, alerting on failure', async () => {
    const wrapper = await mountPage();
    cards(wrapper)[1].vm.$emit('edit', { id: 1, content: 'Be kind' });
    await flushPromises();
    expect(saved().assistant[attribute]).toEqual(['No refunds', 'Be kind']);
    expect(alerts()).toContain(key('API.UPDATE.SUCCESS'));
    cards(wrapper)[0].vm.$emit('delete', 0);
    await flushPromises();
    expect(saved().assistant[attribute]).toEqual(['Be polite']);
    expect(alerts()).toContain(key('API.DELETE.SUCCESS'));

    env.dispatch = vi.fn(() => Promise.reject(new Error('x')));
    cards(wrapper)[1].vm.$emit('edit', { id: 1, content: 'x' });
    cards(wrapper)[0].vm.$emit('delete', 0);
    await flushPromises();
    expect(alerts()).toContain(key('API.UPDATE.ERROR'));
    expect(alerts()).toContain(key('API.DELETE.ERROR'));
  });

  it('selects rules on hover and in bulk, then deletes them', async () => {
    const wrapper = await mountPage();
    cards(wrapper)[0].vm.$emit('hover', true);
    await flushPromises();
    expect(cards(wrapper)[0].props('selectable')).toBe(true);
    cards(wrapper)[0].vm.$emit('hover', false);
    await flushPromises();
    expect(cards(wrapper)[0].props('selectable')).toBe(false);

    // Nothing selected: bulk delete does nothing.
    bulk(wrapper).vm.$emit('bulkDelete');
    await flushPromises();
    expect(env.dispatch).not.toHaveBeenCalled();

    cards(wrapper)[0].vm.$emit('select', 0);
    cards(wrapper)[1].vm.$emit('select', 1);
    await flushPromises();
    expect(bulk(wrapper).props('selectAllLabel')).toBe(
      key('BULK_ACTION.UNSELECT_ALL')
    );
    expect(bulk(wrapper).props('selectedCountLabel')).toBe(
      key('BULK_ACTION.SELECTED')
    );
    expect(wrapper.findComponent({ name: 'Input' }).exists()).toBe(false);
    cards(wrapper)[1].vm.$emit('select', 1);
    await flushPromises();
    expect(cards(wrapper)[1].props('isSelected')).toBe(false);
    expect(cards(wrapper)[1].props('selectable')).toBe(true);

    bulk(wrapper).vm.$emit('bulkDelete');
    await flushPromises();
    expect(saved().assistant[attribute]).toEqual(['Be polite']);
    expect(alerts()).toContain(key('API.DELETE.SUCCESS'));
    expect(cards(wrapper)[0].props('isSelected')).toBe(false);

    bulk(wrapper).vm.$emit('update:modelValue', new Set([1]));
    env.dispatch = vi.fn(() => Promise.reject(new Error('x')));
    bulk(wrapper).vm.$emit('bulkDelete');
    await flushPromises();
    expect(alerts()).toContain(key('API.DELETE.ERROR'));
  });

  it('clears the selection when the assistant changes', async () => {
    const wrapper = await mountPage();
    cards(wrapper)[0].vm.$emit('hover', true);
    cards(wrapper)[1].vm.$emit('select', 1);
    await flushPromises();
    env.route.value = { params: { assistantId: '4' } };
    await flushPromises();
    expect(cards(wrapper)[1].props('isSelected')).toBe(false);
    expect(cards(wrapper)[0].props('selectable')).toBe(false);
  });
}
