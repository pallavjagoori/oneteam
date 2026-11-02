/**
 * OneTeam behaviour spec for an integration card in integration settings.
 *
 * Covers the logo, name and branded description, the Connect link and
 * custom action slot for integrations that are not enabled, the
 * Configure and Disconnect buttons for enabled ones, hiding the action
 * when asked, and disconnecting through the confirmation dialog with
 * success and error alerts and a return to the applications list.
 */
import { mount, flushPromises } from '@vue/test-utils';
import Integration from '../Integration.vue';

const env = vi.hoisted(() => ({
  dispatch: vi.fn(),
  push: vi.fn(),
  alert: vi.fn(),
  log: [],
}));

vi.mock('vuex', async importOriginal => ({
  ...(await importOriginal()),
  useStore: () => ({
    dispatch: env.dispatch,
    getters: { getCurrentAccountId: 4 },
  }),
}));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => ({ push: env.push }),
}));
vi.mock('dashboard/composables', () => ({ useAlert: env.alert }));
vi.mock('shared/composables/useBranding', () => ({
  useBranding: () => ({ replaceInstallationName: text => `[${text}]` }),
}));

const Button = {
  name: 'Button',
  props: ['label'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};
const Dialog = {
  name: 'Dialog',
  props: ['title', 'description'],
  emits: ['confirm'],
  methods: {
    open: () => env.log.push('open'),
    close: () => env.log.push('close'),
  },
  template:
    '<div class="dialog" :title="title" :data-description="description" />',
};
const RouterLink = {
  name: 'RouterLink',
  props: ['to'],
  template: '<a class="router-link" :href="to"><slot /></a>',
};

const mountCard = (props, slots) =>
  mount(Integration, {
    props: {
      integrationId: 'webhook',
      integrationName: 'Webhooks',
      integrationDescription: 'Send events',
      ...props,
    },
    slots,
    global: { stubs: { Button, Dialog, RouterLink } },
  });

const buttons = wrapper => wrapper.findAllComponents(Button);

describe('Integration card behaviour', () => {
  beforeEach(() => {
    env.log = [];
    vi.clearAllMocks();
  });

  it('shows the logo, name, description and Connect link', () => {
    const wrapper = mountCard({ integrationAction: '/connect/webhook' });
    const sources = wrapper.findAll('img').map(img => img.attributes('src'));
    expect(sources).toEqual([
      '/dashboard/images/integrations/webhook.png',
      '/dashboard/images/integrations/webhook-dark.png',
    ]);
    expect(wrapper.text()).toContain('Webhooks');
    expect(wrapper.text()).toContain('[Send events]');
    expect(wrapper.find('a[href="/connect/webhook"]').exists()).toBe(true);
    expect(buttons(wrapper).map(b => b.props('label'))).toEqual([
      'INTEGRATION_SETTINGS.CONNECT.BUTTON_TEXT',
    ]);
    expect(wrapper.find('.router-link').attributes('href')).toBe(
      '/app/accounts/4/settings/integrations/webhook'
    );

    const custom = mountCard({}, { action: '<span class="custom" />' });
    expect(custom.find('.custom').exists()).toBe(true);
  });

  it('offers Configure for an enabled integration, or hides it', () => {
    const wrapper = mountCard({ integrationEnabled: true });
    expect(buttons(wrapper).map(b => b.props('label'))).toEqual([
      'INTEGRATION_SETTINGS.WEBHOOK.CONFIGURE',
    ]);
    const hidden = mountCard({
      integrationEnabled: true,
      hideEnabledAction: true,
    });
    expect(buttons(hidden)).toHaveLength(0);
    expect(hidden.find('.router-link').exists()).toBe(false);
  });

  it('disconnects after confirmation', async () => {
    const wrapper = mountCard({
      integrationEnabled: true,
      integrationAction: 'disconnect',
      actionButtonText: 'Remove',
      deleteConfirmationText: { title: 'Sure?', message: 'Really?' },
    });
    expect(wrapper.findComponent(Dialog).props()).toEqual({
      title: 'Sure?',
      description: 'Really?',
    });
    const disconnect = buttons(wrapper)[0];
    expect(disconnect.props('label')).toBe('Remove');
    await disconnect.trigger('click');
    expect(env.log).toEqual(['open']);

    env.dispatch.mockResolvedValueOnce();
    await wrapper.findComponent(Dialog).vm.$emit('confirm');
    await flushPromises();
    expect(env.log).toEqual(['open', 'close']);
    expect(env.dispatch).toHaveBeenCalledWith(
      'integrations/deleteIntegration',
      'webhook'
    );
    expect(env.alert).toHaveBeenCalledWith(
      'INTEGRATION_SETTINGS.DELETE.API.SUCCESS_MESSAGE'
    );
    expect(env.push).toHaveBeenCalledWith({ name: 'settings_applications' });

    env.dispatch.mockRejectedValueOnce(new Error('nope'));
    await wrapper.findComponent(Dialog).vm.$emit('confirm');
    await flushPromises();
    expect(env.alert).toHaveBeenLastCalledWith(
      'INTEGRATION_SETTINGS.WEBHOOK.DELETE.API.ERROR_MESSAGE'
    );
  });

  it('uses default labels and skips the dialog before it mounts', () => {
    const wrapper = mountCard({
      integrationEnabled: true,
      integrationAction: 'disconnect',
    });
    expect(buttons(wrapper)[0].props('label')).toBe(
      'INTEGRATION_SETTINGS.WEBHOOK.DELETE.BUTTON_TEXT'
    );
    expect(wrapper.findComponent(Dialog).props()).toEqual({
      title: 'INTEGRATION_SETTINGS.WEBHOOK.DELETE.CONFIRM.TITLE',
      description: 'INTEGRATION_SETTINGS.WEBHOOK.DELETE.CONFIRM.MESSAGE',
    });

    // Without a mounted dialog, opening and closing do nothing.
    wrapper.vm.dialogRef = null;
    wrapper.vm.openDeletePopup();
    wrapper.vm.closeDeletePopup();
    expect(env.log).toEqual([]);
  });
});
