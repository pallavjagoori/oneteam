/**
 * OneTeam behaviour spec for the automation rule side panel form.
 *
 * Covers opening the panel (wait shown in days, hours or minutes),
 * cancelling and closing, status and inbox options, disabled attribute
 * types, clearing errors after edits, syncing custom attribute types,
 * saving (payload, delay stripped without the feature, invalid delay,
 * failed condition validation, wait vs instant validation), changing the
 * event clears the monitor, and monitor loading (paging, refetch when the
 * account changes while open, failures).
 */
import { nextTick, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import MonitorsAPI from 'dashboard/api/monitors';
import AutomationRuleForm from '../AutomationRuleForm.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({
    accountId: env.accountId,
    isCloudFeatureEnabled: feature => env.features.has(feature),
    isOnChatwootCloud: ref(true),
  }),
}));
vi.mock('dashboard/composables/useConfig', () => ({
  useConfig: () => ({ isEnterprise: false }),
}));
vi.mock('dashboard/api/monitors', () => ({ default: { get: vi.fn() } }));
vi.mock('dashboard/components-next/filter/operators', () => ({
  useOperators: () => ({ operators: { value: {} } }),
}));

const SidePanel = {
  name: 'SidePanel',
  props: ['title'],
  emits: ['close'],
  methods: {
    open: () => env.panel.push('open'),
    close: () => env.panel.push('close'),
  },
  template: '<div><slot /><slot name="footer" /></div>',
};
const withValidation = name => ({
  name,
  props: ['isSavedWait', 'events', 'filterTypes', 'statusOptions', 'inboxOptions', 'onEventChange', 'delay', 'unit', 'hasError', 'errors'],
  emits: ['update:delay', 'update:conditions'],
  methods: {
    validate: () => env.validate[name],
    resetValidation: () => env.resets.push(name),
  },
  template: '<div><slot /></div>',
});
const Instant = withValidation('AutomationInstantTrigger');
const Wait = withValidation('AutomationWaitCondition');
const RunType = {
  name: 'AutomationRunTypeSelector',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<div />',
};
const MonitorSelect = {
  name: 'AutomationMonitorSelect',
  props: ['options', 'loading', 'error'],
  emits: ['retry'],
  template: '<div />',
};

const automationTypes = {
  conversation_created: {
    conditions: [
      { key: 'status', name: 'STATUS', inputType: 'multi_select', filterOperators: [{ value: 'equal_to' }] },
      { key: 'mail_subject', name: 'SUBJECT', disabled: true },
      { key: 'plan', name: 'Plan', customAttributeType: 'contact_attribute', filterOperators: [] },
    ],
  },
  monitor_matched: { conditions: [] },
};

const rule = (overrides = {}) => ({
  name: 'Rule',
  description: 'Does things',
  event_name: 'conversation_created',
  conditions: [
    { attribute_key: 'status', filter_operator: 'equal_to', values: [{ id: 'open', name: 'Open' }], query_operator: 'and' },
    { attribute_key: 'plan', filter_operator: 'equal_to', values: 'pro', query_operator: 'and' },
    { attribute_key: 'gone', filter_operator: 'equal_to', values: 'x', query_operator: 'and' },
  ],
  actions: [{ action_name: 'resolve_conversation', action_params: [] }],
  monitor_id: 3,
  ...overrides,
});

const mountForm = (props = {}) => {
  const wrapper = mount(AutomationRuleForm, {
    props: {
      mode: 'edit',
      automation: rule(),
      'onUpdate:automation': value => wrapper.setProps({ automation: value }),
      automationTypes,
      getConditionDropdownValues: key =>
        ({
          status: [
            { id: 'all', name: 'All' },
            { id: 'open', name: 'Open' },
          ],
          inbox_id: [{ id: 1, name: 'Mail' }],
        })[key],
      getActionDropdownValues: () => [],
      appendNewCondition: vi.fn(),
      appendNewAction: vi.fn(),
      removeFilter: vi.fn(),
      removeAction: vi.fn(),
      resetAction: vi.fn(),
      onEventChange: env.onEventChange,
      ...props,
    },
    global: {
      stubs: {
        SidePanel,
        AutomationInstantTrigger: Instant,
        AutomationWaitCondition: Wait,
        AutomationRunTypeSelector: RunType,
        AutomationMonitorSelect: MonitorSelect,
        AutomationActions: { name: 'AutomationActions', props: ['actionTypes'], template: '<div />' },
        'woot-input': { name: 'WootInput', props: ['modelValue', 'error'], emits: ['update:modelValue'], template: '<input />' },
      },
    },
  });
  return wrapper;
};

const footerButtons = wrapper => wrapper.findAll('button');
const monitorPage = (ids, total) => ({
  data: { payload: ids.map(id => ({ id, name: `M${id}`, extra: 1 })), meta: { total_count: total } },
});

describe('Automation rule form behaviour', () => {
  beforeEach(() => {
    env.features = new Set(['delayed_automations', 'reports', 'conversation_monitors', 'automations']);
    env.accountId = ref(1);
    env.panel = [];
    env.resets = [];
    env.validate = { AutomationInstantTrigger: true, AutomationWaitCondition: true };
    env.onEventChange = vi.fn();
    MonitorsAPI.get.mockResolvedValue(monitorPage([], 0));
  });

  it('opens with the saved wait in the largest whole unit', async () => {
    const wrapper = mountForm();
    wrapper.vm.open(2880);
    await nextTick();
    expect(env.panel).toEqual(['open']);
    expect(wrapper.findComponent(Wait).props()).toMatchObject({
      unit: 'days',
      delay: 2880,
      isSavedWait: true,
      statusOptions: [{ value: 'open', label: 'Open' }],
      inboxOptions: [{ id: 1, name: 'Mail' }],
    });
    wrapper.vm.open(90);
    await nextTick();
    expect(wrapper.findComponent(Wait).props('unit')).toBe('minutes');
    wrapper.vm.open(120);
    await nextTick();
    expect(wrapper.findComponent(Wait).props('unit')).toBe('hours');
    wrapper.vm.open();
    await nextTick();
    expect(wrapper.findComponent(Wait).exists()).toBe(false);
  });

  it('uses empty option lists when the dropdown values are missing', async () => {
    const wrapper = mountForm({ getConditionDropdownValues: () => undefined });
    wrapper.vm.open(60);
    await nextTick();
    expect(wrapper.findComponent(Wait).props()).toMatchObject({
      statusOptions: [],
      inboxOptions: [],
    });
  });

  it('maps disabled and custom attribute types', () => {
    const wrapper = mountForm();
    const types = wrapper.findComponent(Instant).props('filterTypes');
    expect(types[1]).toEqual({ value: 'mail_subject', label: 'AUTOMATION.ATTRIBUTES.SUBJECT', disabled: true });
    expect(types[2]).toMatchObject({ label: 'Plan', attributeModel: 'contact_attribute', options: [] });
  });

  it('cancels and reports closing', async () => {
    const wrapper = mountForm();
    wrapper.vm.open();
    await footerButtons(wrapper)[0].trigger('click');
    expect(env.panel).toEqual(['open', 'close']);
    expect(env.resets).toContain('AutomationInstantTrigger');
    await wrapper.findComponent(SidePanel).vm.$emit('close');
    env.accountId.value = 2;
    await flushPromises();
    expect(MonitorsAPI.get).toHaveBeenCalledTimes(1);
  });

  it('saves a valid rule with synced attribute types', async () => {
    const wrapper = mountForm();
    wrapper.vm.open(120);
    await nextTick();
    await footerButtons(wrapper)[1].trigger('click');
    const [payload, mode] = wrapper.emitted('save')[0];
    expect(mode).toBe('edit');
    expect(payload.execution_delay).toBe(120);
    expect(payload.conditions.map(c => c.custom_attribute_type)).toEqual([
      '',
      'contact_attribute',
      '',
    ]);
  });

  it('drops the delay without the delayed automations feature', async () => {
    env.features.delete('delayed_automations');
    const wrapper = mountForm({ automation: rule({ execution_delay: 30 }) });
    wrapper.vm.open();
    await footerButtons(wrapper)[1].trigger('click');
    expect(wrapper.emitted('save')[0][0]).not.toHaveProperty('execution_delay');
  });

  it('blocks saving on an invalid delay or invalid conditions', async () => {
    const wrapper = mountForm();
    wrapper.vm.open(120);
    await nextTick();
    await wrapper.findComponent(Wait).vm.$emit('update:delay', Number.NaN);
    // The first save fills in custom attribute types, and that edit clears the errors again.
    await footerButtons(wrapper)[1].trigger('click');
    expect(wrapper.findComponent(Wait).props('hasError')).toBe(false);
    await footerButtons(wrapper)[1].trigger('click');
    expect(wrapper.emitted('save')).toBeUndefined();
    expect(wrapper.findComponent(Wait).props('hasError')).toBe(true);
    await wrapper.findComponent(Wait).vm.$emit('update:conditions', rule().conditions);
    await nextTick();
    expect(wrapper.findComponent(Wait).props('hasError')).toBe(false);
    await wrapper.findComponent(Wait).vm.$emit('update:delay', 60);
    env.validate.AutomationWaitCondition = false;
    await footerButtons(wrapper)[1].trigger('click');
    expect(wrapper.emitted('save')).toBeUndefined();
    env.validate.AutomationWaitCondition = true;
    await wrapper.findComponent(RunType).vm.$emit('update:modelValue', false);
    env.validate.AutomationInstantTrigger = undefined;
    await footerButtons(wrapper)[1].trigger('click');
    expect(wrapper.emitted('save')).toHaveLength(1);
  });

  it('clears the monitor when the instant event changes', () => {
    const wrapper = mountForm();
    wrapper.findComponent(Instant).props('onEventChange')();
    expect(env.onEventChange).toHaveBeenCalled();
    expect(wrapper.props('automation').monitor_id).toBe(null);
  });

  it('loads every page of active monitors and refetches on account change', async () => {
    MonitorsAPI.get
      .mockResolvedValueOnce(monitorPage([1], 41))
      .mockResolvedValueOnce(monitorPage([2], 41))
      .mockResolvedValueOnce(monitorPage([3], 41));
    const wrapper = mountForm({ automation: rule({ event_name: 'monitor_matched', conditions: [] }) });
    wrapper.vm.open();
    await flushPromises();
    expect(MonitorsAPI.get.mock.calls.map(([params]) => params.page)).toEqual([1, 2, 3]);
    expect(wrapper.findComponent(MonitorSelect).props('options')).toEqual([
      { id: 1, name: 'M1' },
      { id: 2, name: 'M2' },
      { id: 3, name: 'M3' },
    ]);
    MonitorsAPI.get.mockRejectedValueOnce(new Error('down'));
    env.accountId.value = 2;
    await flushPromises();
    expect(wrapper.findComponent(MonitorSelect).props('error')).toBe(true);
    await wrapper.findComponent(MonitorSelect).vm.$emit('retry');
    await flushPromises();
    expect(wrapper.findComponent(MonitorSelect).props('error')).toBe(false);
  });

  it('drops monitors fetched for a previous account', async () => {
    let finish;
    MonitorsAPI.get.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    const wrapper = mountForm({ automation: rule({ event_name: 'monitor_matched', conditions: [] }) });
    wrapper.vm.open();
    env.features.delete('reports');
    env.accountId.value = 5;
    await nextTick();
    env.features.add('reports');
    finish(monitorPage([9], 1));
    await flushPromises();
    expect(wrapper.findComponent(MonitorSelect).props('options')).not.toContainEqual({ id: 9, name: 'M9' });
  });
});
