/**
 * OneTeam behaviour spec for the inbox collaborators settings page.
 *
 * Covers the agent picker and save, the auto-assignment toggle, the legacy
 * max-assignment limit form, and the assignment_v2 policy cards (linked
 * policy, default policy with the link dropdown, and the upgrade prompts
 * for cloud, licensed and community installs).
 */
import { reactive } from 'vue';
import { shallowMount, flushPromises } from '@vue/test-utils';
import CollaboratorsPage from '../CollaboratorsPage.vue';
import TagInput from 'dashboard/components-next/taginput/TagInput.vue';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu.vue';

const env = vi.hoisted(() => ({
  enterprise: true,
  plan: 'enterprise',
  cloud: false,
  features: [],
  outside: null,
  api: {},
}));

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/useConfig', () => ({
  useConfig: () => ({
    isEnterprise: env.enterprise,
    enterprisePlanName: env.plan,
  }),
}));
vi.mock('dashboard/composables/useAccount', async () => {
  const { computed } = await import('vue');
  return {
    useAccount: () => ({ isOnChatwootCloud: computed(() => env.cloud) }),
  };
});
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { accountId: '1' } }),
  useRouter: () => env.router,
}));
vi.mock('@vueuse/components', () => ({
  vOnClickOutside: {
    mounted: (el, binding) => {
      env.outside = binding.value;
    },
  },
}));
vi.mock('dashboard/api/assignmentPolicies', () => {
  // Each call resolves with env.api[name], or rejects when it is an Error.
  const call = name => async () => {
    const value = env.api[name];
    if (value instanceof Error) throw value;
    return value;
  };
  return {
    default: {
      getInboxPolicy: vi.fn(call('getInboxPolicy')),
      get: vi.fn(call('get')),
      setInboxPolicy: vi.fn(call('setInboxPolicy')),
      removeInboxPolicy: vi.fn(call('removeInboxPolicy')),
    },
  };
});

const { useAlert } = await import('dashboard/composables');
const { default: policiesAPI } = await import(
  'dashboard/api/assignmentPolicies'
);

const NextButton = {
  name: 'NextButton',
  props: ['label', 'icon', 'isLoading', 'disabled'],
  emits: ['click'],
  template: '<button><slot /></button>',
};
const ToggleSection = {
  name: 'SettingsToggleSection',
  props: ['modelValue', 'header', 'description'],
  emits: ['update:modelValue'],
  template: '<section><slot name="editor" /></section>',
};
const WootInput = {
  name: 'WootInput',
  props: ['modelValue', 'error'],
  emits: ['update:modelValue', 'blur'],
  template: '<input />',
};

const policy = {
  id: 8,
  name: 'Fast lane',
  conversation_priority: 'earliest_created',
  assignment_order: 'round_robin',
};

let store;
const mountPage = ({
  inbox = { id: 4, enable_auto_assignment: true },
  members = [{ id: 1 }],
} = {}) => {
  store = {
    getters: reactive({
      'agents/getAgents': [
        { id: 1, name: 'Ann', thumbnail: 'a.png' },
        { id: 2, name: 'Bob', avatar_url: 'b.png' },
        { id: 3, name: 'Cy' },
      ],
      'accounts/isFeatureEnabledonAccount': (accountId, feature) =>
        accountId === 1 && env.features.includes(feature),
    }),
    dispatch: vi.fn(async action => {
      if (action === 'inboxMembers/get') {
        if (members instanceof Error) throw members;
        return { data: { payload: members } };
      }
      const value = env.api[action];
      if (value instanceof Error) throw value;
      return value;
    }),
  };
  return shallowMount(CollaboratorsPage, {
    props: { inbox },
    global: {
      provide: { store },
      mocks: { $t: key => key },
      stubs: {
        NextButton,
        SettingsToggleSection: ToggleSection,
        SettingsFieldSection: {
          template: '<div><slot /><slot name="extra" /></div>',
        },
        SettingsAccordion: { template: '<div><slot /></div>' },
        WootInput,
        WootModal: { template: '<div class="modal"><slot /></div>' },
      },
    },
  });
};

// Mounts and lets the onMounted defaults and fetches settle.
const mountReady = async options => {
  const wrapper = mountPage(options);
  await flushPromises();
  return wrapper;
};
const buttons = wrapper => wrapper.findAllComponents(NextButton);
const byLabel = (wrapper, label) =>
  buttons(wrapper).find(b => b.props('label') === label);
const byIcon = (wrapper, icon) =>
  buttons(wrapper).find(b => b.props('icon') === icon);
const dispatched = name => store.dispatch.mock.calls.filter(c => c[0] === name);
const toggle = wrapper => wrapper.findComponent(ToggleSection);

beforeEach(() => {
  env.enterprise = true;
  env.plan = 'enterprise';
  env.cloud = false;
  env.features = [];
  env.outside = null;
  env.api = {};
  env.router = { push: vi.fn() };
  vi.clearAllMocks();
});

describe('Collaborators agents', () => {
  it('loads members and lists the rest as menu items', async () => {
    const wrapper = await mountReady();
    await flushPromises();
    const input = wrapper.findComponent(TagInput);
    expect(input.props('modelValue')).toEqual(['Ann']);
    expect(input.props('menuItems')).toEqual([
      {
        label: 'Bob',
        value: 2,
        action: 'select',
        thumbnail: { name: 'Bob', src: 'b.png' },
      },
      {
        label: 'Cy',
        value: 3,
        action: 'select',
        thumbnail: { name: 'Cy', src: '' },
      },
    ]);
  });

  it('adds agents once, removes them and shows unknown ids as blank', async () => {
    const wrapper = await mountReady({ members: [{ id: 99 }] });
    await flushPromises();
    const input = wrapper.findComponent(TagInput);
    expect(input.props('modelValue')).toEqual(['']);
    await input.vm.$emit('add', { value: 1 });
    await input.vm.$emit('add', { value: 1 });
    expect(input.props('modelValue')).toEqual(['', 'Ann']);
    await input.vm.$emit('remove', 0);
    expect(input.props('modelValue')).toEqual(['Ann']);
  });

  it('ignores a failure to load members', async () => {
    const wrapper = await mountReady({ members: new Error('x') });
    await flushPromises();
    expect(wrapper.findComponent(TagInput).props('modelValue')).toEqual([]);
  });

  it.each([
    [undefined, 'AGENT_MGMT.EDIT.API.SUCCESS_MESSAGE'],
    [new Error('x'), 'AGENT_MGMT.EDIT.API.ERROR_MESSAGE'],
  ])('saves the agent list', async (result, message) => {
    env.api['inboxMembers/create'] = result;
    const wrapper = await mountReady();
    await flushPromises();
    const save = byLabel(wrapper, 'INBOX_MGMT.SETTINGS_POPUP.UPDATE');
    await save.vm.$emit('click');
    expect(save.props('isLoading')).toBe(true);
    await flushPromises();
    expect(dispatched('inboxMembers/create')[0][1]).toEqual({
      inboxId: 4,
      agentList: [1],
    });
    expect(useAlert).toHaveBeenCalledWith(message);
    expect(save.props('isLoading')).toBe(false);
  });
});

describe('Collaborators auto assignment', () => {
  it.each([
    [undefined, 'INBOX_MGMT.EDIT.API.SUCCESS_MESSAGE'],
    [new Error('x'), 'INBOX_MGMT.EDIT.API.ERROR_MESSAGE'],
  ])('saves the toggle', async (result, message) => {
    env.api['inboxes/updateInbox'] = result;
    const wrapper = await mountReady();
    await toggle(wrapper).vm.$emit('update:modelValue', false);
    await flushPromises();
    expect(dispatched('inboxes/updateInbox')[0][1]).toEqual({
      id: 4,
      formData: false,
      enable_auto_assignment: false,
    });
    expect(useAlert).toHaveBeenCalledWith(message);
  });

  it('uses the legacy headers without assignment_v2', async () => {
    const wrapper = await mountReady();
    expect(toggle(wrapper).props()).toMatchObject({
      header: 'INBOX_MGMT.SETTINGS_POPUP.AUTO_ASSIGNMENT',
      description: 'INBOX_MGMT.SETTINGS_POPUP.AUTO_ASSIGNMENT_SUB_TEXT',
    });
  });

  it('hides the editor when disabled or on community without v2', async () => {
    const disabled = await mountReady({ inbox: { id: 4 } });
    expect(disabled.findComponent(WootInput).exists()).toBe(false);
    env.enterprise = false;
    const community = await mountReady();
    expect(community.findComponent(WootInput).exists()).toBe(false);
  });

  it('validates and saves the max assignment limit', async () => {
    env.api['inboxes/updateInbox'] = undefined;
    const wrapper = await mountReady({
      inbox: {
        id: 4,
        enable_auto_assignment: true,
        auto_assignment_config: { max_assignment_limit: 3 },
      },
    });
    const input = wrapper.findComponent(WootInput);
    expect(input.props('modelValue')).toBe(3);

    await input.vm.$emit('update:modelValue', 0);
    await input.vm.$emit('blur');
    expect(input.props('error')).toBe(
      'INBOX_MGMT.AUTO_ASSIGNMENT.MAX_ASSIGNMENT_LIMIT_RANGE_ERROR'
    );
    const save = buttons(wrapper).filter(
      b => b.props('label') === 'INBOX_MGMT.SETTINGS_POPUP.UPDATE'
    )[1];
    expect(save.props('disabled')).toBe(true);

    await input.vm.$emit('update:modelValue', 5);
    expect(input.props('error')).toBe('');
    await save.vm.$emit('click');
    await flushPromises();
    expect(dispatched('inboxes/updateInbox')[0][1]).toEqual({
      id: 4,
      formData: false,
      enable_auto_assignment: true,
      auto_assignment_config: { max_assignment_limit: 5 },
    });
    expect(useAlert).toHaveBeenCalledWith(
      'INBOX_MGMT.EDIT.API.SUCCESS_MESSAGE'
    );
  });

  it('alerts when the limit cannot be saved', async () => {
    env.api['inboxes/updateInbox'] = new Error('x');
    const wrapper = await mountReady();
    expect(wrapper.findComponent(WootInput).props('modelValue')).toBe(null);
    const save = buttons(wrapper).filter(
      b => b.props('label') === 'INBOX_MGMT.SETTINGS_POPUP.UPDATE'
    )[1];
    await save.vm.$emit('click');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('INBOX_MGMT.EDIT.API.ERROR_MESSAGE');
  });

  it('reloads the defaults when the inbox changes', async () => {
    const wrapper = await mountReady();
    await flushPromises();
    await wrapper.setProps({ inbox: { id: 5, enable_auto_assignment: true } });
    await flushPromises();
    expect(dispatched('inboxMembers/get')[1][1]).toEqual({ inboxId: 5 });
  });
});

describe('Collaborators assignment_v2 without advanced assignment', () => {
  beforeEach(() => {
    env.features = ['assignment_v2'];
  });

  it('shows the v2 headers and default rules', async () => {
    const wrapper = await mountReady();
    expect(toggle(wrapper).props('header')).toBe(
      'INBOX_MGMT.ASSIGNMENT.ENABLE_AUTO_ASSIGNMENT'
    );
    expect(toggle(wrapper).props('description')).toBe(
      'INBOX_MGMT.ASSIGNMENT.DESCRIPTION'
    );
    expect(wrapper.text()).toContain(
      'INBOX_MGMT.ASSIGNMENT.DEFAULT_RULES_TITLE'
    );
    expect(policiesAPI.getInboxPolicy).not.toHaveBeenCalled();
  });

  it('prompts licensed self-hosted installs to enable the feature', async () => {
    const wrapper = await mountReady();
    expect(wrapper.text()).toContain(
      'INBOX_MGMT.ASSIGNMENT.FEATURE_DISABLED_PROMPT'
    );
    expect(
      byLabel(wrapper, 'INBOX_MGMT.ASSIGNMENT.UPGRADE_TO_PREMIUM')
    ).toBeUndefined();
  });

  it('sends community installs to the self-hosted pricing page', async () => {
    env.plan = 'community';
    const open = vi.spyOn(window, 'open').mockImplementation(() => {});
    const wrapper = await mountReady();
    expect(wrapper.text()).toContain(
      'INBOX_MGMT.ASSIGNMENT.SELF_HOSTED_PROMPT'
    );
    await byLabel(wrapper, 'INBOX_MGMT.ASSIGNMENT.UPGRADE_TO_PREMIUM').vm.$emit(
      'click'
    );
    expect(open).toHaveBeenCalledWith(
      'https://www.chatwoot.com/pricing/self-hosted-plans',
      '_blank',
      'noopener,noreferrer'
    );
    open.mockRestore();
  });

  it('treats a non-enterprise install as unlicensed', async () => {
    env.enterprise = false;
    const wrapper = await mountReady();
    expect(wrapper.text()).toContain(
      'INBOX_MGMT.ASSIGNMENT.SELF_HOSTED_PROMPT'
    );
  });

  it('sends cloud accounts to billing', async () => {
    env.cloud = true;
    const wrapper = await mountReady();
    expect(wrapper.text()).toContain('INBOX_MGMT.ASSIGNMENT.UPGRADE_PROMPT');
    await byLabel(
      wrapper,
      'INBOX_MGMT.ASSIGNMENT.UPGRADE_TO_BUSINESS'
    ).vm.$emit('click');
    expect(env.router.push).toHaveBeenCalledWith({
      name: 'billing_settings_index',
      params: { accountId: '1' },
    });
  });

  it('hides the upgrade prompt once advanced assignment is on without v2', async () => {
    env.features = ['advanced_assignment'];
    const wrapper = await mountReady();
    expect(wrapper.text()).not.toContain('DEFAULT_RULES_TITLE');
  });
});

describe('Collaborators advanced assignment policies', () => {
  beforeEach(() => {
    env.features = ['assignment_v2', 'advanced_assignment'];
  });

  it('shows the linked policy with readable labels', async () => {
    env.api.getInboxPolicy = { data: policy };
    env.api.get = { data: [] };
    const wrapper = await mountReady();
    await flushPromises();
    expect(wrapper.text()).toContain('Fast lane');
    expect(wrapper.text()).toContain(
      'INBOX_MGMT.ASSIGNMENT.PRIORITY.EARLIEST_CREATED'
    );
    expect(wrapper.text()).toContain(
      'INBOX_MGMT.ASSIGNMENT.METHOD.ROUND_ROBIN'
    );

    await byLabel(wrapper, 'INBOX_MGMT.ASSIGNMENT.CUSTOMIZE_POLICY').vm.$emit(
      'click'
    );
    expect(env.router.push).toHaveBeenCalledWith({
      name: 'agent_assignment_policy_edit',
      params: { accountId: '1', id: 8 },
    });
  });

  it.each([
    ['longest_waiting', 'balanced', 'LONGEST_WAITING', 'BALANCED'],
    ['custom_priority', 'custom_order', null, null],
  ])('labels priority %s and method %s', async (priority, order, p, m) => {
    env.api.getInboxPolicy = {
      data: {
        ...policy,
        conversation_priority: priority,
        assignment_order: order,
      },
    };
    env.api.get = { data: [] };
    const wrapper = await mountReady();
    await flushPromises();
    expect(wrapper.text()).toContain(
      p ? `INBOX_MGMT.ASSIGNMENT.PRIORITY.${p}` : priority
    );
    expect(wrapper.text()).toContain(
      m ? `INBOX_MGMT.ASSIGNMENT.METHOD.${m}` : order
    );
  });

  it('ignores customising a policy without an id', async () => {
    env.api.getInboxPolicy = { data: { ...policy, id: undefined } };
    env.api.get = { data: [] };
    const wrapper = await mountReady();
    await flushPromises();
    await byLabel(wrapper, 'INBOX_MGMT.ASSIGNMENT.CUSTOMIZE_POLICY').vm.$emit(
      'click'
    );
    expect(env.router.push).not.toHaveBeenCalled();
  });

  it('confirms, cancels and deletes the linked policy', async () => {
    env.api.getInboxPolicy = { data: policy };
    env.api.get = { data: [] };
    const wrapper = await mountReady();
    await flushPromises();
    await byIcon(wrapper, 'i-lucide-trash-2').vm.$emit('click');
    expect(wrapper.find('.modal').exists()).toBe(true);
    await byLabel(wrapper, 'INBOX_MGMT.ASSIGNMENT_POLICY.CANCEL').vm.$emit(
      'click'
    );
    expect(wrapper.find('.modal').exists()).toBe(false);

    await byIcon(wrapper, 'i-lucide-trash-2').vm.$emit('click');
    const confirm = byLabel(
      wrapper,
      'INBOX_MGMT.ASSIGNMENT_POLICY.CONFIRM_DELETE'
    );
    confirm.vm.$emit('click');
    // A second click while the first delete is in flight is ignored.
    confirm.vm.$emit('click');
    await flushPromises();
    expect(policiesAPI.removeInboxPolicy).toHaveBeenCalledTimes(1);
    expect(policiesAPI.removeInboxPolicy).toHaveBeenCalledWith(4);
    expect(useAlert).toHaveBeenCalledWith(
      'INBOX_MGMT.ASSIGNMENT_POLICY.DELETE_SUCCESS'
    );
    expect(wrapper.find('.modal').exists()).toBe(false);
    expect(wrapper.text()).toContain(
      'INBOX_MGMT.ASSIGNMENT.DEFAULT_POLICY_LINKED'
    );
  });

  it('keeps the policy when deleting fails', async () => {
    env.api.getInboxPolicy = { data: policy };
    env.api.get = { data: [] };
    env.api.removeInboxPolicy = new Error('x');
    const wrapper = await mountReady();
    await flushPromises();
    await byIcon(wrapper, 'i-lucide-trash-2').vm.$emit('click');
    await byLabel(
      wrapper,
      'INBOX_MGMT.ASSIGNMENT_POLICY.CONFIRM_DELETE'
    ).vm.$emit('click');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'INBOX_MGMT.ASSIGNMENT_POLICY.DELETE_ERROR'
    );
    expect(wrapper.text()).toContain('Fast lane');
  });

  it('shows the default policy while no policy is attached', async () => {
    env.api.getInboxPolicy = new Error('404');
    env.api.get = new Error('x');
    const wrapper = await mountReady();
    await flushPromises();
    expect(wrapper.text()).toContain(
      'INBOX_MGMT.ASSIGNMENT.DEFAULT_POLICY_LINKED'
    );
    expect(byIcon(wrapper, 'i-lucide-link')).toBeUndefined();
    await byLabel(wrapper, 'INBOX_MGMT.ASSIGNMENT.CREATE_NEW_POLICY').vm.$emit(
      'click'
    );
    expect(env.router.push).toHaveBeenCalledWith({
      name: 'agent_assignment_policy_create',
      params: { accountId: '1' },
      query: { inboxId: 4 },
    });
  });

  it('skips fetching the policy for an inbox without an id', async () => {
    env.api.get = { data: [] };
    await mountReady({ inbox: { enable_auto_assignment: true } });
    await flushPromises();
    expect(policiesAPI.getInboxPolicy).not.toHaveBeenCalled();
  });

  it('links an existing policy from the dropdown', async () => {
    env.api.getInboxPolicy = new Error('404');
    env.api.get = { data: [policy] };
    const wrapper = await mountReady();
    await flushPromises();
    const link = byIcon(wrapper, 'i-lucide-link');
    await link.vm.$emit('click');
    const menu = wrapper.findComponent(DropdownMenu);
    expect(menu.props('menuItems')).toEqual([
      {
        action: 'select_policy',
        value: 8,
        label: 'Fast lane',
        icon: 'i-lucide-zap',
        policy,
      },
      {
        action: 'view_all',
        value: 'view_all',
        label: 'INBOX_MGMT.ASSIGNMENT.VIEW_ALL_POLICIES',
        icon: 'i-lucide-arrow-right',
      },
    ]);
    // Policies were already loaded, so opening does not refetch them.
    expect(policiesAPI.get).toHaveBeenCalledTimes(1);

    await menu.vm.$emit('action', { action: 'select_policy', policy });
    await flushPromises();
    expect(policiesAPI.setInboxPolicy).toHaveBeenCalledWith(4, 8);
    expect(useAlert).toHaveBeenCalledWith('INBOX_MGMT.ASSIGNMENT.LINK_SUCCESS');
    expect(wrapper.text()).toContain('Fast lane');
  });

  it('alerts when linking fails', async () => {
    env.api.getInboxPolicy = new Error('404');
    env.api.get = { data: [policy] };
    env.api.setInboxPolicy = new Error('x');
    const wrapper = await mountReady();
    await flushPromises();
    await byIcon(wrapper, 'i-lucide-link').vm.$emit('click');
    await wrapper
      .findComponent(DropdownMenu)
      .vm.$emit('action', { action: 'select_policy', policy });
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('INBOX_MGMT.ASSIGNMENT.LINK_ERROR');
  });

  it('opens all policies, ignores unknown actions and closes on outside click', async () => {
    env.api.getInboxPolicy = new Error('404');
    env.api.get = { data: [policy] };
    const wrapper = await mountReady();
    await flushPromises();
    const link = byIcon(wrapper, 'i-lucide-link');
    await link.vm.$emit('click');
    await wrapper
      .findComponent(DropdownMenu)
      .vm.$emit('action', { action: 'view_all' });
    expect(env.router.push).toHaveBeenCalledWith({
      name: 'agent_assignment_policy_index',
      params: { accountId: '1' },
    });
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);

    await link.vm.$emit('click');
    await wrapper
      .findComponent(DropdownMenu)
      .vm.$emit('action', { action: 'select_policy' });
    expect(policiesAPI.setInboxPolicy).not.toHaveBeenCalled();
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);

    await link.vm.$emit('click');
    await link.vm.$emit('click');
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);
    await link.vm.$emit('click');
    env.outside();
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);
  });
});
