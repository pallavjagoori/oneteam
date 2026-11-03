/**
 * OneTeam behaviour spec for the WhatsApp channel provider picker.
 *
 * Covers choosing between WhatsApp Cloud and Twilio, going straight to
 * manual setup (with a warning) when Meta inbox creation is restricted,
 * the embedded signup with its manual fallback link, falling back to the
 * cloud form without a WhatsApp app id or the feature, asking for
 * embedded signup access on Chatwoot Cloud, and the Twilio and 360dialog
 * forms.
 */
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import Whatsapp from '../Whatsapp.vue';

const env = vi.hoisted(() => ({
  query: {},
  push: vi.fn(),
  cloud: false,
  feature: false,
  restricted: false,
  open: vi.fn(),
}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({
    name: 'settings_inboxes_page_channel',
    params: { page: 'new' },
    query: env.query,
  }),
  useRouter: () => ({ push: env.push }),
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  I18nT: { template: '<p class="fallback"><slot name="link" /></p>' },
}));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({
    isCloudFeatureEnabled: () => env.feature,
    isOnChatwootCloud: ref(env.cloud),
    isMetaInboxCreationDisabled: ref(env.restricted),
  }),
}));

const ChannelSelector = {
  name: 'ChannelSelector',
  props: ['title', 'description'],
  emits: ['click'],
  template:
    '<button class="provider" @click="$emit(\'click\')">{{ title }}</button>',
};
const Button = {
  name: 'Button',
  props: ['label'],
  emits: ['click'],
  template:
    '<button class="request" @click="$emit(\'click\')">{{ label }}</button>',
};
const tag = name => ({ name, template: `<i class="${name}" />` });

const mountPicker = (query = {}) => {
  env.query = query;
  return mount(Whatsapp, {
    global: {
      stubs: {
        ChannelSelector,
        Button,
        Icon: true,
        Banner: { template: '<div class="banner"><slot /></div>' },
        Twilio: { props: ['type'], template: '<i class="Twilio" />' },
        ThreeSixtyDialogWhatsapp: tag('ThreeSixtyDialogWhatsapp'),
        CloudWhatsapp: tag('CloudWhatsapp'),
        WhatsappManualSetup: tag('WhatsappManualSetup'),
        WhatsappEmbeddedSignup: {
          props: ['isDisabled'],
          template: '<i class="WhatsappEmbeddedSignup" />',
        },
        WhatsappAccessRequestDialog: {
          name: 'WhatsappAccessRequestDialog',
          setup: () => ({ open: env.open }),
          template: '<div />',
        },
      },
    },
  });
};

describe('Whatsapp provider picker behaviour', () => {
  beforeEach(() => {
    env.cloud = false;
    env.feature = false;
    env.restricted = false;
    window.chatwootConfig = { whatsappAppId: 'app-1' };
    vi.clearAllMocks();
  });

  it('offers WhatsApp Cloud and Twilio', async () => {
    const wrapper = mountPicker();
    expect(wrapper.text()).toContain(
      'INBOX_MGMT.ADD.WHATSAPP.SELECT_PROVIDER.DESCRIPTION'
    );
    const providers = wrapper.findAllComponents(ChannelSelector);
    expect(providers[0].props('description')).toBe(
      'INBOX_MGMT.ADD.WHATSAPP.PROVIDERS.WHATSAPP_CLOUD_DESC'
    );
    await providers[0].trigger('click');
    await providers[1].trigger('click');
    expect(env.push.mock.calls.map(([to]) => to.query.provider)).toEqual([
      'whatsapp',
      'twilio',
    ]);
    expect(env.push.mock.calls[0][0]).toMatchObject({
      name: 'settings_inboxes_page_channel',
      params: { page: 'new' },
    });
  });

  it('goes to manual setup with a warning when Meta is restricted', async () => {
    env.restricted = true;
    const wrapper = mountPicker();
    expect(wrapper.text()).toContain(
      'INBOX_MGMT.ADD.WHATSAPP.SELECT_PROVIDER.RESTRICTION_DESCRIPTION'
    );
    expect(wrapper.findComponent(ChannelSelector).props('description')).toBe(
      'INBOX_MGMT.ADD.WHATSAPP.PROVIDERS.WHATSAPP_CLOUD_MANUAL_SETUP_DESC'
    );
    await wrapper.findComponent(ChannelSelector).trigger('click');
    expect(env.push.mock.calls[0][0].query).toEqual({
      provider: 'whatsapp_manual',
    });

    const manual = mountPicker({ provider: 'whatsapp_manual' });
    expect(manual.find('.banner').exists()).toBe(true);
    expect(manual.find('.WhatsappManualSetup').exists()).toBe(true);
    expect(manual.find('.request').exists()).toBe(false);
  });

  it('shows the embedded signup with a manual fallback', async () => {
    const wrapper = mountPicker({ provider: 'whatsapp' });
    expect(wrapper.find('.WhatsappEmbeddedSignup').exists()).toBe(true);
    await wrapper.find('.fallback a').trigger('click');
    expect(env.push.mock.calls[0][0].query).toEqual({
      provider: 'whatsapp_manual',
    });

    env.cloud = true;
    env.feature = true;
    expect(
      mountPicker({ provider: 'whatsapp' })
        .find('.WhatsappEmbeddedSignup')
        .exists()
    ).toBe(true);
  });

  it('falls back to manual setup without an app id', () => {
    window.chatwootConfig = { whatsappAppId: 'none' };
    const wrapper = mountPicker({ provider: 'whatsapp' });
    expect(wrapper.find('.WhatsappManualSetup').exists()).toBe(true);
    expect(wrapper.find('.banner').exists()).toBe(false);
    window.chatwootConfig = undefined;
    expect(
      mountPicker({ provider: 'whatsapp' })
        .find('.WhatsappManualSetup')
        .exists()
    ).toBe(true);
  });

  it('asks for embedded signup access on Chatwoot Cloud', async () => {
    env.cloud = true;
    const wrapper = mountPicker({ provider: 'whatsapp' });
    expect(wrapper.find('.WhatsappManualSetup').exists()).toBe(true);
    await wrapper.find('.request').trigger('click');
    expect(env.open).toHaveBeenCalled();

    env.restricted = true;
    expect(
      mountPicker({ provider: 'whatsapp' }).find('.request').exists()
    ).toBe(false);
  });

  it('shows the Twilio, 360dialog and cloud forms', () => {
    expect(mountPicker({ provider: 'twilio' }).find('.Twilio').exists()).toBe(
      true
    );
    expect(
      mountPicker({ provider: '360dialog' })
        .find('.ThreeSixtyDialogWhatsapp')
        .exists()
    ).toBe(true);
    expect(
      mountPicker({ provider: 'whatsapp_cloud' })
        .find('.CloudWhatsapp')
        .exists()
    ).toBe(true);
  });
});
