/**
 * OneTeam behaviour spec for the create agent capacity policy page.
 *
 * Covers the breadcrumb back to the policy list, passing labels and the
 * loading state to the form (including before labels load), creating a
 * policy (alert, form reset and opening the new policy) and a failed
 * create.
 */
import { flushPromises, mount } from '@vue/test-utils';
import AgentCapacityCreatePage from '../AgentCapacityCreatePage.vue';

const env = vi.hoisted(() => ({ alerts: [], log: [] }));

vi.mock('dashboard/composables', () => ({
  useAlert: message => env.alerts.push(message),
}));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => ({ push: env.push }),
}));
vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return {
    useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
    useMapGetter: name =>
      computed(() =>
        name === 'labels/getLabels' ? env.labels : { isCreating: true }
      ),
  };
});

const Breadcrumb = {
  name: 'Breadcrumb',
  props: ['items'],
  emits: ['click'],
  template: '<nav />',
};
const Form = {
  name: 'AgentCapacityPolicyForm',
  props: ['mode', 'isLoading', 'labelList'],
  emits: ['submit'],
  methods: { resetForm: () => env.log.push('reset') },
  template: '<form />',
};
const KEY = 'ASSIGNMENT_POLICY.AGENT_CAPACITY_POLICY';

const mountPage = () =>
  mount(AgentCapacityCreatePage, {
    global: {
      stubs: {
        SettingsLayout: {
          template: '<div><slot name="header" /><slot name="body" /></div>',
        },
        Breadcrumb,
        AgentCapacityPolicyForm: Form,
      },
    },
  });

describe('AgentCapacityCreatePage behaviour', () => {
  beforeEach(() => {
    env.alerts = [];
    env.log = [];
    env.push = vi.fn();
    env.dispatch = vi.fn().mockResolvedValue({ id: 8 });
    env.labels = [{ id: 1, title: 'vip', color: '#f00' }];
  });

  it('creates a policy and opens it', async () => {
    const wrapper = mountPage();
    const breadcrumb = wrapper.findComponent(Breadcrumb);
    expect(breadcrumb.props('items')[0]).toEqual({
      label: `${KEY}.INDEX.HEADER.TITLE`,
      routeName: 'agent_capacity_policy_index',
    });
    await breadcrumb.vm.$emit('click', {
      routeName: 'agent_capacity_policy_index',
    });
    expect(env.push).toHaveBeenCalledWith({
      name: 'agent_capacity_policy_index',
    });

    const form = wrapper.findComponent(Form);
    expect(form.props()).toEqual({
      mode: 'CREATE',
      isLoading: true,
      labelList: [{ id: 1, name: 'vip', color: '#f00' }],
    });
    await form.vm.$emit('submit', { name: 'Cap' });
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('agentCapacityPolicies/create', {
      name: 'Cap',
    });
    expect(env.log).toEqual(['reset']);
    expect(env.push).toHaveBeenLastCalledWith({
      name: 'agent_capacity_policy_edit',
      params: { id: 8 },
    });
    expect(env.alerts).toEqual([`${KEY}.CREATE.API.SUCCESS_MESSAGE`]);
  });

  it('reports a failed create and handles missing labels', async () => {
    env.labels = undefined;
    env.dispatch.mockRejectedValueOnce(new Error('no'));
    const wrapper = mountPage();
    expect(wrapper.findComponent(Form).props('labelList')).toBeUndefined();
    await wrapper.findComponent(Form).vm.$emit('submit', {});
    await flushPromises();
    expect(env.alerts).toEqual([`${KEY}.CREATE.API.ERROR_MESSAGE`]);
    expect(env.push).not.toHaveBeenCalled();
  });
});
