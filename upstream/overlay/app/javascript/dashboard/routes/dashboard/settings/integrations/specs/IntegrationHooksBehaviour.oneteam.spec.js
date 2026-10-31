/**
 * OneTeam behaviour spec for an integration's hooks page.
 *
 * Covers fetching integrations on mount, the loading state, single
 * integrations (header with name or blank title) versus multiple ones
 * (add button), adding a hook through the modal, and deleting a hook
 * with inbox or account wording, success, API error message and the
 * fallback error.
 */
import { computed } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import IntegrationHooks from '../IntegrationHooks.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/useIntegrationHook', () => ({
  useIntegrationHook: id => {
    env.hookId = id;
    return {
      integration: computed(() => env.integration),
      isIntegrationMultiple: computed(() => env.multiple),
      isIntegrationSingle: computed(() => !env.multiple),
      isHookTypeInbox: computed(() => env.inbox),
    };
  },
}));

const Layout = {
  name: 'SettingsLayout',
  props: ['isLoading'],
  template: '<div><slot name="header" /><slot name="body" /><slot /></div>',
};
const Header = {
  name: 'BaseSettingsHeader',
  props: ['title', 'featureName'],
  template: '<header />',
};
const Multiple = {
  name: 'MultipleIntegrationHooks',
  props: ['integrationId', 'showAddButton'],
  emits: ['add', 'delete'],
  template: '<div class="multiple" />',
};
const Single = {
  name: 'SingleIntegrationHooks',
  props: ['integrationId'],
  emits: ['add', 'delete'],
  template: '<div class="single" />',
};
const Modal = {
  name: 'WootModal',
  props: ['show', 'onClose'],
  emits: ['update:show'],
  template: '<div v-if="show" class="modal"><slot /></div>',
};
const NewHook = {
  name: 'NewHook',
  props: ['integrationId'],
  emits: ['close'],
  template: '<div class="new-hook" />',
};
const DeleteModal = {
  name: 'WootDeleteModal',
  props: [
    'show',
    'onClose',
    'onConfirm',
    'title',
    'message',
    'confirmText',
    'rejectText',
  ],
  emits: ['update:show'],
  template: '<div class="delete" />',
};

const mountPage = async ({
  integration = { id: 'slack', name: 'Slack' },
  multiple = false,
  inbox = false,
  isFetching = false,
} = {}) => {
  Object.assign(env, { integration, multiple, inbox });
  const dispatch = vi.fn().mockResolvedValue();
  const wrapper = mount(IntegrationHooks, {
    props: { integrationId: 'slack' },
    global: {
      stubs: {
        SettingsLayout: Layout,
        BaseSettingsHeader: Header,
        MultipleIntegrationHooks: Multiple,
        SingleIntegrationHooks: Single,
        WootModal: Modal,
        NewHook,
        WootDeleteModal: DeleteModal,
      },
      mocks: {
        $t: key => key,
        $store: {
          getters: { 'integrations/getUIFlags': { isFetching } },
          dispatch,
        },
      },
    },
  });
  await flushPromises();
  return { wrapper, dispatch };
};
const deleteModal = wrapper => wrapper.findComponent(DeleteModal);

describe('IntegrationHooks behaviour', () => {
  it('fetches integrations and shows a single integration', async () => {
    const { wrapper, dispatch } = await mountPage();
    expect(dispatch).toHaveBeenCalledWith('integrations/get');
    expect(env.hookId).toBe('slack');
    expect(wrapper.findComponent(Header).props()).toEqual({
      title: 'Slack',
      featureName: 'slack',
    });
    expect(wrapper.find('.single').exists()).toBe(true);
    expect(wrapper.find('.multiple').exists()).toBe(false);
  });

  it('uses a blank title for an unnamed integration', async () => {
    const { wrapper } = await mountPage({ integration: { id: 'x' } });
    expect(wrapper.findComponent(Header).props('title')).toBe('');
  });

  it('hides hooks while loading or without an integration', async () => {
    const loading = await mountPage({ isFetching: true });
    expect(loading.wrapper.findComponent(Layout).props('isLoading')).toBe(true);
    expect(loading.wrapper.find('.single').exists()).toBe(false);
    const empty = await mountPage({ integration: {} });
    expect(empty.wrapper.find('.single').exists()).toBe(false);
  });

  it('shows multiple hooks with an add button and adds a hook', async () => {
    const { wrapper } = await mountPage({ multiple: true });
    expect(wrapper.findComponent(Header).exists()).toBe(false);
    const multiple = wrapper.findComponent(Multiple);
    expect(multiple.props()).toEqual({
      integrationId: 'slack',
      showAddButton: true,
    });
    multiple.vm.$emit('add');
    await flushPromises();
    expect(wrapper.findComponent(NewHook).props('integrationId')).toBe('slack');
    wrapper.findComponent(NewHook).vm.$emit('close');
    await flushPromises();
    expect(wrapper.find('.modal').exists()).toBe(false);
    multiple.vm.$emit('add');
    await flushPromises();
    wrapper.findComponent(Modal).vm.$emit('update:show', false);
    await flushPromises();
    expect(wrapper.find('.modal').exists()).toBe(false);
  });

  it('opens the add modal from a single integration', async () => {
    const { wrapper } = await mountPage();
    wrapper.findComponent(Single).vm.$emit('add');
    await flushPromises();
    expect(wrapper.find('.new-hook').exists()).toBe(true);
  });

  it('deletes an account hook', async () => {
    const { wrapper, dispatch } = await mountPage();
    wrapper
      .findComponent(Single)
      .vm.$emit('delete', { id: 4, app_id: 'slack' });
    await flushPromises();
    expect(deleteModal(wrapper).props()).toMatchObject({
      show: true,
      title: 'INTEGRATION_APPS.DELETE.TITLE.ACCOUNT',
      message: 'INTEGRATION_APPS.DELETE.MESSAGE.ACCOUNT',
      confirmText: 'INTEGRATION_APPS.DELETE.CONFIRM_BUTTON_TEXT.ACCOUNT',
      rejectText: 'INTEGRATION_APPS.DELETE.CANCEL_BUTTON_TEXT',
    });
    await deleteModal(wrapper).props('onConfirm')();
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith('integrations/deleteHook', {
      hookId: 4,
      appId: 'slack',
    });
    expect(useAlert).toHaveBeenCalledWith(
      'INTEGRATION_APPS.DELETE.API.SUCCESS_MESSAGE'
    );
    expect(deleteModal(wrapper).props('show')).toBe(false);
  });

  it('uses inbox wording and reports delete errors', async () => {
    const { wrapper, dispatch } = await mountPage({
      multiple: true,
      inbox: true,
    });
    wrapper.findComponent(Multiple).vm.$emit('delete', { id: 5, app_id: 'x' });
    await flushPromises();
    expect(deleteModal(wrapper).props()).toMatchObject({
      title: 'INTEGRATION_APPS.DELETE.TITLE.INBOX',
      message: 'INTEGRATION_APPS.DELETE.MESSAGE.INBOX',
      confirmText: 'INTEGRATION_APPS.DELETE.CONFIRM_BUTTON_TEXT.INBOX',
    });
    dispatch.mockRejectedValueOnce({
      response: { data: { message: 'Locked' } },
    });
    await deleteModal(wrapper).props('onConfirm')();
    expect(useAlert).toHaveBeenCalledWith('Locked');
    dispatch.mockRejectedValueOnce(new Error('down'));
    await deleteModal(wrapper).props('onConfirm')();
    expect(useAlert).toHaveBeenCalledWith(
      'INTEGRATION_APPS.DELETE.API.ERROR_MESSAGE'
    );
    expect(deleteModal(wrapper).props('show')).toBe(true);
    deleteModal(wrapper).props('onClose')();
    await flushPromises();
    expect(deleteModal(wrapper).props('show')).toBe(false);
    wrapper.findComponent(Multiple).vm.$emit('delete', { id: 5 });
    await flushPromises();
    deleteModal(wrapper).vm.$emit('update:show', false);
    await flushPromises();
    expect(deleteModal(wrapper).props('show')).toBe(false);
  });
});
