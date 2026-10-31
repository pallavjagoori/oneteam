/**
 * OneTeam behaviour spec for the webhooks settings page.
 *
 * Covers loading the webhook integration and list, the Chatwoot Cloud
 * paywall (and loading once the feature turns on), the count and
 * search, opening and closing the add and edit dialogs, and deleting a
 * webhook with success and error alerts.
 */
import { reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import WebhooksIndex from '../Index.vue';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('shared/composables/useBranding', () => ({
  useBranding: () => ({ replaceInstallationName: text => `branded ${text}` }),
}));

const Layout = {
  name: 'SettingsLayout',
  props: ['isLoading', 'noRecordsFound'],
  template: '<div><slot name="header" /><slot name="body" /><slot /></div>',
};
const Header = {
  name: 'BaseSettingsHeader',
  props: ['searchQuery', 'title', 'description', 'searchPlaceholder'],
  emits: ['update:searchQuery'],
  template: '<header><slot name="count" /><slot name="actions" /></header>',
};
const Table = {
  name: 'BaseTable',
  props: ['headers', 'items', 'noDataMessage'],
  template: '<table><slot name="row" :items="items" /></table>',
};
const Row = {
  name: 'WebhookRow',
  props: ['webhook', 'index'],
  emits: ['edit', 'delete'],
  template: '<tr />',
};
const NextButton = {
  name: 'NextButton',
  props: ['label'],
  template: '<button>{{ label }}</button>',
};
const Modal = {
  name: 'WootModal',
  props: ['show', 'onClose'],
  template: '<div><slot /></div>',
};
const DeleteModal = {
  name: 'WootDeleteModal',
  props: ['show', 'onClose', 'onConfirm', 'message'],
  template: '<div />',
};
const NewWebhook = {
  name: 'NewWebhook',
  props: ['onClose'],
  template: '<div class="new" />',
};
const EditWebhook = {
  name: 'EditWebhook',
  props: ['id', 'value', 'onClose'],
  template: '<div class="edit" />',
};

const hooks = [
  { id: 1, name: 'Orders', url: 'https://shop.test/hook' },
  { id: 2, name: 'CRM', url: 'https://crm.test/in' },
];

/** Builds UI flags whose fetchingList follows the test state. */
function computedFlags(state) {
  return {
    get fetchingList() {
      return state.fetching;
    },
  };
}

const mountPage = async ({
  records = hooks,
  cloud = false,
  enabled = true,
  integration = { name: 'Webhooks', description: 'Events' },
} = {}) => {
  const state = reactive({ cloud, enabled, fetching: false });
  const $store = {
    dispatch: vi.fn().mockResolvedValue(),
    getters: reactive({
      'webhooks/getWebhooks': records,
      'webhooks/getUIFlags': computedFlags(state),
      getCurrentAccountId: 1,
      'accounts/isFeatureEnabledonAccount': (id, flag) =>
        id === 1 && flag === 'api_and_webhooks' && state.enabled,
      'globalConfig/isOnChatwootCloud': cloud,
      'integrations/getIntegration': () => integration,
    }),
  };
  const wrapper = mount(WebhooksIndex, {
    global: {
      stubs: {
        SettingsLayout: Layout,
        BaseSettingsHeader: Header,
        BaseTable: Table,
        WebhookRow: Row,
        NextButton,
        WootModal: Modal,
        WootDeleteModal: DeleteModal,
        NewWebhook,
        EditWebhook,
        WebhookPaywall: { template: '<div class="paywall" />' },
      },
      mocks: {
        $store,
        $t: (key, args) => (args ? `${key} ${JSON.stringify(args)}` : key),
      },
    },
  });
  await flushPromises();
  return { wrapper, $store, state };
};

describe('Webhooks index behaviour', () => {
  it('loads the integration and webhooks and lists them', async () => {
    const { wrapper, $store } = await mountPage();
    expect($store.dispatch).toHaveBeenCalledWith('webhooks/get');
    expect($store.dispatch).toHaveBeenCalledWith('integrations/get', 'webhook');
    expect(wrapper.findComponent(Header).props()).toMatchObject({
      title: 'Webhooks',
      description: 'branded Events',
      searchPlaceholder: 'INTEGRATION_SETTINGS.WEBHOOK.SEARCH_PLACEHOLDER',
    });
    expect(wrapper.findAllComponents(Row)).toHaveLength(2);
    expect(wrapper.text()).toContain('INTEGRATION_SETTINGS.WEBHOOK.COUNT');
    expect(wrapper.findComponent(Table).props('noDataMessage')).toBe('');
    expect(wrapper.findComponent(Layout).props()).toEqual({
      isLoading: false,
      noRecordsFound: false,
    });
  });

  it('shows the empty state and hides the header until the integration loads', async () => {
    const { wrapper } = await mountPage({ records: [], integration: {} });
    expect(wrapper.findComponent(Header).exists()).toBe(false);
    expect(wrapper.findComponent(Layout).props('noRecordsFound')).toBe(true);
  });

  it('shows the cloud paywall and loads once the feature is enabled', async () => {
    const { wrapper, $store, state } = await mountPage({
      cloud: true,
      enabled: false,
    });
    expect(wrapper.find('.paywall').exists()).toBe(true);
    expect(wrapper.findComponent(Header).props('searchPlaceholder')).toBe('');
    expect(wrapper.find('header').text()).toBe('');
    expect(wrapper.findComponent(Modal).exists()).toBe(false);
    expect($store.dispatch).not.toHaveBeenCalledWith('webhooks/get');
    expect(wrapper.findComponent(Layout).props('noRecordsFound')).toBe(false);
    state.fetching = true;
    state.enabled = true;
    await flushPromises();
    expect($store.dispatch).toHaveBeenCalledWith('webhooks/get');
    expect(wrapper.findComponent(Layout).props('isLoading')).toBe(true);
  });

  it('searches webhooks', async () => {
    const { wrapper } = await mountPage();
    await wrapper.findComponent(Header).vm.$emit('update:searchQuery', 'crm');
    expect(
      wrapper.findAllComponents(Row).map(r => r.props('webhook').id)
    ).toEqual([2]);
    expect(wrapper.findComponent(Table).props('noDataMessage')).toBe(
      'INTEGRATION_SETTINGS.WEBHOOK.NO_RESULTS'
    );
    await wrapper.findComponent(Header).vm.$emit('update:searchQuery', ' ');
    expect(wrapper.findAllComponents(Row)).toHaveLength(2);
  });

  it('opens and closes the add and edit dialogs', async () => {
    const { wrapper } = await mountPage();
    await wrapper.find('header button').trigger('click');
    expect(wrapper.find('.new').exists()).toBe(true);
    wrapper.findComponent(NewWebhook).props('onClose')();
    await flushPromises();
    expect(wrapper.find('.new').exists()).toBe(false);

    await wrapper.findAllComponents(Row)[1].vm.$emit('edit', hooks[1]);
    expect(wrapper.findComponent(EditWebhook).props()).toMatchObject({
      id: 2,
      value: hooks[1],
    });
    wrapper.findComponent(EditWebhook).props('onClose')();
    await flushPromises();
    expect(wrapper.find('.edit').exists()).toBe(false);
  });

  it('deletes a webhook and reports the result', async () => {
    const { wrapper, $store } = await mountPage();
    const modal = () => wrapper.findComponent(DeleteModal);
    await wrapper.findAllComponents(Row)[0].vm.$emit('delete', hooks[0]);
    expect(modal().props('show')).toBe(true);
    expect(modal().props('message')).toContain('https://shop.test/hook');
    modal().props('onClose')();
    await flushPromises();
    expect(modal().props('show')).toBe(false);

    modal().props('onConfirm')();
    await flushPromises();
    expect($store.dispatch).toHaveBeenCalledWith('webhooks/delete', 1);
    expect(useAlert).toHaveBeenLastCalledWith(
      'INTEGRATION_SETTINGS.WEBHOOK.DELETE.API.SUCCESS_MESSAGE'
    );
    $store.dispatch.mockRejectedValueOnce(new Error('x'));
    modal().props('onConfirm')();
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'INTEGRATION_SETTINGS.WEBHOOK.DELETE.API.ERROR_MESSAGE'
    );
  });
});
