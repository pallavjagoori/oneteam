/**
 * OneTeam behaviour spec for the create agent assignment policy page.
 *
 * Covers the breadcrumb from the policy list and from an inbox's
 * settings (which links back to the inbox collaborators tab), the
 * loading state, creating a policy (alert, form reset and opening the
 * new policy, carrying the inbox along) and a failed create.
 */
import { reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import AgentAssignmentCreatePage from '../AgentAssignmentCreatePage.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
  useRouter: () => ({ push: env.push }),
}));
vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return {
    useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
    useMapGetter: () => computed(() => env.uiFlags),
  };
});

const Layout = {
  name: 'SettingsLayout',
  template: '<div><slot name="header" /><slot name="body" /></div>',
};
const Breadcrumb = {
  name: 'Breadcrumb',
  props: ['items'],
  emits: ['click'],
  template: '<nav />',
};
const AssignmentPolicyForm = {
  name: 'AgentAssignmentPolicyForm',
  props: ['mode', 'isLoading'],
  emits: ['submit'],
  methods: { resetForm: () => env.log.push('reset') },
  template: '<form />',
};

const KEY = 'ASSIGNMENT_POLICY.AGENT_ASSIGNMENT_POLICY';

const mountPage = query => {
  env.route = reactive({ params: { accountId: 5 }, query });
  return mount(AgentAssignmentCreatePage, {
    global: {
      stubs: {
        SettingsLayout: Layout,
        Breadcrumb,
        AgentAssignmentPolicyForm: AssignmentPolicyForm,
        AssignmentPolicyForm,
      },
    },
  });
};

describe('AgentAssignmentCreatePage behaviour', () => {
  beforeEach(() => {
    env.log = [];
    env.push = vi.fn();
    env.dispatch = vi.fn().mockResolvedValue({ id: 31 });
    env.uiFlags = { isCreating: true };
    useAlert.mockClear();
  });

  it('creates a policy from the policy list', async () => {
    const wrapper = mountPage({});
    const breadcrumb = wrapper.findComponent(Breadcrumb);
    expect(breadcrumb.props('items')).toEqual([
      {
        label: `${KEY}.INDEX.HEADER.TITLE`,
        routeName: 'agent_assignment_policy_index',
      },
      { label: `${KEY}.CREATE.HEADER.TITLE` },
    ]);
    await breadcrumb.vm.$emit('click', breadcrumb.props('items')[0]);
    expect(env.push).toHaveBeenLastCalledWith({
      name: 'agent_assignment_policy_index',
    });

    const form = wrapper.findComponent(AssignmentPolicyForm);
    expect(form.props()).toEqual({ mode: 'CREATE', isLoading: true });
    await form.vm.$emit('submit', { name: 'Round robin' });
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('assignmentPolicies/create', {
      name: 'Round robin',
    });
    expect(useAlert).toHaveBeenCalledWith(`${KEY}.CREATE.API.SUCCESS_MESSAGE`);
    expect(env.log).toEqual(['reset']);
    expect(env.push).toHaveBeenLastCalledWith({
      name: 'agent_assignment_policy_edit',
      params: { id: 31 },
      query: {},
    });
  });

  it('creates a policy from an inbox and links back to it', async () => {
    const wrapper = mountPage({ inboxId: '8' });
    const breadcrumb = wrapper.findComponent(Breadcrumb);
    expect(breadcrumb.props('items')[0]).toEqual({
      label: 'INBOX_MGMT.SETTINGS',
      routeName: 'settings_inbox_show',
      params: { inboxId: 8 },
    });
    await breadcrumb.vm.$emit('click', breadcrumb.props('items')[0]);
    expect(env.push).toHaveBeenLastCalledWith(
      '/app/accounts/5/settings/inboxes/8/collaborators'
    );

    await wrapper.findComponent(AssignmentPolicyForm).vm.$emit('submit', {});
    await flushPromises();
    expect(env.push).toHaveBeenLastCalledWith({
      name: 'agent_assignment_policy_edit',
      params: { id: 31 },
      query: { inboxId: 8 },
    });
  });

  it('alerts when the policy cannot be created', async () => {
    env.dispatch.mockRejectedValueOnce(new Error('taken'));
    const wrapper = mountPage({});
    await wrapper.findComponent(AssignmentPolicyForm).vm.$emit('submit', {});
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(`${KEY}.CREATE.API.ERROR_MESSAGE`);
    expect(env.push).not.toHaveBeenCalled();
    expect(env.log).toEqual([]);
  });
});
