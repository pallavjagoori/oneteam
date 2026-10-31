/**
 * OneTeam behaviour spec for the agent capacity policy edit page.
 *
 * Child components are stubbed. Covers loading the policy (only when it
 * is not in the store yet) and its users, building the form data and
 * the agent, label and inbox lists, breadcrumbs, saving, adding and
 * removing agents, and adding, updating and deleting inbox limits, each
 * with success and error alerts.
 */
import { computed, reactive } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import EditPage from '../AgentCapacityEditPage.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
  useRouter: () => env.router,
}));
vi.mock('dashboard/composables', () => ({
  useAlert: (...args) => env.alert(...args),
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
  useMapGetter: name => computed(() => env.state[name]),
}));
vi.mock('dashboard/helper/inbox', () => ({
  getInboxIconByType: (type, medium, variant, voice) =>
    `${type}|${medium}|${variant}|${voice}`,
}));

const Form = {
  name: 'AgentCapacityPolicyForm',
  props: [
    'initialData',
    'policyUsers',
    'agentList',
    'labelList',
    'inboxList',
    'isLoading',
    'isUsersLoading',
    'isInboxesLoading',
  ],
  emits: [
    'submit',
    'addUser',
    'deleteUser',
    'addInboxLimit',
    'updateInboxLimit',
    'deleteInboxLimit',
  ],
  template: '<div />',
};
const Breadcrumb = {
  name: 'Breadcrumb',
  props: ['items'],
  emits: ['click'],
  template: '<nav />',
};
const Layout = {
  name: 'SettingsLayout',
  props: ['isLoading'],
  template: '<div><slot name="header" /><slot name="body" /></div>',
};

const policy = {
  id: 5,
  name: 'Busy',
  description: 'Caps',
  exclusionRules: { excludedLabels: ['vip'], excludeOlderThanHours: 0 },
  inboxCapacityLimits: [{ id: 9, inboxId: 1, conversationLimit: 4 }],
  users: [{ id: 1, name: 'Ann', email: 'a@x', avatarUrl: 'a.png' }],
};

const mountPage = async ({ id = '5', stored = policy } = {}) => {
  env.route = reactive({ params: { id } });
  env.router = { push: vi.fn() };
  env.alert = vi.fn();
  env.dispatch = vi.fn().mockResolvedValue();
  env.state = reactive({
    'agentCapacityPolicies/getUIFlags': {
      isFetchingItem: false,
      isUpdating: true,
    },
    'agentCapacityPolicies/getUsersUIFlags': { isFetching: true },
    'agentCapacityPolicies/getAgentCapacityPolicyById': () => stored,
    'agents/getAgents': [
      { id: 1, name: 'Ann', email: 'a@x', thumbnail: 'a.png' },
      { id: 2, name: 'Bo', email: 'b@x', avatar_url: 'b.png' },
    ],
    'labels/getLabels': [{ id: 3, title: 'vip', color: '#f00' }],
    'inboxes/getAllInboxes': [
      { id: 2, name: 'Web', channelType: 'Channel::WebWidget' },
      {
        id: 1,
        name: 'Mail',
        email: 'm@x',
        channelType: 'Channel::Email',
        medium: 'smtp',
        voiceEnabled: false,
      },
    ],
    'inboxes/getUIFlags': { isFetching: false },
  });
  const wrapper = mount(EditPage, {
    global: {
      stubs: {
        SettingsLayout: Layout,
        Breadcrumb,
        AgentCapacityPolicyForm: Form,
      },
    },
  });
  await flushPromises();
  return wrapper;
};

const form = wrapper => wrapper.findComponent(Form);

describe('Agent capacity edit page behaviour', () => {
  it('loads users and builds the form', async () => {
    const wrapper = await mountPage();
    expect(env.dispatch.mock.calls).toEqual([
      ['agentCapacityPolicies/getUsers', 5],
      ['agents/get'],
    ]);
    expect(form(wrapper).props()).toMatchObject({
      initialData: {
        name: 'Busy',
        description: 'Caps',
        exclusionRules: { excludedLabels: ['vip'], excludeOlderThanHours: 0 },
        inboxCapacityLimits: [{ id: 9, inboxId: 1, conversationLimit: 4 }],
      },
      policyUsers: [
        {
          name: 'Ann',
          id: 1,
          email: 'a@x',
          avatarUrl: 'a.png',
          color: undefined,
        },
      ],
      agentList: [
        {
          name: 'Bo',
          id: 2,
          email: 'b@x',
          avatarUrl: 'b.png',
          color: undefined,
        },
      ],
      labelList: [
        {
          name: 'vip',
          id: 3,
          email: undefined,
          avatarUrl: undefined,
          color: '#f00',
        },
      ],
      inboxList: [
        {
          name: 'Mail',
          id: 1,
          email: 'm@x',
          phoneNumber: undefined,
          icon: 'Channel::Email|smtp|line|false',
        },
        {
          name: 'Web',
          id: 2,
          email: undefined,
          phoneNumber: undefined,
          icon: 'Channel::WebWidget|undefined|line|undefined',
        },
      ],
      isLoading: true,
      isUsersLoading: true,
      isInboxesLoading: false,
    });
  });

  it('fetches a missing policy and falls back to empty form data', async () => {
    const wrapper = await mountPage({ stored: null });
    expect(env.dispatch).toHaveBeenCalledWith(
      'agentCapacityPolicies/show',
      '5'
    );
    expect(form(wrapper).props('initialData')).toEqual({
      name: '',
      description: '',
      exclusionRules: { excludedLabels: [], excludeOlderThanHours: null },
      inboxCapacityLimits: [],
    });
    expect(form(wrapper).props('policyUsers')).toEqual([]);
    env.state['inboxes/getAllInboxes'] = null;
    env.state['labels/getLabels'] = null;
    await flushPromises();
    expect(form(wrapper).props('inboxList')).toEqual([]);
    expect(form(wrapper).props('labelList')).toEqual([]);
  });

  it('skips loading without a route id and reloads when it changes', async () => {
    await mountPage({ id: null });
    expect(env.dispatch.mock.calls).toEqual([['agents/get']]);
    env.route.params = { id: '7' };
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith(
      'agentCapacityPolicies/getUsers',
      7
    );
  });

  it('navigates from the breadcrumb', async () => {
    const wrapper = await mountPage();
    const breadcrumb = wrapper.findComponent(Breadcrumb);
    expect(breadcrumb.props('items').map(i => i.label)).toEqual([
      'ASSIGNMENT_POLICY.AGENT_CAPACITY_POLICY.INDEX.HEADER.TITLE',
      'ASSIGNMENT_POLICY.AGENT_CAPACITY_POLICY.EDIT.HEADER.TITLE',
    ]);
    breadcrumb.vm.$emit('click', { routeName: 'agent_capacity_policy_index' });
    expect(env.router.push).toHaveBeenCalledWith({
      name: 'agent_capacity_policy_index',
    });
  });

  const ACTIONS = [
    [
      'submit',
      { name: 'New' },
      'agentCapacityPolicies/update',
      { id: 5, name: 'New' },
      'EDIT.API',
    ],
    [
      'addUser',
      { id: 2 },
      'agentCapacityPolicies/addUser',
      { policyId: 5, userData: { id: 2, capacity: 20 } },
      'EDIT.AGENT_API.ADD',
    ],
    [
      'deleteUser',
      1,
      'agentCapacityPolicies/removeUser',
      { policyId: 5, userId: 1 },
      'EDIT.AGENT_API.REMOVE',
    ],
    [
      'addInboxLimit',
      { inboxId: 2, conversationLimit: 3, extra: 1 },
      'agentCapacityPolicies/createInboxLimit',
      { policyId: 5, limitData: { inboxId: 2, conversationLimit: 3 } },
      'EDIT.INBOX_LIMIT_API.ADD',
    ],
    [
      'updateInboxLimit',
      { id: 9, conversationLimit: 6 },
      'agentCapacityPolicies/updateInboxLimit',
      { policyId: 5, limitId: 9, limitData: { conversationLimit: 6 } },
      'EDIT.INBOX_LIMIT_API.UPDATE',
    ],
    [
      'deleteInboxLimit',
      9,
      'agentCapacityPolicies/deleteInboxLimit',
      { policyId: 5, limitId: 9 },
      'EDIT.INBOX_LIMIT_API.DELETE',
    ],
  ];

  it.each(ACTIONS)(
    'handles %s with success and error alerts',
    async (event, payload, action, expected, key) => {
      const wrapper = await mountPage();
      form(wrapper).vm.$emit(event, payload);
      await flushPromises();
      expect(env.dispatch).toHaveBeenCalledWith(action, expected);
      expect(env.alert).toHaveBeenLastCalledWith(
        `ASSIGNMENT_POLICY.AGENT_CAPACITY_POLICY.${key}.SUCCESS_MESSAGE`
      );
      env.dispatch.mockRejectedValueOnce(new Error('x'));
      form(wrapper).vm.$emit(event, payload);
      await flushPromises();
      expect(env.alert).toHaveBeenLastCalledWith(
        `ASSIGNMENT_POLICY.AGENT_CAPACITY_POLICY.${key}.ERROR_MESSAGE`
      );
    }
  );
});
