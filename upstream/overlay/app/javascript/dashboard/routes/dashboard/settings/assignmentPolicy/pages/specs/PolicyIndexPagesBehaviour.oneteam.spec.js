/**
 * OneTeam behaviour spec for the two assignment policy list pages:
 * agent assignment policies and agent capacity policies.
 *
 * Both pages share one layout, so each case runs against both. Covers
 * loading the policies, the empty and loading states, the breadcrumb,
 * creating and editing a policy, fetching a policy's inboxes or users
 * (skipped while a fetch is running), and deleting through the confirm
 * dialog (success closes it, failure keeps it open).
 */
import { reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import AgentAssignmentIndexPage from '../AgentAssignmentIndexPage.vue';
import AgentCapacityIndexPage from '../AgentCapacityIndexPage.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => ({ push: env.push }),
}));
vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return {
    useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
    useMapGetter: name => computed(() => env.getters[name]),
  };
});

const Layout = {
  name: 'SettingsLayout',
  props: ['isLoading', 'noRecordsFound', 'noRecordsMessage'],
  template: '<div><slot name="header" /><slot name="body" /><slot /></div>',
};
const Breadcrumb = {
  name: 'Breadcrumb',
  props: ['items'],
  emits: ['click'],
  template: '<nav />',
};
const Button = {
  name: 'Button',
  emits: ['click'],
  template: '<button @click="$emit(\'click\')"><slot /></button>',
};
const card = name => ({
  name,
  props: ['id', 'name', 'isFetchingUsers', 'isFetchingInboxes'],
  emits: ['fetchUsers', 'fetchInboxes', 'edit', 'delete'],
  template: '<div class="card" />',
});
const ConfirmDeletePolicyDialog = {
  name: 'ConfirmDeletePolicyDialog',
  emits: ['delete'],
  methods: {
    openDialog: id => env.log.push(`open ${id}`),
    closeDialog: () => env.log.push('close'),
  },
  template: '<div />',
};

const pages = [
  {
    title: 'agent assignment',
    page: AgentAssignmentIndexPage,
    module: 'assignmentPolicies',
    list: 'assignmentPolicies/getAssignmentPolicies',
    related: 'assignmentPolicies/getInboxUiFlags',
    key: 'AGENT_ASSIGNMENT_POLICY',
    route: 'agent_assignment_policy',
    card: card('AssignmentPolicyCard'),
    fetchEvent: 'fetchInboxes',
    fetchAction: 'assignmentPolicies/getInboxes',
    fetchingProp: 'isFetchingInboxes',
  },
  {
    title: 'agent capacity',
    page: AgentCapacityIndexPage,
    module: 'agentCapacityPolicies',
    list: 'agentCapacityPolicies/getAgentCapacityPolicies',
    related: 'agentCapacityPolicies/getUsersUIFlags',
    key: 'AGENT_CAPACITY_POLICY',
    route: 'agent_capacity_policy',
    card: card('AgentCapacityPolicyCard'),
    fetchEvent: 'fetchUsers',
    fetchAction: 'agentCapacityPolicies/getUsers',
    fetchingProp: 'isFetchingUsers',
  },
];

const mountPage = config =>
  mount(config.page, {
    global: {
      stubs: {
        SettingsLayout: Layout,
        Breadcrumb,
        Button,
        [config.card.name]: config.card,
        ConfirmDeletePolicyDialog,
      },
    },
  });

describe.each(pages)('$title policies page behaviour', config => {
  beforeEach(() => {
    env.log = [];
    env.push = vi.fn();
    env.dispatch = vi.fn().mockResolvedValue();
    env.getters = reactive({
      [config.list]: [
        { id: 1, name: 'Round robin' },
        { id: 2, name: 'Balanced' },
      ],
      [`${config.module}/getUIFlags`]: { isFetching: false },
      [config.related]: { isFetching: false },
    });
    useAlert.mockClear();
  });

  it('loads and lists the policies', () => {
    const wrapper = mountPage(config);
    expect(env.dispatch).toHaveBeenCalledWith(`${config.module}/get`);
    expect(wrapper.findAllComponents(config.card)).toHaveLength(2);
    expect(wrapper.findComponent(Layout).props()).toEqual({
      isLoading: false,
      noRecordsFound: false,
      noRecordsMessage: `ASSIGNMENT_POLICY.${config.key}.INDEX.NO_RECORDS_FOUND`,
    });
    expect(wrapper.findComponent(Breadcrumb).props('items')).toEqual([
      {
        label: 'ASSIGNMENT_POLICY.INDEX.HEADER.TITLE',
        routeName: 'assignment_policy_index',
      },
      { label: `ASSIGNMENT_POLICY.${config.key}.INDEX.HEADER.TITLE` },
    ]);
  });

  it('shows the loading and empty states', async () => {
    const wrapper = mountPage(config);
    env.getters[config.list] = [];
    env.getters[`${config.module}/getUIFlags`] = { isFetching: true };
    await flushPromises();
    expect(wrapper.findComponent(Layout).props()).toMatchObject({
      isLoading: true,
      noRecordsFound: true,
    });
  });

  it('navigates from the breadcrumb, create and edit', async () => {
    const wrapper = mountPage(config);
    await wrapper
      .findComponent(Breadcrumb)
      .vm.$emit('click', { routeName: 'assignment_policy_index' });
    await wrapper.findComponent(Button).trigger('click');
    await wrapper.findComponent(config.card).vm.$emit('edit', 2);
    expect(env.push.mock.calls).toEqual([
      [{ name: 'assignment_policy_index' }],
      [{ name: `${config.route}_create` }],
      [{ name: `${config.route}_edit`, params: { id: 2 } }],
    ]);
  });

  it('fetches related records unless a fetch is running', async () => {
    const wrapper = mountPage(config);
    const first = wrapper.findComponent(config.card);
    await first.vm.$emit(config.fetchEvent, 1);
    expect(env.dispatch).toHaveBeenLastCalledWith(config.fetchAction, 1);

    env.getters[config.related] = { isFetching: true };
    await flushPromises();
    expect(first.props(config.fetchingProp)).toBe(true);
    env.dispatch.mockClear();
    await first.vm.$emit(config.fetchEvent, 1);
    expect(env.dispatch).not.toHaveBeenCalled();
  });

  it('deletes through the confirm dialog', async () => {
    const wrapper = mountPage(config);
    await wrapper.findComponent(config.card).vm.$emit('delete', 1);
    expect(env.log).toEqual(['open 1']);

    const dialog = wrapper.findComponent(ConfirmDeletePolicyDialog);
    await dialog.vm.$emit('delete', 1);
    await flushPromises();
    expect(env.dispatch).toHaveBeenLastCalledWith(`${config.module}/delete`, 1);
    expect(useAlert).toHaveBeenLastCalledWith(
      `ASSIGNMENT_POLICY.${config.key}.DELETE_POLICY.SUCCESS_MESSAGE`
    );
    expect(env.log).toEqual(['open 1', 'close']);

    env.dispatch.mockRejectedValueOnce(new Error('in use'));
    await dialog.vm.$emit('delete', 2);
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      `ASSIGNMENT_POLICY.${config.key}.DELETE_POLICY.ERROR_MESSAGE`
    );
    expect(env.log).toHaveLength(2);
  });
});
