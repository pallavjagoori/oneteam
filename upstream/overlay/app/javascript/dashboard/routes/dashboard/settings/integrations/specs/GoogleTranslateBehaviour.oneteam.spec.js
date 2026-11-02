/**
 * OneTeam behaviour spec for the Google Translate integration settings
 * page.
 *
 * Covers loading the integration (and the loading state until it is
 * loaded), the setup guide when nothing is connected, the connected
 * project details with the translation service row (Google selected,
 * another provider, or hidden without the plan), opening the add dialog,
 * and deleting the connection (success, API message and generic error).
 */
import { computed, reactive, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import GoogleTranslate from '../GoogleTranslate.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
  useMapGetter: () => computed(() => env.state.uiFlags),
  useFunctionGetter: () => computed(() => env.state.integration),
}));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({ currentAccount: computed(() => env.state.account) }),
}));
vi.mock('dashboard/composables/useTranslationPlan', () => ({
  useTranslationPlan: () => ({ isAvailable: env.plan }),
}));

const Layout = {
  name: 'SettingsLayout',
  props: ['isLoading'],
  template:
    '<div><slot name="header" /><div class="body"><slot name="body" /></div><slot /></div>',
};
const Hooks = {
  name: 'SingleIntegrationHooks',
  props: ['integrationId'],
  emits: ['add', 'delete'],
  template: '<div class="hooks" />',
};
const WootModal = {
  name: 'WootModal',
  props: ['show', 'onClose'],
  template: '<div v-if="show" class="add-modal"><slot /></div>',
};
const DeleteModal = {
  name: 'WootDeleteModal',
  props: ['show', 'onClose', 'onConfirm', 'title'],
  template: '<div v-if="show" class="delete-modal" />',
};
const NewHook = {
  name: 'NewHook',
  props: ['integrationId'],
  emits: ['close'],
  template: '<div class="new-hook" />',
};

const mountPage = () =>
  mount(GoogleTranslate, {
    global: {
      stubs: {
        SettingsLayout: Layout,
        SingleIntegrationHooks: Hooks,
        BaseSettingsHeader: true,
        NewHook,
        WootModal,
        WootDeleteModal: DeleteModal,
        RouterLink: {
          props: ['to'],
          template: '<a class="change"><slot /></a>',
        },
      },
    },
  });

const hook = { id: 12, settings: { project_id: 'acme-prod' } };

describe('GoogleTranslate settings behaviour', () => {
  beforeEach(() => {
    env.dispatch = vi.fn().mockResolvedValue();
    env.plan = ref(true);
    env.state = reactive({
      uiFlags: { isFetching: false },
      integration: { id: 'google_translate', hooks: [] },
      account: { settings: { translation_provider: 'google_translate' } },
    });
    useAlert.mockClear();
  });

  it('loads the integration and shows the loading state until ready', async () => {
    env.state.uiFlags = { isFetching: true };
    env.state.integration = {};
    const wrapper = mountPage();
    expect(env.dispatch).toHaveBeenCalledWith(
      'integrations/get',
      'google_translate'
    );
    expect(wrapper.findComponent(Layout).props('isLoading')).toBe(true);
    expect(wrapper.find('.hooks').exists()).toBe(false);

    env.state.integration = { id: 'google_translate' };
    await flushPromises();
    expect(wrapper.findComponent(Layout).props('isLoading')).toBe(false);
  });

  it('shows the setup guide when nothing is connected', async () => {
    const wrapper = mountPage();
    const links = wrapper.findAll('ol a').map(a => a.attributes('href'));
    expect(links).toEqual([
      'https://console.cloud.google.com/apis/library/translate.googleapis.com',
      'https://console.cloud.google.com/iam-admin/serviceaccounts',
    ]);
    expect(wrapper.findAll('ol li')).toHaveLength(3);

    await wrapper.findComponent(Hooks).vm.$emit('add');
    expect(wrapper.findComponent(NewHook).props('integrationId')).toBe(
      'google_translate'
    );
    await wrapper.findComponent(NewHook).vm.$emit('close');
    expect(wrapper.find('.add-modal').exists()).toBe(false);

    await wrapper.findComponent(Hooks).vm.$emit('add');
    wrapper.findComponent(WootModal).props('onClose')();
    await flushPromises();
    expect(wrapper.find('.add-modal').exists()).toBe(false);
  });

  it('shows the connected project and translation service', async () => {
    env.state.integration = { id: 'google_translate', hooks: [hook] };
    const wrapper = mountPage();
    expect(wrapper.text()).toContain('acme-prod');
    expect(wrapper.text()).toContain(
      'INTEGRATION_SETTINGS.GOOGLE_TRANSLATE.DETAILS.SERVICE_GOOGLE'
    );
    expect(wrapper.find('.change').exists()).toBe(true);

    env.state.account = { settings: {} };
    await flushPromises();
    expect(wrapper.text()).toContain(
      'INTEGRATION_SETTINGS.GOOGLE_TRANSLATE.DETAILS.SERVICE_OTHER'
    );

    env.state.account = null;
    env.state.integration = {
      id: 'google_translate',
      hooks: [{ id: 13 }],
    };
    env.plan.value = false;
    await flushPromises();
    expect(wrapper.find('.change').exists()).toBe(false);
  });

  it('deletes the connection and reports the outcome', async () => {
    env.state.integration = { id: 'google_translate', hooks: [hook] };
    const wrapper = mountPage();
    const hooks = wrapper.findComponent(Hooks);
    const modal = () => wrapper.findComponent(DeleteModal);

    await hooks.vm.$emit('delete', hook);
    expect(wrapper.find('.delete-modal').exists()).toBe(true);
    await modal().props('onConfirm')();
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('integrations/deleteHook', {
      hookId: 12,
      appId: 'google_translate',
    });
    expect(useAlert).toHaveBeenLastCalledWith(
      'INTEGRATION_APPS.DELETE.API.SUCCESS_MESSAGE'
    );
    expect(wrapper.find('.delete-modal').exists()).toBe(false);

    env.dispatch.mockRejectedValueOnce({
      response: { data: { message: 'Not allowed' } },
    });
    await hooks.vm.$emit('delete', hook);
    await modal().props('onConfirm')();
    expect(useAlert).toHaveBeenLastCalledWith('Not allowed');

    env.dispatch.mockRejectedValueOnce(undefined);
    await hooks.vm.$emit('delete', hook);
    await modal().props('onConfirm')();
    expect(useAlert).toHaveBeenLastCalledWith(
      'INTEGRATION_APPS.DELETE.API.ERROR_MESSAGE'
    );

    await hooks.vm.$emit('delete', hook);
    modal().props('onClose')();
    await flushPromises();
    expect(wrapper.find('.delete-modal').exists()).toBe(false);
  });
});
