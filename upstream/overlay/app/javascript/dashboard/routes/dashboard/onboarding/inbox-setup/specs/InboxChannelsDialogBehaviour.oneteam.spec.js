/**
 * OneTeam behaviour spec for the onboarding "all channels" dialog.
 *
 * Covers the channel grid (hiding channels without installation
 * credentials, muting deferred and disabled ones, the website card
 * deferred until a website inbox exists, connected ticks and fallback
 * icons), clicking cards (credential form, Facebook page picker, WhatsApp
 * signup, OAuth redirect, and ignoring muted cards), going back, the
 * created event, and opening the dialog preselected to a channel.
 */
import { mount } from '@vue/test-utils';
import InboxChannelsDialog from '../InboxChannelsDialog.vue';

const env = vi.hoisted(() => ({
  log: [],
  connectViaOAuth: vi.fn(),
  connectWhatsapp: vi.fn(),
  unconfigured: [],
  disabled: [],
}));

vi.mock('../useChannelConnect', () => ({
  useChannelConnect: () => ({
    connectViaOAuth: env.connectViaOAuth,
    connectWhatsapp: env.connectWhatsapp,
  }),
}));
vi.mock('../useChannelConfig', () => ({
  useChannelConfig: () => ({
    isConfigured: type => !env.unconfigured.includes(type),
    isEnabled: type => !env.disabled.includes(type),
  }),
}));

const Dialog = {
  name: 'Dialog',
  props: ['title', 'description'],
  emits: ['close'],
  methods: {
    open: () => env.log.push('open'),
    close: () => env.log.push('close'),
  },
  template: '<div><slot /></div>',
};
const form = name => ({
  name,
  props: ['channel'],
  emits: ['back', 'created'],
  template: `<div class="${name}" />`,
});
const InboxChannelForm = form('InboxChannelForm');
const InboxFacebookForm = form('InboxFacebookForm');

const mountDialog = inboxes =>
  mount(InboxChannelsDialog, {
    props: inboxes ? { inboxes } : {},
    global: {
      stubs: {
        Dialog,
        InboxChannelForm,
        InboxFacebookForm,
        ChannelIcon: { props: ['inbox'], template: '<i class="channel" />' },
        Icon: { props: ['icon'], template: '<i :data-icon="icon" />' },
      },
    },
  });

const card = (wrapper, label) =>
  wrapper.findAll('button').find(b => b.text().includes(label));
const LABEL = type => `INBOX_MGMT.ADD.AUTH.CHANNEL.${type}.TITLE`;

describe('InboxChannelsDialog behaviour', () => {
  beforeEach(() => {
    env.log = [];
    env.unconfigured = [];
    env.disabled = [];
    env.connectViaOAuth.mockClear();
    env.connectWhatsapp.mockClear();
  });

  it('lists channels with their availability', () => {
    env.unconfigured = ['tiktok'];
    env.disabled = ['instagram'];
    const wrapper = mountDialog([{ channel_type: 'Channel::Whatsapp' }]);
    const dialog = wrapper.findComponent(Dialog);
    expect(dialog.props()).toEqual({
      title: 'ONBOARDING_INBOX_SETUP.CHANNELS_DIALOG.TITLE',
      description: 'ONBOARDING_INBOX_SETUP.CHANNELS_DIALOG.SUBTITLE',
    });
    expect(card(wrapper, LABEL('TIKTOK'))).toBeUndefined();

    const website = card(wrapper, LABEL('WEBSITE'));
    expect(website.attributes('disabled')).toBeDefined();
    expect(website.classes()).toContain('cursor-not-allowed');
    expect(website.text()).toContain(
      'ONBOARDING_INBOX_SETUP.CHANNELS_DIALOG.SETUP_LATER'
    );
    expect(
      card(wrapper, LABEL('INSTAGRAM')).attributes('disabled')
    ).toBeDefined();

    const whatsapp = card(wrapper, LABEL('WHATSAPP'));
    expect(whatsapp.find('[data-icon="i-lucide-circle-check"]').exists()).toBe(
      true
    );
    expect(
      card(wrapper, LABEL('LINE'))
        .find('[data-icon="i-lucide-chevron-right"]')
        .exists()
    ).toBe(true);
    expect(
      card(wrapper, 'ONBOARDING_INBOX_SETUP.CHANNELS.OTHER_EMAIL')
        .find('[data-icon="i-woot-mail"]')
        .exists()
    ).toBe(true);
  });

  it('unlocks the website card once a website inbox exists', () => {
    const wrapper = mountDialog([{ channel_type: 'Channel::WebWidget' }]);
    const website = card(wrapper, LABEL('WEBSITE'));
    expect(website.attributes('disabled')).toBeUndefined();
    expect(website.classes()).toContain('cursor-pointer');
  });

  it('starts each connect flow from its card', async () => {
    const wrapper = mountDialog();
    await card(wrapper, LABEL('WHATSAPP')).trigger('click');
    expect(env.connectWhatsapp).toHaveBeenCalled();
    await card(wrapper, LABEL('INSTAGRAM')).trigger('click');
    await card(wrapper, LABEL('TIKTOK')).trigger('click');
    expect(env.connectViaOAuth.mock.calls).toEqual([['instagram'], ['tiktok']]);

    await card(wrapper, LABEL('TELEGRAM')).trigger('click');
    const credentials = wrapper.findComponent(InboxChannelForm);
    expect(credentials.props('channel').type).toBe('telegram');
    expect(wrapper.findComponent(Dialog).props()).toEqual({
      title: 'ONBOARDING_INBOX_SETUP.CHANNELS_DIALOG.CONNECT_TITLE',
      description: 'ONBOARDING_INBOX_SETUP.CHANNELS_DIALOG.CONNECT_SUBTITLE',
    });
    await credentials.vm.$emit('back');
    expect(wrapper.findComponent(InboxChannelForm).exists()).toBe(false);

    await card(wrapper, LABEL('FACEBOOK')).trigger('click');
    const facebook = wrapper.findComponent(InboxFacebookForm);
    expect(wrapper.findComponent(Dialog).props('description')).toBe(
      'ONBOARDING_INBOX_SETUP.CHANNELS_DIALOG.FACEBOOK_SUBTITLE'
    );
    await facebook.vm.$emit('created');
    expect(env.log).toEqual(['close']);
    expect(wrapper.emitted('connected')).toHaveLength(1);
    await facebook.vm.$emit('back');
    expect(wrapper.findComponent(InboxFacebookForm).exists()).toBe(false);
  });

  it('ignores muted cards and resets on close', async () => {
    const wrapper = mountDialog();
    wrapper.vm.open();
    card(wrapper, LABEL('SMS')).element.disabled = false;
    await card(wrapper, LABEL('SMS')).trigger('click');
    expect(env.connectViaOAuth).not.toHaveBeenCalled();

    await card(wrapper, LABEL('LINE')).trigger('click');
    await wrapper.findComponent(InboxChannelForm).vm.$emit('created');
    await wrapper.findComponent(Dialog).vm.$emit('close');
    expect(wrapper.findComponent(InboxChannelForm).exists()).toBe(false);
    expect(wrapper.emitted('connected')).toHaveLength(1);
  });

  it('opens preselected to a usable channel only', async () => {
    const wrapper = mountDialog();
    wrapper.vm.open('line');
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(InboxChannelForm).props('channel').type).toBe(
      'line'
    );

    wrapper.vm.open('sms');
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(InboxChannelForm).exists()).toBe(false);

    wrapper.vm.open();
    wrapper.vm.close();
    expect(env.log).toEqual(['open', 'open', 'open', 'close']);
  });
});
