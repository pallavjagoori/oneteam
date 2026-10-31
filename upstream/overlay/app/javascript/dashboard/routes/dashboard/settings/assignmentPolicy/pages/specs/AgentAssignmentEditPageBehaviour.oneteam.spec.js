/**
 * OneTeam behaviour spec for the agent assignment policy edit page.
 *
 * Child components are stubbed. Covers loading the policy and its
 * inboxes, the form's initial data, breadcrumbs (from the policy list or
 * from an inbox), saving, linking and unlinking inboxes (including moving
 * an inbox from another policy after confirmation) and the suggested
 * inbox prompt from the create flow.
 */
import { reactive, ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import EditPage from '../AgentAssignmentEditPage.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
  useRouter: () => env.router,
}));
vi.mock('dashboard/composables', () => ({
  useAlert: (...args) => env.alert(...args),
}));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
  useMapGetter: name => env.getters[name],
}));
vi.mock('dashboard/helper/inbox', () => ({
  getInboxIconByType: (type, medium, variant, voice) =>
    `${type}|${medium}|${variant}|${voice}`,
}));

const stub = (name, props = []) => ({
  name,
  props,
  emits: [
    'click',
    'submit',
    'addInbox',
    'deleteInbox',
    'navigateToInbox',
    'add',
    'link',
    'dismiss',
  ],
  template: '<div><slot name="header" /><slot name="body" /><slot /></div>',
});

const ConfirmInboxDialog = {
  name: 'ConfirmInboxDialog',
  emits: ['add'],
  methods: {
    openDialog: inbox => env.openDialog(inbox),
    closeDialog: () => env.closeDialog(),
  },
  template: '<div />',
};

const policy = (extra = {}) => ({
  id: 5,
  name: 'Fair',
  description: 'Spread work',
  assignmentOrder: 'balanced',
  conversationPriority: 'longest_waiting',
  fairDistributionLimit: 10,
  fairDistributionWindow: 60,
  excludeOlderThanHours: 0,
  inboxes: [{ id: 1, name: 'Mail', channelType: 'Channel::Email' }],
  ...extra,
});

const mountPage = async () => {
  const wrapper = mount(EditPage, {
    global: {
      stubs: {
        SettingsLayout: stub('SettingsLayout', ['isLoading']),
        Breadcrumb: stub('Breadcrumb', ['items']),
        AssignmentPolicyForm: stub('AgentAssignmentPolicyForm', [
          'initialData',
          'policyInboxes',
          'inboxList',
          'isLoading',
          'isInboxLoading',
        ]),
        ConfirmInboxDialog,
        InboxLinkDialog: stub('InboxLinkDialog', ['inbox', 'isLinking']),
      },
    },
  });
  await flushPromises();
  return wrapper;
};

const form = wrapper =>
  wrapper.findComponent({ name: 'AgentAssignmentPolicyForm' });
const crumbs = wrapper => wrapper.findComponent({ name: 'Breadcrumb' });
const link = wrapper => wrapper.findComponent({ name: 'InboxLinkDialog' });
const alerts = () => env.alert.mock.calls.map(c => c[0]);
const KEY = 'ASSIGNMENT_POLICY.AGENT_ASSIGNMENT_POLICY';

describe('AgentAssignmentEditPage behaviour', () => {
  beforeEach(() => {
    env.route = reactive({
      name: 'agent_assignment_policy_edit',
      params: { accountId: '1', id: '5' },
      query: {},
    });
    env.router = { push: vi.fn(), replace: vi.fn() };
    env.alert = vi.fn();
    env.openDialog = vi.fn();
    env.closeDialog = vi.fn();
    env.dispatch = vi.fn(() => Promise.resolve());
    env.policies = { 5: policy() };
    env.getters = {
      'assignmentPolicies/getUIFlags': ref({
        isFetchingItem: false,
        isUpdating: false,
      }),
      'inboxes/getAllInboxes': ref([
        { id: 2, name: 'Web', channelType: 'Channel::WebWidget' },
        {
          id: 1,
          name: 'Mail',
          channelType: 'Channel::Email',
          email: 'a@x.test',
        },
      ]),
      'assignmentPolicies/getInboxUiFlags': ref({ isFetching: true }),
      'assignmentPolicies/getAssignmentPolicyById': ref(
        id => env.policies[id] || {}
      ),
    };
  });

  it('loads inbox policies and fills the form from the policy', async () => {
    const wrapper = await mountPage();
    expect(env.dispatch).not.toHaveBeenCalledWith('inboxes/get');
    expect(env.dispatch).not.toHaveBeenCalledWith(
      'assignmentPolicies/show',
      expect.anything()
    );
    expect(env.dispatch).toHaveBeenCalledWith(
      'assignmentPolicies/getInboxes',
      5
    );
    expect(form(wrapper).props('initialData')).toEqual({
      name: 'Fair',
      description: 'Spread work',
      enabled: true,
      assignmentOrder: 'balanced',
      conversationPriority: 'longest_waiting',
      fairDistributionLimit: 10,
      fairDistributionWindow: 60,
      excludeOlderThanHours: 0,
    });
    expect(form(wrapper).props('policyInboxes')).toEqual([
      {
        name: 'Mail',
        id: 1,
        email: undefined,
        phoneNumber: undefined,
        icon: 'Channel::Email|undefined|line|undefined',
      },
    ]);
    expect(
      form(wrapper)
        .props('inboxList')
        .map(i => i.name)
    ).toEqual(['Mail', 'Web']);
    expect(form(wrapper).props('isInboxLoading')).toBe(true);
    expect(crumbs(wrapper).props('items')).toEqual([
      {
        label: `${KEY}.INDEX.HEADER.TITLE`,
        routeName: 'agent_assignment_policy_index',
      },
      { label: `${KEY}.EDIT.HEADER.TITLE` },
    ]);
    expect(link(wrapper).props('inbox')).toBe(null);
  });

  it('fetches the policy and inboxes when they are missing, with defaults', async () => {
    env.policies = {};
    env.getters['inboxes/getAllInboxes'].value = null;
    const wrapper = await mountPage();
    expect(env.dispatch).toHaveBeenCalledWith('inboxes/get');
    expect(env.dispatch).toHaveBeenCalledWith('assignmentPolicies/show', '5');
    expect(form(wrapper).props('initialData')).toEqual({
      name: '',
      description: '',
      enabled: true,
      assignmentOrder: 'round_robin',
      conversationPriority: 'earliest_created',
      fairDistributionLimit: 100,
      fairDistributionWindow: 3600,
      excludeOlderThanHours: null,
    });
    expect(form(wrapper).props('policyInboxes')).toEqual([]);
    expect(form(wrapper).props('inboxList')).toEqual([]);
  });

  it('does nothing without a policy id and refetches when it changes', async () => {
    env.route.params.id = undefined;
    await mountPage();
    expect(env.dispatch).not.toHaveBeenCalled();
    env.route.params.id = '5';
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith(
      'assignmentPolicies/getInboxes',
      5
    );
  });

  it('saves the policy and alerts on failure', async () => {
    const wrapper = await mountPage();
    form(wrapper).vm.$emit('submit', { name: 'New' });
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('assignmentPolicies/update', {
      id: 5,
      name: 'New',
    });
    expect(alerts()).toContain(`${KEY}.EDIT.API.SUCCESS_MESSAGE`);
    env.dispatch = vi.fn(() => Promise.reject(new Error('x')));
    form(wrapper).vm.$emit('submit', {});
    await flushPromises();
    expect(alerts()).toContain(`${KEY}.EDIT.API.ERROR_MESSAGE`);
  });

  it('removes an inbox and alerts on failure', async () => {
    const wrapper = await mountPage();
    form(wrapper).vm.$emit('deleteInbox', 1);
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith(
      'assignmentPolicies/removeInboxPolicy',
      { policyId: 5, inboxId: 1 }
    );
    expect(alerts()).toContain(`${KEY}.EDIT.INBOX_API.REMOVE.SUCCESS_MESSAGE`);
    env.dispatch = vi.fn(() => Promise.reject(new Error('x')));
    form(wrapper).vm.$emit('deleteInbox', 1);
    await flushPromises();
    expect(alerts()).toContain(`${KEY}.EDIT.INBOX_API.REMOVE.ERROR_MESSAGE`);
  });

  it('opens an inbox and follows breadcrumbs', async () => {
    const wrapper = await mountPage();
    form(wrapper).vm.$emit('navigateToInbox', { id: 2 });
    expect(env.router.push).toHaveBeenCalledWith({
      name: 'settings_inbox_show',
      params: { accountId: '1', inboxId: 2 },
    });
    crumbs(wrapper).vm.$emit('click', {
      routeName: 'agent_assignment_policy_index',
    });
    expect(env.router.push).toHaveBeenCalledWith({
      name: 'agent_assignment_policy_index',
    });
    crumbs(wrapper).vm.$emit('click', { params: { inboxId: 2 } });
    expect(env.router.push).toHaveBeenCalledWith(
      '/app/accounts/1/settings/inboxes/2/collaborators'
    );
  });

  it('adds an inbox that has no other policy', async () => {
    const wrapper = await mountPage();
    env.dispatch.mockImplementation(action =>
      Promise.resolve(
        action === 'assignmentPolicies/getInboxPolicy' ? { id: 5 } : undefined
      )
    );
    form(wrapper).vm.$emit('addInbox', { id: 2 });
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith(
      'assignmentPolicies/setInboxPolicy',
      { inboxId: 2, policyId: 5 }
    );
    expect(alerts()).toContain(`${KEY}.FORM.INBOXES.API.SUCCESS_MESSAGE`);
    expect(env.openDialog).not.toHaveBeenCalled();

    // A failed policy lookup still links the inbox.
    env.dispatch.mockImplementation(action =>
      action === 'assignmentPolicies/getInboxPolicy'
        ? Promise.reject(new Error('404'))
        : Promise.resolve()
    );
    form(wrapper).vm.$emit('addInbox', { id: 3 });
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith(
      'assignmentPolicies/setInboxPolicy',
      { inboxId: 3, policyId: 5 }
    );

    env.dispatch.mockImplementation(action =>
      action === 'assignmentPolicies/setInboxPolicy'
        ? Promise.reject(new Error('x'))
        : Promise.resolve({ id: 5 })
    );
    form(wrapper).vm.$emit('addInbox', undefined);
    await flushPromises();
    expect(alerts()).toContain(`${KEY}.FORM.INBOXES.API.ERROR_MESSAGE`);
  });

  it('asks before moving an inbox from another policy', async () => {
    const wrapper = await mountPage();
    env.dispatch.mockImplementation(action =>
      Promise.resolve(
        action === 'assignmentPolicies/getInboxPolicy'
          ? { id: 9, assignedInboxCount: 3 }
          : undefined
      )
    );
    form(wrapper).vm.$emit('addInbox', { id: 2, name: 'Web' });
    await flushPromises();
    expect(env.openDialog).toHaveBeenCalledWith({ id: 2, name: 'Web' });
    expect(env.dispatch).not.toHaveBeenCalledWith(
      'assignmentPolicies/setInboxPolicy',
      expect.anything()
    );

    const dialog = wrapper.findComponent({ name: 'ConfirmInboxDialog' });
    dialog.vm.$emit('add', 2);
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith(
      'assignmentPolicies/setInboxPolicy',
      { inboxId: 2, policyId: 5 }
    );
    expect(env.dispatch).toHaveBeenCalledWith(
      'assignmentPolicies/updateInboxPolicy',
      { policy: { id: 9, assignedInboxCount: 2 } }
    );
    expect(env.dispatch).toHaveBeenCalledWith(
      'assignmentPolicies/getInboxes',
      9
    );
    expect(env.closeDialog).toHaveBeenCalled();

    env.dispatch = vi.fn(() => Promise.reject(new Error('x')));
    dialog.vm.$emit('add', 2);
    await flushPromises();
    expect(env.closeDialog).toHaveBeenCalledTimes(1);
  });

  it('prompts to link the inbox from the create flow', async () => {
    env.route.query = { inboxId: '2' };
    const wrapper = await mountPage();
    expect(link(wrapper).props('inbox')).toMatchObject({ id: 2, name: 'Web' });
    expect(crumbs(wrapper).props('items')).toEqual([
      {
        label: 'INBOX_MGMT.SETTINGS',
        routeName: 'settings_inbox_show',
        params: { inboxId: 2 },
      },
      { label: `${KEY}.EDIT.HEADER.TITLE` },
    ]);

    let finish;
    env.dispatch.mockImplementation(action =>
      action === 'assignmentPolicies/getInboxPolicy'
        ? new Promise(resolve => {
            finish = resolve;
          })
        : Promise.resolve()
    );
    link(wrapper).vm.$emit('link');
    await flushPromises();
    expect(link(wrapper).props('isLinking')).toBe(true);
    finish({ id: 9, assignedInboxCount: 1 });
    await flushPromises();
    expect(env.openDialog).toHaveBeenCalledWith({ id: 2, name: 'Web' });
    expect(env.router.replace).toHaveBeenCalledWith({
      name: 'agent_assignment_policy_edit',
      params: { accountId: '1', id: '5' },
      query: {},
    });
    expect(link(wrapper).props('isLinking')).toBe(false);

    link(wrapper).vm.$emit('dismiss');
    expect(env.router.replace).toHaveBeenCalledTimes(2);
  });

  it('ignores a link request without a matching inbox', async () => {
    env.route.query = { inboxId: '77' };
    const wrapper = await mountPage();
    expect(link(wrapper).props('inbox')).toBeUndefined();
    link(wrapper).vm.$emit('link');
    await flushPromises();
    expect(env.router.replace).not.toHaveBeenCalled();

    env.getters['inboxes/getAllInboxes'].value = null;
    await flushPromises();
    expect(link(wrapper).props('inbox')).toBe(null);
  });
});
