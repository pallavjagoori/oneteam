/**
 * OneTeam behaviour spec for the "add integration hook" dialog.
 *
 * Covers rendering the integration's settings form and the inbox picker
 * (Dialogflow hides inboxes that already have a hook), the OpenAI
 * "validating" label, building the hook payload (JSON fields parsed,
 * inbox moved to inbox_id), success and error alerts, and closing.
 */
import { ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import NewHook from '../NewHook.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/useIntegrationHook', () => ({
  useIntegrationHook: () => ({
    integration: ref(env.integration),
    isHookTypeInbox: ref(env.isInbox),
  }),
}));
vi.mock('shared/composables/useBranding', () => ({
  useBranding: () => ({ replaceInstallationName: text => `branded ${text}` }),
}));

const FormKit = {
  name: 'FormKit',
  props: ['modelValue', 'type', 'name', 'options'],
  emits: ['submit', 'update:modelValue'],
  template: '<div :data-type="type" :data-name="name"><slot /></div>',
};
const NextButton = {
  name: 'NextButton',
  props: ['label', 'isLoading'],
  emits: ['click'],
  template: '<button>{{ label }}</button>',
};
const Header = {
  name: 'WootModalHeader',
  props: ['headerTitle', 'headerContent'],
  template: '<header />',
};

const inboxes = [
  { id: 1, name: 'Web' },
  { id: 2, name: 'Mail' },
];

const mountHook = async ({
  integration,
  isInbox = true,
  creating = false,
} = {}) => {
  env.integration = {
    id: 'dialogflow',
    name: 'Dialogflow',
    short_description: 'Bots',
    hooks: [{ inbox: { id: 1 } }, {}],
    settings_form_schema: [
      { name: 'project_id', type: 'text' },
      { name: 'credentials', type: 'textarea', validation: 'required|JSON' },
    ],
    ...integration,
  };
  env.isInbox = isInbox;
  const $store = {
    dispatch: vi.fn().mockResolvedValue(),
    getters: {
      'integrations/getUIFlags': { isCreatingHook: creating },
      'inboxes/dialogFlowEnabledInboxes': inboxes,
    },
  };
  const wrapper = mount(NewHook, {
    props: { integrationId: 'dialogflow' },
    global: {
      stubs: { FormKit, NextButton, WootModalHeader: Header },
      mocks: { $store, $t: key => key },
    },
  });
  await flushPromises();
  return { wrapper, $store };
};

const inboxSelect = wrapper =>
  wrapper.findAllComponents(FormKit).find(f => f.props('name') === 'inbox');
const form = wrapper => wrapper.findComponent(FormKit);

describe('New integration hook behaviour', () => {
  it('renders the form and hides inboxes already connected to Dialogflow', async () => {
    const { wrapper } = await mountHook();
    expect(wrapper.findComponent(Header).props()).toEqual({
      headerTitle: 'Dialogflow',
      headerContent: 'branded Bots',
    });
    expect(
      wrapper.findAllComponents(FormKit).map(f => f.props('name'))
    ).toEqual([undefined, 'project_id', 'credentials', 'inbox']);
    expect(inboxSelect(wrapper).props('options')).toEqual([
      { label: 'Mail', value: 2 },
    ]);
    expect(wrapper.findAllComponents(NextButton)[1].props('label')).toBe(
      'INTEGRATION_APPS.ADD.FORM.SUBMIT'
    );
  });

  it('lists every inbox for other integrations and skips the picker for account hooks', async () => {
    const { wrapper } = await mountHook({
      integration: { id: 'openai', hooks: [] },
      creating: true,
    });
    expect(inboxSelect(wrapper).props('options')).toHaveLength(2);
    expect(wrapper.vm.connectedDialogflowInboxIds).toEqual([]);
    expect(wrapper.findAllComponents(NextButton)[1].props()).toEqual({
      label: 'INTEGRATION_APPS.ADD.FORM.VALIDATING_OPENAI',
      isLoading: true,
    });
    const { wrapper: account } = await mountHook({
      integration: { id: 'slack' },
      isInbox: false,
      creating: true,
    });
    expect(inboxSelect(account)).toBeUndefined();
    expect(account.findAllComponents(NextButton)[1].props('label')).toBe(
      'INTEGRATION_APPS.ADD.FORM.SUBMIT'
    );
  });

  it('creates the hook with parsed settings and the inbox', async () => {
    const { wrapper, $store } = await mountHook();
    await form(wrapper).vm.$emit('update:modelValue', {
      project_id: 'p1',
      credentials: '{"key":1}',
      inbox: 2,
    });
    await form(wrapper).vm.$emit('submit');
    await flushPromises();
    expect($store.dispatch).toHaveBeenCalledWith('integrations/createHook', {
      app_id: 'dialogflow',
      settings: { project_id: 'p1', credentials: { key: 1 } },
      inbox_id: 2,
    });
    expect(useAlert).toHaveBeenLastCalledWith(
      'INTEGRATION_APPS.ADD.API.SUCCESS_MESSAGE'
    );
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('leaves out the inbox for account hooks or when none is picked', async () => {
    const { wrapper, $store } = await mountHook({
      integration: { settings_form_schema: [{ name: 'token' }] },
      isInbox: false,
    });
    wrapper.vm.values = { token: 't', inbox: 3 };
    await wrapper.vm.submitForm();
    expect($store.dispatch).toHaveBeenLastCalledWith(
      'integrations/createHook',
      { app_id: 'dialogflow', settings: { token: 't' } }
    );
    const { wrapper: inboxHook, $store: store2 } = await mountHook({
      integration: { settings_form_schema: [] },
    });
    inboxHook.vm.values = {};
    await inboxHook.vm.submitForm();
    expect(store2.dispatch).toHaveBeenLastCalledWith(
      'integrations/createHook',
      { app_id: 'dialogflow', settings: {} }
    );
  });

  it('shows the server error or a fallback', async () => {
    const { wrapper, $store } = await mountHook({
      integration: { settings_form_schema: [] },
    });
    $store.dispatch.mockRejectedValueOnce({
      response: { data: { message: 'Bad key' } },
    });
    await wrapper.vm.submitForm();
    expect(useAlert).toHaveBeenLastCalledWith('Bad key');
    $store.dispatch.mockRejectedValueOnce(new Error('x'));
    await wrapper.vm.submitForm();
    expect(useAlert).toHaveBeenLastCalledWith(
      'INTEGRATION_APPS.ADD.API.ERROR_MESSAGE'
    );
    expect(wrapper.emitted('close')).toBeUndefined();
  });

  it('closes from the cancel button', async () => {
    const { wrapper } = await mountHook();
    await wrapper
      .findAllComponents(NextButton)[0]
      .vm.$emit('click', new Event('click'));
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
