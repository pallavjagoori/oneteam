/**
 * OneTeam behaviour spec for the automation rules list page.
 *
 * Covers the instant / delayed tabs, search, the delay-disabled banner,
 * opening the add and edit dialogs (including from monitor_id / edit_id
 * query params), saving with every error shape, cloning, deleting and
 * toggling rules through the confirm modal.
 */
import { reactive } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import AutomationIndex from '../Index.vue';
import AutomationRuleRow from '../AutomationRuleRow.vue';
import TabBar from 'dashboard/components-next/tabbar/TabBar.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key, args) => (args ? `${key}:${JSON.stringify(args)}` : key),
  }),
}));
vi.mock('dashboard/composables', () => ({
  useAlert: vi.fn(),
  useTrack: vi.fn(),
}));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({
    accountScopedRoute: (name, params) => ({ name, params }),
  }),
}));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
  useRouter: () => env.router,
}));
vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return {
    useStore: () => env.store,
    useMapGetter: () => computed(() => env.state.accountUi),
    useStoreGetters: () => ({
      'automations/getAutomations': computed(() => env.state.automations),
      'automations/getUIFlags': computed(() => env.state.uiFlags),
      getCurrentAccountId: computed(() => 1),
      'accounts/isFeatureEnabledonAccount': computed(
        () => (accountId, feature) =>
          accountId === 1 && env.state.features.includes(feature)
      ),
    }),
  };
});

const { useAlert, useTrack } = await import('dashboard/composables');

const instantRule = {
  id: 1,
  name: 'Assign VIPs',
  description: 'Route VIP chats',
  active: true,
};
const delayedRule = {
  id: 2,
  name: 'Nudge idle',
  description: 'Remind after a wait',
  execution_delay: 60,
  active: false,
};

const dialog = name => ({
  name,
  props: ['selectedResponse'],
  emits: ['saveAutomation'],
  methods: {
    open(...args) {
      env.calls.push([name, 'open', ...args]);
    },
    close() {
      env.calls.push([name, 'close']);
    },
  },
  template: '<div />',
});
const AddDialog = dialog('AddAutomationRule');
const EditDialog = dialog('EditAutomationRule');
const Header = {
  name: 'BaseSettingsHeader',
  props: ['searchQuery'],
  emits: ['update:searchQuery'],
  template:
    '<header><slot name="tabs" /><div class="count"><slot name="count" /></div><slot name="actions" /></header>',
};
const Table = {
  name: 'BaseTable',
  props: ['headers', 'items', 'noDataMessage'],
  template:
    '<div><slot name="header-2" header="Created" /><slot name="row" :items="items" /></div>',
};
const DeleteModal = {
  name: 'WootDeleteModal',
  props: [
    'show',
    'onClose',
    'onConfirm',
    'messageValue',
    'confirmText',
    'rejectText',
  ],
  template: '<div />',
};
const ConfirmModal = {
  name: 'WootConfirmModal',
  props: ['title', 'description'],
  methods: {
    showConfirmation() {
      return env.confirm();
    },
  },
  template: '<div />',
};
const Button = {
  name: 'Button',
  props: ['label'],
  emits: ['click'],
  template: '<button />',
};

const mountPage = async () => {
  const wrapper = mount(AutomationIndex, {
    global: {
      mocks: {
        $t: (key, args) => (args ? `${key}:${JSON.stringify(args)}` : key),
      },
      stubs: {
        SettingsLayout: {
          props: ['isLoading', 'noRecordsFound'],
          template:
            '<div><slot name="header" /><slot name="body" /><slot /></div>',
        },
        BaseSettingsHeader: Header,
        TabBar: true,
        BaseTable: Table,
        AutomationRuleRow: true,
        AddAutomationRule: AddDialog,
        EditAutomationRule: EditDialog,
        WootDeleteModal: DeleteModal,
        WootConfirmModal: ConfirmModal,
        Button,
      },
    },
  });
  await flushPromises();
  return wrapper;
};

const rows = wrapper => wrapper.findAllComponents(AutomationRuleRow);
const table = wrapper => wrapper.findComponent(Table);
const tabBar = wrapper => wrapper.findComponent(TabBar);
const dispatched = name =>
  env.store.dispatch.mock.calls.filter(c => c[0] === name);
const dialogCalls = name => env.calls.filter(c => c[0] === name);

beforeEach(() => {
  env.state = reactive({
    automations: [instantRule, delayedRule],
    uiFlags: { isFetching: false },
    features: ['delayed_automations'],
    accountUi: { isFetchingItem: false },
  });
  env.route = reactive({ query: {} });
  env.router = { replace: vi.fn(), push: vi.fn() };
  env.calls = [];
  env.confirm = () => Promise.resolve(true);
  env.responses = {};
  env.store = {
    dispatch: vi.fn(async (action, payload) => {
      const response = env.responses[action];
      if (response instanceof Error) throw response;
      return typeof response === 'function' ? response(payload) : response;
    }),
  };
  vi.clearAllMocks();
});

describe('Automation list', () => {
  it('loads everything it needs on mount', async () => {
    await mountPage();
    expect(env.store.dispatch.mock.calls.map(c => c[0])).toEqual([
      'inboxes/get',
      'agents/get',
      'contacts/get',
      'teams/get',
      'labels/get',
      'campaigns/get',
      'automations/get',
    ]);
  });

  it('splits instant and delayed rules into tabs', async () => {
    const wrapper = await mountPage();
    expect(tabBar(wrapper).props('tabs')).toEqual([
      { key: 'instant', label: 'AUTOMATION.LIST.TABS.INSTANT', count: 1 },
      { key: 'delayed', label: 'AUTOMATION.LIST.TABS.DELAYED', count: 1 },
    ]);
    expect(rows(wrapper).map(r => r.props('automation').id)).toEqual([1]);
    expect(wrapper.find('.count').text()).toBe('AUTOMATION.COUNT:{"n":1}');
    expect(table(wrapper).props('headers')).toHaveLength(3);
    expect(wrapper.text()).toContain('Created');

    await tabBar(wrapper).vm.$emit('tabChanged', { key: 'delayed' });
    expect(rows(wrapper).map(r => r.props('automation').id)).toEqual([2]);
    expect(tabBar(wrapper).props('initialActiveTab')).toBe(1);
  });

  it('shows the right empty message per tab and search', async () => {
    env.state.automations = [];
    const wrapper = await mountPage();
    expect(table(wrapper).props('noDataMessage')).toBe('AUTOMATION.LIST.404');
    expect(wrapper.find('.count').text()).toBe('');
    await tabBar(wrapper).vm.$emit('tabChanged', { key: 'delayed' });
    expect(table(wrapper).props('noDataMessage')).toBe(
      'AUTOMATION.LIST.404_DELAYED'
    );
    await wrapper.findComponent(Header).vm.$emit('update:searchQuery', 'x');
    expect(table(wrapper).props('noDataMessage')).toBe('AUTOMATION.NO_RESULTS');
  });

  it('shows a plain list without the delayed feature or delayed rules', async () => {
    env.state.features = [];
    env.state.automations = [instantRule];
    const wrapper = await mountPage();
    expect(tabBar(wrapper).exists()).toBe(false);
    expect(rows(wrapper)).toHaveLength(1);
    expect(table(wrapper).props('noDataMessage')).toBe('AUTOMATION.LIST.404');
  });

  it('keeps tabs and warns when delayed rules exist without the feature', async () => {
    env.state.features = [];
    const wrapper = await mountPage();
    expect(tabBar(wrapper).exists()).toBe(true);
    expect(wrapper.text()).toContain('AUTOMATION.LIST.DELAY_DISABLED_BANNER');
  });

  it('searches rules', async () => {
    const wrapper = await mountPage();
    const header = wrapper.findComponent(Header);
    await header.vm.$emit('update:searchQuery', 'idle');
    expect(
      tabBar(wrapper)
        .props('tabs')
        .map(tab => tab.count)
    ).toEqual([0, 1]);
    await header.vm.$emit('update:searchQuery', '  ');
    expect(
      tabBar(wrapper)
        .props('tabs')
        .map(tab => tab.count)
    ).toEqual([1, 1]);
  });
});

describe('Automation SLA options', () => {
  it('fetches SLAs when the feature is on and reuses them for editing', async () => {
    env.state.features = ['sla'];
    const wrapper = await mountPage();
    expect(dispatched('sla/get')).toHaveLength(1);
    await rows(wrapper)[0].vm.$emit('edit', instantRule);
    await flushPromises();
    expect(dispatched('sla/get')).toHaveLength(1);
    expect(dialogCalls('EditAutomationRule')).toEqual([
      ['EditAutomationRule', 'open', instantRule],
    ]);
  });

  it('fetches SLAs once the feature flag loads later', async () => {
    env.state.features = [];
    const wrapper = await mountPage();
    expect(dispatched('sla/get')).toHaveLength(0);
    env.state.features = ['sla'];
    await flushPromises();
    expect(dispatched('sla/get')).toHaveLength(1);
    env.state.features = [];
    await flushPromises();
    await rows(wrapper)[0].vm.$emit('edit', instantRule);
    await flushPromises();
    expect(dispatched('sla/get')).toHaveLength(1);
  });
});

describe('Automation dialogs', () => {
  it('opens the add dialog with a default wait on the delayed tab', async () => {
    const wrapper = await mountPage();
    const add = wrapper.findComponent(Button);
    await add.vm.$emit('click');
    await tabBar(wrapper).vm.$emit('tabChanged', { key: 'delayed' });
    await add.vm.$emit('click');
    expect(dialogCalls('AddAutomationRule')).toEqual([
      ['AddAutomationRule', 'open', null, null],
      ['AddAutomationRule', 'open', 240, null],
    ]);
  });

  it('opens the add dialog for a monitor from the URL', async () => {
    env.route.query = { monitor_id: '12', tab: 'x' };
    await mountPage();
    expect(dialogCalls('AddAutomationRule')).toEqual([
      ['AddAutomationRule', 'open', null, 12],
    ]);
    expect(env.router.replace).toHaveBeenCalledWith({
      query: { monitor_id: undefined, tab: 'x' },
    });
  });

  it('ignores invalid monitor ids', async () => {
    env.route.query = { monitor_id: 'abc' };
    await mountPage();
    expect(dialogCalls('AddAutomationRule')).toHaveLength(0);
  });

  it('opens a rule for editing from the URL once it has loaded', async () => {
    env.state.automations = [];
    env.route.query = { edit_id: '2' };
    await mountPage();
    expect(dialogCalls('EditAutomationRule')).toHaveLength(0);
    env.state.automations = [instantRule, delayedRule];
    await flushPromises();
    expect(dialogCalls('EditAutomationRule')).toEqual([
      ['EditAutomationRule', 'open', delayedRule],
    ]);
    expect(env.router.replace).toHaveBeenCalledWith({
      query: { edit_id: undefined },
    });
  });

  it('ignores non-string edit ids', async () => {
    env.route.query = { edit_id: ['1'] };
    await mountPage();
    expect(dialogCalls('EditAutomationRule')).toHaveLength(0);
  });
});

describe('Automation saving', () => {
  const save = async (wrapper, dialogComponent, payload, mode) => {
    await wrapper
      .findComponent(dialogComponent)
      .vm.$emit('saveAutomation', payload, mode);
    await flushPromises();
  };
  const plain = { name: 'Rule', event_name: 'message_created', conditions: [] };

  it('creates a rule and closes both dialogs', async () => {
    const wrapper = await mountPage();
    await save(wrapper, AddDialog, plain, 'add');
    expect(dispatched('automations/create')[0][1]).toEqual(plain);
    expect(useAlert).toHaveBeenCalledWith('AUTOMATION.ADD.API.SUCCESS_MESSAGE');
    expect(useTrack).not.toHaveBeenCalled();
    expect(dialogCalls('AddAutomationRule').at(-1)).toEqual([
      'AddAutomationRule',
      'close',
    ]);
    expect(env.router.push).not.toHaveBeenCalled();
  });

  it('updates a rule and tracks Captain conditions', async () => {
    const wrapper = await mountPage();
    const payload = {
      ...plain,
      conditions: [
        { attribute_key: 'captain_condition', filter_operator: 'equal_to' },
        { attribute_key: 'status', filter_operator: 'equal_to' },
      ],
    };
    await save(wrapper, EditDialog, payload, 'edit');
    expect(dispatched('automations/update')[0][1]).toEqual(payload);
    expect(useTrack).toHaveBeenCalledWith(expect.any(String), {
      mode: 'edit',
      eventName: 'message_created',
      captainConditions: 1,
      totalConditions: 2,
      operators: ['equal_to'],
    });
    expect(useAlert).toHaveBeenCalledWith(
      'AUTOMATION.EDIT.API.SUCCESS_MESSAGE'
    );
  });

  it('returns to the monitor a rule was created from', async () => {
    env.route.query = { monitor_id: '12' };
    const wrapper = await mountPage();
    await save(wrapper, AddDialog, plain, 'add');
    expect(env.router.push).toHaveBeenCalledWith({
      name: 'monitor_reports_show',
      params: { monitorId: 12 },
    });
    env.router.push.mockClear();
    await save(wrapper, AddDialog, plain, 'add');
    expect(env.router.push).not.toHaveBeenCalled();
  });

  it.each([
    ['add', undefined, 'AUTOMATION.ADD.API.ERROR_MESSAGE'],
    ['edit', undefined, 'AUTOMATION.EDIT.API.ERROR_MESSAGE'],
    [
      'add',
      'monitor_not_available',
      'AUTOMATION.ADD.FORM.MONITOR.API_UNAVAILABLE',
    ],
    [
      'edit',
      'invalid_monitor_id',
      'AUTOMATION.ADD.FORM.MONITOR.API_UNAVAILABLE',
    ],
    ['add', 'Name taken', 'Name taken'],
    ['add', { nested: true }, 'AUTOMATION.ADD.API.ERROR_MESSAGE'],
  ])('reports %s failures with reason %o', async (mode, reason, message) => {
    const error = Object.assign(new Error('x'), {
      response: reason === undefined ? undefined : { data: { error: reason } },
    });
    env.responses[
      mode === 'edit' ? 'automations/update' : 'automations/create'
    ] = error;
    const wrapper = await mountPage();
    await save(wrapper, AddDialog, plain, mode);
    expect(useAlert).toHaveBeenCalledWith(message);
  });
});

describe('Automation row actions', () => {
  it('clones a rule and refreshes the list', async () => {
    const wrapper = await mountPage();
    await rows(wrapper)[0].vm.$emit('clone', instantRule);
    await flushPromises();
    expect(dispatched('automations/clone')[0][1]).toBe(1);
    expect(useAlert).toHaveBeenCalledWith(
      'AUTOMATION.CLONE.API.SUCCESS_MESSAGE'
    );
    expect(dispatched('automations/get')).toHaveLength(2);
  });

  it('reports a failed clone', async () => {
    env.responses['automations/clone'] = new Error('x');
    const wrapper = await mountPage();
    await rows(wrapper)[0].vm.$emit('clone', instantRule);
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('AUTOMATION.CLONE.API.ERROR_MESSAGE');
  });

  it.each([
    [undefined, 'AUTOMATION.DELETE.API.SUCCESS_MESSAGE'],
    [new Error('x'), 'AUTOMATION.DELETE.API.ERROR_MESSAGE'],
  ])('deletes a rule after confirmation', async (result, message) => {
    let finish;
    env.responses['automations/delete'] = () =>
      new Promise((resolve, reject) => {
        finish = () => (result ? reject(result) : resolve());
      });
    const wrapper = await mountPage();
    await rows(wrapper)[0].vm.$emit('delete', instantRule);
    const modal = wrapper.findComponent(DeleteModal);
    expect(modal.props()).toMatchObject({
      show: true,
      messageValue: ' Assign VIPs?',
      confirmText: 'AUTOMATION.DELETE.CONFIRM.YES Assign VIPs',
      rejectText: 'AUTOMATION.DELETE.CONFIRM.NO Assign VIPs',
    });
    modal.props('onConfirm')();
    await wrapper.vm.$nextTick();
    expect(rows(wrapper)[0].props('loading')).toBe(true);
    expect(wrapper.findComponent(DeleteModal).props('show')).toBe(false);
    finish();
    await flushPromises();
    expect(dispatched('automations/delete')[0][1]).toBe(1);
    expect(useAlert).toHaveBeenCalledWith(message);
    expect(rows(wrapper)[0].props('loading')).toBe(false);
  });

  it('closes the delete modal from its own controls', async () => {
    const wrapper = await mountPage();
    await rows(wrapper)[0].vm.$emit('delete', instantRule);
    await wrapper.findComponent(DeleteModal).vm.$emit('update:show', false);
    expect(wrapper.findComponent(DeleteModal).props('show')).toBe(false);
    await rows(wrapper)[0].vm.$emit('delete', instantRule);
    wrapper.findComponent(DeleteModal).props('onClose')();
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(DeleteModal).props('show')).toBe(false);
  });

  it.each([
    [
      instantRule,
      'AUTOMATION.TOGGLE.DEACTIVATION_TITLE',
      'AUTOMATION.TOGGLE.DEACTIVATION_SUCCESFUL',
      false,
    ],
    [
      { ...delayedRule, status: false },
      'AUTOMATION.TOGGLE.ACTIVATION_TITLE',
      'AUTOMATION.TOGGLE.ACTIVATION_SUCCESFUL',
      true,
    ],
  ])('toggles %o after confirmation', async (rule, title, message, active) => {
    const wrapper = await mountPage();
    const toggled = { ...rule, status: rule === instantRule };
    await rows(wrapper)[0].vm.$emit('toggle', toggled);
    await flushPromises();
    expect(wrapper.findComponent(ConfirmModal).props('title')).toBe(title);
    expect(wrapper.findComponent(ConfirmModal).props('description')).toContain(
      rule.name
    );
    expect(dispatched('automations/update')[0][1]).toEqual({
      id: rule.id,
      active,
    });
    expect(useAlert).toHaveBeenCalledWith(message);
  });

  it('does nothing when the toggle is not confirmed', async () => {
    env.confirm = () => Promise.resolve(false);
    const wrapper = await mountPage();
    await rows(wrapper)[0].vm.$emit('toggle', { ...instantRule, status: true });
    await flushPromises();
    expect(dispatched('automations/update')).toHaveLength(0);
  });

  it('reports a failed toggle', async () => {
    env.responses['automations/update'] = new Error('x');
    const wrapper = await mountPage();
    await rows(wrapper)[0].vm.$emit('toggle', { ...instantRule, status: true });
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('AUTOMATION.EDIT.API.ERROR_MESSAGE');
  });
});
