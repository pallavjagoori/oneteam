/**
 * OneTeam behaviour specs for the inbox settings screen: which tabs each
 * channel gets, the reauthorization banners, account health for WhatsApp
 * and Twilio, the WhatsApp manual migration, webhook secrets, avatar
 * handling and saving the inbox. Child components are shallow stubs.
 */
import { flushPromises, shallowMount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import InboxHealthAPI from 'dashboard/api/inboxHealth';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import { LocalStorage } from 'shared/helpers/localStorage';
import { nextTick } from 'vue';
import { createStore } from 'vuex';
import Settings from '../Settings.vue';

vi.mock('dashboard/composables', async importOriginal => ({
  ...(await importOriginal()),
  useAlert: vi.fn(),
}));
vi.mock('dashboard/api/inboxHealth', () => ({
  default: { getHealthStatus: vi.fn(), registerWebhook: vi.fn() },
}));
vi.mock('shared/helpers/clipboard', () => ({ copyTextToClipboard: vi.fn() }));

const WEB_WIDGET = {
  id: 5,
  name: 'Website',
  channel_type: 'Channel::WebWidget',
  avatar_url: 'https://cdn.test/a.png',
  webhook_url: 'https://hooks.test',
  greeting_enabled: true,
  greeting_message: 'Hi',
  enable_email_collect: true,
  sender_name_type: 'friendly',
  business_name: 'Acme',
  allow_messages_after_resolved: true,
  continuity_via_email: true,
  website_url: 'https://acme.test',
  welcome_title: 'Welcome',
  welcome_tagline: 'We reply fast',
  selected_feature_flags: ['attachments'],
  reply_time: 'in_a_few_hours',
  lock_to_single_conversation: false,
  help_center: { slug: 'docs' },
  widget_color: '#1f93ff',
};
const WHATSAPP_CLOUD = {
  id: 6,
  name: 'WhatsApp',
  channel_type: 'Channel::Whatsapp',
  provider: 'whatsapp_cloud',
  provider_config: { source: 'embedded_signup', api_key: 'old' },
};
const TWILIO_SMS = {
  id: 7,
  name: 'SMS',
  channel_type: 'Channel::TwilioSms',
  medium: 'sms',
  phone_number: '+15550001',
};

const migrationDialog = { open: vi.fn(), close: vi.fn() };

const mountWith = ({
  inbox = WEB_WIDGET,
  features = [],
  isOnChatwootCloud = false,
  isMetaMessageSendingDisabled = false,
  instagramInbox = null,
  route = {},
  updateInbox = () => Promise.resolve(),
  resetSecret = () => Promise.resolve(true),
  deleteInboxAvatar = () => Promise.resolve(),
  isFetching = false,
} = {}) => {
  const dispatched = [];
  const store = createStore({
    // A copy, because v-model writes some fields straight into the inbox.
    state: { inbox: inbox && { ...inbox } },
    mutations: {
      setInbox: (s, value) => {
        s.inbox = value;
      },
    },
    actions: {
      'agents/get': () => dispatched.push('agents/get'),
      'teams/get': () => dispatched.push('teams/get'),
      'labels/get': () => dispatched.push('labels/get'),
      'portals/index': () => dispatched.push('portals/index'),
      'inboxes/updateInbox': (_, payload) => {
        dispatched.push(payload);
        return updateInbox(payload);
      },
      'inboxes/resetSecret': () => resetSecret(),
      'inboxes/deleteInboxAvatar': () => deleteInboxAvatar(),
    },
    getters: {
      getCurrentAccountId: () => 1,
      'accounts/isFeatureEnabledonAccount': () => (_, flag) =>
        features.includes(flag),
      'globalConfig/isOnChatwootCloud': () => isOnChatwootCloud,
      'globalConfig/isMetaMessageSendingDisabled': () =>
        isMetaMessageSendingDisabled,
      'inboxes/getUIFlags': () => ({ isFetching }),
      'inboxes/getInbox': s => () => s.inbox,
      'inboxes/getInstagramInboxByInstagramId': () => () => instagramInbox,
      'portals/allPortals': () => [
        { id: 3, slug: 'docs' },
        { id: 4, slug: 'faq' },
      ],
    },
  });
  const $route = {
    name: 'settings_inbox_show',
    params: { accountId: 1, inboxId: String(inbox.id), ...route.params },
    query: { ...route.query },
  };
  const wrapper = shallowMount(Settings, {
    global: {
      plugins: [store],
      mocks: { $t: key => key, $route },
      directives: { onClickaway: {} },
      stubs: {
        // Render the layout wrappers so the form controls inside them exist.
        SettingIntroBanner: false,
        Banner: false,
        SettingsAccordion: false,
        SettingsFieldSection: false,
        SettingsToggleSection: false,
        'woot-input': {
          name: 'WootInput',
          props: ['modelValue'],
          emits: ['update:modelValue', 'blur'],
          template: '<input />',
        },
        'woot-tabs': { name: 'WootTabs', template: '<div><slot /></div>' },
        'woot-tabs-item': { template: '<div />' },
        WhatsappManualMigrationDialog: {
          name: 'WhatsappManualMigrationDialog',
          template: '<div />',
          methods: { open: migrationDialog.open, close: migrationDialog.close },
        },
      },
    },
  });
  return { wrapper, vm: wrapper.vm, store, dispatched, $route };
};

const tabKeys = vm => vm.tabs.map(tab => tab.key);

// Every v-model listener on the child components rendered under a vnode.
const modelListeners = (vnode, found = []) => {
  if (!vnode) return found;
  if (vnode.component) {
    Object.entries(vnode.props || {})
      .filter(([name]) => name.startsWith('onUpdate:'))
      .forEach(([name, handler]) => found.push({ name, handler }));
    modelListeners(vnode.component.subTree, found);
  }
  if (Array.isArray(vnode.children)) {
    vnode.children.forEach(child => modelListeners(child, found));
  }
  return found;
};

beforeEach(() => {
  InboxHealthAPI.getHealthStatus.mockResolvedValue({ data: { ok: true } });
  migrationDialog.open = vi.fn();
  migrationDialog.close = vi.fn();
  localStorage.clear();
});

describe('Inbox settings behaviour', () => {
  describe('loading', () => {
    it('fetches shared data and copies the inbox into the form', () => {
      const { vm, dispatched } = mountWith();
      expect(dispatched).toEqual([
        'agents/get',
        'teams/get',
        'labels/get',
        'portals/index',
      ]);
      expect(vm.selectedInboxName).toBe('Website');
      expect(vm.selectedPortalSlug).toBe('docs');
      expect(vm.channelWelcomeTagline).toBe('We reply fast');
      expect(vm.widgetBubblePosition).toBe('right');
    });

    it('fills defaults for missing inbox fields', () => {
      const { vm } = mountWith({
        inbox: {
          id: 5,
          channel_type: 'Channel::WebWidget',
          greeting_enabled: null,
        },
      });
      expect(vm.greetingEnabled).toBe(false);
      expect(vm.greetingMessage).toBe('');
      expect(vm.selectedPortalSlug).toBe('');
      expect(vm.selectedFeatureFlags).toEqual([]);
    });

    it('keeps saved widget bubble settings', () => {
      const { vm } = mountWith();
      LocalStorage.set(vm.widgetBuilderStorageKey, {
        position: 'left',
        type: 'expanded_bubble',
        launcherTitle: 'Chat',
      });
      vm.syncInboxData();
      expect([
        vm.widgetBubblePosition,
        vm.widgetBubbleType,
        vm.widgetBubbleLauncherTitle,
      ]).toEqual(['left', 'expanded_bubble', 'Chat']);

      LocalStorage.set(vm.widgetBuilderStorageKey, {});
      vm.syncInboxData();
      expect(vm.widgetBubbleType).toBe('standard');
    });

    it('does nothing to the form without an inbox id', () => {
      const { vm, store } = mountWith();
      vm.selectedInboxName = 'typed';
      store.commit('setInbox', { channel_type: 'Channel::WebWidget' });
      vm.syncInboxData();
      expect(vm.selectedInboxName).toBe('typed');
    });

    it('only refreshes feature flags when the same inbox updates', async () => {
      const { vm, store } = mountWith();
      vm.selectedInboxName = 'typed';
      store.commit('setInbox', {
        ...WEB_WIDGET,
        selected_feature_flags: ['emoji_picker'],
      });
      await nextTick();
      expect(vm.selectedFeatureFlags).toEqual(['emoji_picker']);
      expect(vm.selectedInboxName).toBe('typed');

      store.commit('setInbox', {
        ...WEB_WIDGET,
        selected_feature_flags: undefined,
      });
      await nextTick();
      expect(vm.selectedFeatureFlags).toEqual([]);
      expect(vm.selectedInboxName).toBe('typed');
    });

    it('reloads the form when the route moves to another inbox', () => {
      const { vm } = mountWith();
      vm.selectedInboxName = 'typed';
      const watcher = Settings.watch.$route.bind(vm);
      watcher(
        { name: 'settings_inbox_show', params: { inboxId: '5' } },
        { params: { inboxId: '5' } }
      );
      watcher({ name: 'other', params: { inboxId: '9' } }, { params: {} });
      expect(vm.selectedInboxName).toBe('typed');
      watcher(
        { name: 'settings_inbox_show', params: { inboxId: '9' } },
        { params: { inboxId: '5' } }
      );
      expect(vm.selectedInboxName).toBe('Website');
    });
  });

  it('shows a spinner while inboxes load', () => {
    const { wrapper } = mountWith({ isFetching: true });
    expect(wrapper.findComponent({ name: 'WootTabs' }).exists()).toBe(false);
  });

  describe('tabs', () => {
    it('gives a web widget its pre-chat form and configuration tabs', () => {
      const { vm } = mountWith({ features: ['agent_bots'] });
      expect(tabKeys(vm)).toEqual([
        'inbox-settings',
        'collaborators',
        'business-hours',
        'csat',
        'pre-chat-form',
        'configuration',
        'bot-configuration',
      ]);
      expect(vm.bannerMaxWidth).toBe('max-w-7xl');
      expect(vm.inboxNameLabel).toBe('INBOX_MGMT.ADD.WEBSITE_NAME.LABEL');
      expect(vm.inboxNamePlaceHolder).toBe(
        'INBOX_MGMT.ADD.WEBSITE_NAME.PLACEHOLDER'
      );
    });

    it('adds health and calls tabs for WhatsApp Cloud with voice', async () => {
      const { vm } = mountWith({
        inbox: WHATSAPP_CLOUD,
        features: ['channel_voice'],
      });
      await flushPromises();
      expect(tabKeys(vm)).toEqual([
        'inbox-settings',
        'collaborators',
        'business-hours',
        'csat',
        'configuration',
        'whatsapp-health',
        'calls-configuration',
      ]);
      expect(vm.whatsAppAPIProviderName).toBe(
        'INBOX_MGMT.ADD.WHATSAPP.PROVIDERS.WHATSAPP_CLOUD'
      );
      expect(vm.bannerMaxWidth).toBe('max-w-4xl');
    });

    it('adds health and voice tabs for a Twilio SMS number', () => {
      const { vm } = mountWith({
        inbox: TWILIO_SMS,
        features: ['channel_voice'],
      });
      expect(tabKeys(vm)).toEqual([
        'inbox-settings',
        'collaborators',
        'business-hours',
        'csat',
        'configuration',
        'twilio-health',
        'voice-configuration',
      ]);
      expect(vm.textAreaChannels).toBe(true);
      expect(vm.canLocktoSingleConversation).toBe(true);
      expect(vm.inboxNameLabel).toBe('INBOX_MGMT.ADD.CHANNEL_NAME.LABEL');
      expect(vm.inboxNamePlaceHolder).toBe(
        'INBOX_MGMT.ADD.CHANNEL_NAME.PLACEHOLDER'
      );
    });

    it('names the other WhatsApp providers', () => {
      expect(
        mountWith({
          inbox: {
            id: 8,
            channel_type: 'Channel::Whatsapp',
            provider: 'default',
          },
        }).vm.whatsAppAPIProviderName
      ).toBe('INBOX_MGMT.ADD.WHATSAPP.PROVIDERS.360_DIALOG');
      expect(
        mountWith({
          inbox: {
            id: 9,
            channel_type: 'Channel::TwilioSms',
            medium: 'whatsapp',
          },
        }).vm.whatsAppAPIProviderName
      ).toBe('INBOX_MGMT.ADD.WHATSAPP.PROVIDERS.TWILIO');
      expect(mountWith().vm.whatsAppAPIProviderName).toBe('');
    });

    it('opens the tab named in the route and falls back to the first', async () => {
      const csat = mountWith({ route: { params: { tab: 'csat' } } });
      await nextTick();
      expect(csat.vm.selectedTabKey).toBe('csat');
      expect(csat.vm.bannerMaxWidth).toBe('max-w-7xl');

      const unknown = mountWith({ route: { params: { tab: 'nope' } } });
      await nextTick();
      expect(unknown.vm.selectedTabIndex).toBe(0);
    });

    it('updates the URL when switching tabs', () => {
      const replaceState = vi.spyOn(window.history, 'replaceState');
      const { vm } = mountWith();
      vm.onTabChange(1);
      expect(replaceState).toHaveBeenLastCalledWith(
        null,
        '',
        '/app/accounts/1/settings/inboxes/5/collaborators'
      );
      expect(vm.bannerMaxWidth).toBe('max-w-4xl');
      vm.onTabChange(0);
      expect(replaceState).toHaveBeenLastCalledWith(
        null,
        '',
        '/app/accounts/1/settings/inboxes/5'
      );
      replaceState.mockClear();
      vm.updateRouteWithoutRefresh(99);
      expect(replaceState).not.toHaveBeenCalled();
      replaceState.mockRestore();
    });

    it('jumps to the configuration tab when there is one', () => {
      const widget = mountWith();
      widget.vm.goToWhatsAppConfiguration();
      expect(widget.vm.selectedTabKey).toBe('configuration');

      const facebook = mountWith({
        inbox: { id: 10, channel_type: 'Channel::FacebookPage' },
      });
      facebook.vm.goToWhatsAppConfiguration();
      expect(facebook.vm.selectedTabIndex).toBe(0);
    });
  });

  describe('reauthorization and banners', () => {
    it.each([
      ['instagramUnauthorized', { channel_type: 'Channel::Instagram' }],
      ['tiktokUnauthorized', { channel_type: 'Channel::Tiktok' }],
      [
        'microsoftUnauthorized',
        { channel_type: 'Channel::Email', provider: 'microsoft' },
      ],
      ['facebookUnauthorized', { channel_type: 'Channel::FacebookPage' }],
      [
        'googleUnauthorized',
        { channel_type: 'Channel::Email', imap_address: 'imap.gmail.com' },
      ],
    ])('shows %s when the channel needs it', (key, inbox) => {
      const { vm } = mountWith({
        inbox: { id: 11, reauthorization_required: true, ...inbox },
      });
      expect(vm[key]).toBe(true);
    });

    it('flags a Facebook page whose Instagram account has its own inbox', () => {
      const { vm } = mountWith({
        inbox: {
          id: 12,
          channel_type: 'Channel::FacebookPage',
          instagram_id: 'ig1',
        },
        instagramInbox: { id: 13 },
      });
      expect(vm.hasDuplicateInstagramInbox).toEqual({ id: 13 });
    });

    it('shows the Instagram restriction banner while Meta sending is off', () => {
      const { vm } = mountWith({
        inbox: { id: 14, channel_type: 'Channel::Instagram' },
        isMetaMessageSendingDisabled: true,
      });
      expect(vm.showInstagramRestrictionSettingsBanner).toBe(true);
      expect(vm.metaRestrictionStatusUrl).toMatch(/^https:/);
    });

    it('describes email continuity by plan and feature flag', () => {
      const cloud = mountWith({ isOnChatwootCloud: true });
      expect(cloud.vm.showContinuityToggle).toBe(true);
      expect(cloud.vm.continuityDescription).toBe(
        'INBOX_MGMT.SETTINGS_POPUP.ENABLE_CONTINUITY_VIA_EMAIL_DISABLED_TEXT'
      );

      const enabled = mountWith({ features: ['inbound_emails'] });
      expect(enabled.vm.showContinuityToggle).toBe(true);
      expect(enabled.vm.continuityDescription).toBe(
        'INBOX_MGMT.SETTINGS_POPUP.ENABLE_CONTINUITY_VIA_EMAIL_SUB_TEXT'
      );
      expect(mountWith().vm.showContinuityToggle).toBe(false);
    });

    it('builds the inbox icon and identifier', () => {
      const { vm } = mountWith();
      expect(vm.inboxIcon).toEqual(expect.any(String));
      expect(vm.inboxName).toBe('Website');
      expect(vm.inboxIdentifier).toBeDefined();
    });
  });

  describe('account health', () => {
    it('loads WhatsApp health and spots an incomplete registration', async () => {
      InboxHealthAPI.getHealthStatus.mockResolvedValue({
        data: { platform_type: 'NOT_APPLICABLE' },
      });
      const { vm } = mountWith({ inbox: WHATSAPP_CLOUD });
      await flushPromises();
      expect(InboxHealthAPI.getHealthStatus).toHaveBeenCalledWith(6);
      expect(vm.whatsappRegistrationIncomplete).toBe(true);
      vm.healthData = { throughput: { level: 'NOT_APPLICABLE' } };
      expect(vm.whatsappRegistrationIncomplete).toBe(true);
      vm.healthData = { throughput: { level: 'STANDARD' } };
      expect(vm.whatsappRegistrationIncomplete).toBe(false);
      expect(vm.isLoadingHealth).toBe(false);
    });

    it('does not report registration for other inboxes', () => {
      const { vm } = mountWith();
      vm.healthData = { platform_type: 'NOT_APPLICABLE' };
      expect(vm.whatsappRegistrationIncomplete).toBe(false);
      expect(InboxHealthAPI.getHealthStatus).not.toHaveBeenCalled();
    });

    it('keeps structured provider errors and wraps plain ones', async () => {
      InboxHealthAPI.getHealthStatus.mockRejectedValueOnce({
        response: { data: { error: { type: 'authorization', code: 190 } } },
      });
      const { vm } = mountWith({ inbox: WHATSAPP_CLOUD });
      await flushPromises();
      expect(vm.healthError).toEqual({ type: 'authorization', code: 190 });

      InboxHealthAPI.getHealthStatus.mockRejectedValueOnce({
        response: { data: { error: 'Rate limited' } },
      });
      await vm.fetchHealthData();
      expect(vm.healthErrorMessage).toBe('Rate limited');

      InboxHealthAPI.getHealthStatus.mockRejectedValueOnce(
        new Error('offline')
      );
      await vm.fetchHealthData();
      expect(vm.healthError).toEqual({ type: 'generic', message: 'offline' });
    });

    it('loads Twilio SMS health too', async () => {
      mountWith({ inbox: TWILIO_SMS });
      await flushPromises();
      expect(InboxHealthAPI.getHealthStatus).toHaveBeenCalledWith(7);
    });

    it('registers the webhook and reloads health', async () => {
      const { vm } = mountWith({ inbox: WHATSAPP_CLOUD });
      await flushPromises();
      InboxHealthAPI.registerWebhook.mockResolvedValueOnce({});
      await vm.registerWebhook();
      expect(useAlert).toHaveBeenCalledWith(
        'INBOX_MGMT.ACCOUNT_HEALTH.WEBHOOK.REGISTER_SUCCESS'
      );
      expect(InboxHealthAPI.getHealthStatus).toHaveBeenCalledTimes(2);
      expect(vm.isRegisteringWebhook).toBe(false);
    });

    it('shows the provider, the error or a fallback when registering fails', async () => {
      const { vm } = mountWith({ inbox: WHATSAPP_CLOUD });
      InboxHealthAPI.registerWebhook
        .mockRejectedValueOnce({ response: { data: { error: 'Bad token' } } })
        .mockRejectedValueOnce(new Error('offline'))
        .mockRejectedValueOnce({});
      await vm.registerWebhook();
      await vm.registerWebhook();
      await vm.registerWebhook();
      expect(useAlert.mock.calls.map(([message]) => message)).toEqual([
        'Bad token',
        'offline',
        'INBOX_MGMT.ACCOUNT_HEALTH.WEBHOOK.REGISTER_ERROR',
      ]);
    });

    it('skips health calls without an inbox', async () => {
      // The screen cannot render without an inbox, so call the methods bare.
      const noInbox = { inbox: null };
      await Settings.methods.fetchHealthData.call(noInbox);
      await Settings.methods.registerWebhook.call(noInbox);
      expect(InboxHealthAPI.getHealthStatus).not.toHaveBeenCalled();
      expect(InboxHealthAPI.registerWebhook).not.toHaveBeenCalled();
    });
  });

  describe('WhatsApp manual migration', () => {
    const migratable = {
      inbox: WHATSAPP_CLOUD,
      features: ['whatsapp_manual_transfer'],
    };

    it('offers the migration for an embedded signup on the business app', async () => {
      InboxHealthAPI.getHealthStatus.mockResolvedValue({
        data: { is_on_biz_app: false },
      });
      const { vm } = mountWith({
        ...migratable,
        route: { query: { migration: 'whatsapp_manual' } },
      });
      await flushPromises();
      expect(vm.showWhatsAppManualMigration).toBe(true);
      vm.openWhatsAppManualMigrationIfRequested();
      await nextTick();
      expect(migrationDialog.open).toHaveBeenCalled();
    });

    it('moves the inbox to manual setup and closes the dialog', async () => {
      InboxHealthAPI.getHealthStatus.mockResolvedValue({
        data: { is_on_biz_app: false },
      });
      const { vm, dispatched } = mountWith(migratable);
      await flushPromises();
      await vm.transferWhatsAppToManualSetup({
        phoneNumberId: 'p1',
        wabaId: 'w1',
        accessToken: 't1',
      });
      expect(dispatched.at(-1)).toEqual({
        id: 6,
        formData: false,
        channel: {
          provider_config: {
            api_key: 't1',
            phone_number_id: 'p1',
            business_account_id: 'w1',
          },
        },
      });
      expect(useAlert).toHaveBeenCalledWith(
        'INBOX_MGMT.SETTINGS_POPUP.WHATSAPP_MANUAL_TRANSFER_SUCCESS'
      );
      expect(migrationDialog.close).toHaveBeenCalled();
      expect(vm.isTransferringWhatsAppToManual).toBe(false);
    });

    it('alerts when the transfer fails', async () => {
      const { vm } = mountWith({
        inbox: { ...WHATSAPP_CLOUD, provider_config: undefined },
        updateInbox: () => Promise.reject(new Error('no')),
      });
      await vm.transferWhatsAppToManualSetup({});
      expect(useAlert).toHaveBeenCalledWith(
        'INBOX_MGMT.SETTINGS_POPUP.WHATSAPP_MANUAL_TRANSFER_ERROR'
      );
    });
  });

  describe('webhook secret', () => {
    it('copies the secret', async () => {
      const { vm } = mountWith();
      await vm.copyWebhookSecret('s3cret');
      expect(copyTextToClipboard).toHaveBeenCalledWith('s3cret');
      expect(useAlert).toHaveBeenCalledWith(
        'INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_WEBHOOK_SECRET.COPY_SUCCESS'
      );
    });

    it('reports whether resetting the secret worked', async () => {
      await mountWith().vm.resetWebhookSecret();
      await mountWith({
        resetSecret: () => Promise.resolve(false),
      }).vm.resetWebhookSecret();
      expect(useAlert.mock.calls.map(([message]) => message)).toEqual([
        'INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_WEBHOOK_SECRET.RESET_SUCCESS',
        'INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_WEBHOOK_SECRET.RESET_ERROR',
      ]);
    });
  });

  describe('form wiring', () => {
    it.each([
      ['web widget', WEB_WIDGET],
      [
        'API inbox',
        {
          id: 15,
          channel_type: 'Channel::Api',
          secret: 'shh',
          webhook_url: 'https://hooks.test',
        },
      ],
      ['WhatsApp Cloud', WHATSAPP_CLOUD],
      ['Twilio SMS', TWILIO_SMS],
      ['Facebook', { id: 16, channel_type: 'Channel::FacebookPage' }],
      ['email', { id: 17, channel_type: 'Channel::Email', email: 'a@b.test' }],
    ])('sends every %s settings field back into the form', async (_, inbox) => {
      const { vm, wrapper } = mountWith({
        inbox,
        features: ['inbound_emails'],
      });
      await flushPromises();
      const listeners = modelListeners(wrapper.vm.$.subTree);
      expect(listeners.length).toBeGreaterThan(0);
      listeners.forEach(({ handler }, index) => {
        [handler].flat().forEach(fn => fn(`value-${index}`));
      });
      const state = JSON.stringify(vm.$data);
      expect(state).toContain('value-0');
    });

    it('switches tabs from the tab bar and toggles feature checkboxes', async () => {
      const { vm, wrapper } = mountWith();
      wrapper.findComponent({ name: 'WootTabs' }).vm.$emit('change', 3);
      expect(vm.selectedTabKey).toBe('csat');
      vm.onTabChange(0);
      await nextTick();
      const boxes = wrapper.findAll('input[type="checkbox"]');
      expect(boxes.length).toBeGreaterThan(0);
      await Promise.all(boxes.map(box => box.trigger('input')));
      expect(vm.selectedFeatureFlags).not.toContain('attachments');
    });
  });

  describe('saving', () => {
    it('sends the whole form, the portal id and the avatar', async () => {
      const { vm, dispatched } = mountWith({ features: ['inbound_emails'] });
      vm.selectedInboxName = '  Renamed  ';
      vm.handleImageUpload({ file: 'file', url: 'blob:x' });
      vm.showBusinessNameInput = true;
      await vm.updateInbox();

      expect(dispatched.at(-1)).toMatchObject({
        id: '5',
        name: 'Renamed',
        portal_id: 3,
        avatar: 'file',
        business_name: 'Acme',
        channel: {
          widget_color: '#1f93ff',
          reply_time: 'in_a_few_hours',
          continuity_via_email: true,
          selectedFeatureFlags: ['attachments'],
        },
      });
      expect(vm.avatarUrl).toBe('blob:x');
      expect(vm.showBusinessNameInput).toBe(false);
      expect(useAlert).toHaveBeenCalledWith(
        'INBOX_MGMT.EDIT.API.SUCCESS_MESSAGE'
      );
      expect(LocalStorage.get(vm.widgetBuilderStorageKey)).toEqual({
        position: 'right',
        type: 'standard',
        launcherTitle: '',
      });
    });

    it('fills defaults and clears the portal when none is picked', async () => {
      const { vm, dispatched } = mountWith();
      vm.selectedPortalSlug = 'missing';
      vm.greetingMessage = '';
      vm.businessName = '';
      vm.replyTime = '';
      vm.channelWelcomeTitle = '';
      vm.channelWelcomeTagline = '';
      await vm.updateInbox();
      expect(dispatched.at(-1)).toMatchObject({
        portal_id: null,
        business_name: null,
        channel: {
          reply_time: 'in_a_few_minutes',
          welcome_title: '',
          welcome_tagline: '',
          continuity_via_email: false,
        },
      });

      vm.selectedPortalSlug = '';
      await vm.updateInbox();
      expect(dispatched.at(-1).portal_id).toBeNull();
    });

    it('shows the error message, or a fallback, when saving fails', async () => {
      await mountWith({
        updateInbox: () => Promise.reject(new Error('Name taken')),
      }).vm.updateInbox();
      await mountWith({
        updateInbox: () => Promise.reject(new Error('')),
      }).vm.updateInbox();
      expect(useAlert.mock.calls.map(([message]) => message)).toEqual([
        'Name taken',
        'INBOX_MGMT.EDIT.API.ERROR_MESSAGE',
      ]);
    });

    it('deletes the avatar or reports why it could not', async () => {
      const { vm } = mountWith();
      await vm.handleAvatarDelete();
      expect(vm.avatarUrl).toBe('');
      await mountWith({
        deleteInboxAvatar: () => Promise.reject(new Error('Locked')),
      }).vm.handleAvatarDelete();
      await mountWith({
        deleteInboxAvatar: () => Promise.reject(new Error('')),
      }).vm.handleAvatarDelete();
      expect(useAlert.mock.calls.map(([message]) => message)).toEqual([
        'INBOX_MGMT.DELETE.API.AVATAR_SUCCESS_MESSAGE',
        'Locked',
        'INBOX_MGMT.DELETE.API.AVATAR_ERROR_MESSAGE',
      ]);
    });

    it('toggles feature flags, sender name and single conversation', async () => {
      const { vm } = mountWith();
      vm.handleFeatureFlag({ target: { value: 'emoji_picker' } });
      vm.handleFeatureFlag({ target: { value: 'attachments' } });
      expect(vm.selectedFeatureFlags).toEqual(['emoji_picker']);

      vm.toggleSenderNameType('professional');
      expect(vm.senderNameType).toBe('professional');
      vm.toggleLockToSingleConversation(true);
      expect(vm.locktoSingleConversation).toBe(true);

      vm.onClickShowBusinessNameInput();
      expect(vm.showBusinessNameInput).toBe(true);
      await nextTick();
      vm.hideBusinessNameInput();
      expect(vm.showBusinessNameInput).toBe(false);
    });
  });
});
