/**
 * OneTeam behaviour spec for the onboarding "set up your inboxes" step.
 *
 * Covers tracking the visit, finishing or skipping onboarding (tracking,
 * user refresh, redirect home, failure alert, ignoring double submits),
 * the help center status for enterprise accounts, the Meta restriction
 * banner, detected channels, connecting WhatsApp, dialog and OAuth
 * channels, opening the full channel list, and refetching inboxes.
 */
import { computed, ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { useAlert, useTrack } from 'dashboard/composables';
import { CHANNEL_TYPES } from 'dashboard/helper/inbox';
import { DIALOG_CHANNELS } from '../inbox-setup/constants';
import InboxSetup from '../InboxSetup.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', () => ({ useRouter: () => ({ push: env.push }) }));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: name => computed(() => env.state[name]),
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
}));
vi.mock('dashboard/composables', () => ({
  useAlert: vi.fn(),
  useTrack: vi.fn(),
}));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({
    accountId: ref(3),
    currentAccount: env.account,
    finishOnboarding: (...args) => env.finish(...args),
    isMetaInboxCreationDisabled: env.metaDisabled,
  }),
}));
vi.mock('dashboard/composables/useConfig', () => ({
  useConfig: () => ({ isEnterprise: env.isEnterprise }),
}));
vi.mock('../inbox-setup/useChannelConnect', () => ({
  useChannelConnect: () => ({
    connectViaOAuth: env.oauth,
    connectWhatsapp: env.whatsapp,
  }),
}));
vi.mock('../inbox-setup/useDetectedChannels', () => ({
  useDetectedChannels: () => ({
    displayedChannels: env.channels,
    remainingChannels: ref([{ type: 'more' }]),
    connectedInbox: channel => channel.inbox || null,
    hasDetectedChannels: env.detected,
  }),
}));

const Layout = {
  name: 'OnboardingLayout',
  props: ['isLoading'],
  emits: ['continue', 'skip'],
  template: '<div><slot name="greeting-icon" /><slot /></div>',
};
const ChannelRow = {
  name: 'ChannelRow',
  props: ['channel', 'connectedInbox'],
  emits: ['connect'],
  template: '<div class="row" />',
};
const Footer = {
  name: 'InboxChannelsFooter',
  props: ['remainingChannels'],
  emits: ['viewAll'],
  template: '<div class="footer" />',
};
const Dialog = {
  name: 'InboxChannelsDialog',
  props: ['inboxes'],
  emits: ['connected'],
  methods: { open: type => env.opened.push(type) },
  template: '<div class="dialog" />',
};

const mountSetup = async () => {
  const wrapper = mount(InboxSetup, {
    global: {
      stubs: {
        OnboardingLayout: Layout,
        OnboardingSection: { template: '<section><slot /></section>' },
        ChannelRow,
        InboxChannelsFooter: Footer,
        InboxChannelsDialog: Dialog,
        WebWidgetCreationStatus: { template: '<div class="widget-status" />' },
        HelpCenterCreationStatus: { template: '<div class="help-status" />' },
        Banner: { template: '<div class="banner"><slot /></div>' },
        Icon: true,
      },
    },
  });
  await flushPromises();
  return wrapper;
};
const layout = wrapper => wrapper.findComponent(Layout);

describe('Onboarding inbox setup behaviour', () => {
  beforeEach(() => {
    env.push = vi.fn();
    env.dispatch = vi.fn();
    env.finish = vi.fn();
    env.oauth = vi.fn();
    env.whatsapp = vi.fn();
    env.opened = [];
    env.isEnterprise = false;
    env.metaDisabled = ref(false);
    env.detected = ref(false);
    env.account = ref({ custom_attributes: {} });
    env.channels = ref([]);
    env.state = { 'inboxes/getInboxes': [{ id: 1 }] };
  });

  it('tracks the visit and shows what was created', async () => {
    const wrapper = await mountSetup();
    expect(useTrack).toHaveBeenCalledTimes(1);
    expect(wrapper.find('.widget-status').exists()).toBe(true);
    expect(wrapper.find('.help-status').exists()).toBe(false);
    expect(wrapper.find('.banner').exists()).toBe(false);
    expect(wrapper.findComponent(Dialog).props('inboxes')).toEqual([{ id: 1 }]);
  });

  it('shows the help center status for enterprise accounts generating one', async () => {
    env.isEnterprise = true;
    env.account = ref({
      custom_attributes: { help_center_generation_id: 'g1' },
    });
    expect((await mountSetup()).find('.help-status').exists()).toBe(true);
    env.account = ref(null);
    expect((await mountSetup()).find('.help-status').exists()).toBe(false);
  });

  it('warns about Meta restrictions and lists detected channels', async () => {
    env.metaDisabled.value = true;
    env.detected.value = true;
    env.channels.value = [{ type: 'a' }, { type: 'b', inbox: { id: 9 } }];
    const wrapper = await mountSetup();
    expect(wrapper.find('.banner a').attributes('target')).toBe('_blank');
    expect(wrapper.text()).toContain('ONBOARDING_INBOX_SETUP.CHANNELS.HEADER');
    const rows = wrapper.findAllComponents(ChannelRow);
    expect(rows.map(r => r.props('connectedInbox'))).toEqual([null, { id: 9 }]);
  });

  it('finishes or skips onboarding', async () => {
    const wrapper = await mountSetup();
    await layout(wrapper).vm.$emit('continue');
    await flushPromises();
    expect(env.finish).toHaveBeenCalledWith({ onboarding_step: 'inbox_setup' });
    expect(env.dispatch).toHaveBeenCalledWith('setUser');
    expect(env.push).toHaveBeenCalledWith({
      name: 'home',
      params: { accountId: 3 },
    });
    await layout(wrapper).vm.$emit('skip');
    await flushPromises();
    expect(useTrack).toHaveBeenCalledTimes(3);
    expect(useTrack.mock.calls[1][0]).not.toBe(useTrack.mock.calls[2][0]);
  });

  it('ignores double submits and alerts on failure', async () => {
    let fail;
    env.finish.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          fail = reject;
        })
    );
    const wrapper = await mountSetup();
    await layout(wrapper).vm.$emit('continue');
    expect(layout(wrapper).props('isLoading')).toBe(true);
    await layout(wrapper).vm.$emit('skip');
    expect(env.finish).toHaveBeenCalledTimes(1);
    fail(new Error('x'));
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('ONBOARDING_INBOX_SETUP.ERROR');
    expect(layout(wrapper).props('isLoading')).toBe(false);
    expect(env.push).not.toHaveBeenCalled();
  });

  it('connects channels the right way', async () => {
    env.channels.value = [{ type: 'x' }];
    const wrapper = await mountSetup();
    const row = wrapper.findComponent(ChannelRow);
    await row.vm.$emit('connect', { type: CHANNEL_TYPES.WHATSAPP });
    expect(env.whatsapp).toHaveBeenCalled();
    await row.vm.$emit('connect', { type: DIALOG_CHANNELS[0] });
    expect(env.opened).toEqual([DIALOG_CHANNELS[0]]);
    await row.vm.$emit('connect', { type: 'Channel::Instagram' });
    expect(env.oauth).toHaveBeenLastCalledWith('Channel::Instagram');
    await row.vm.$emit('connect', {
      type: 'Channel::Email',
      inbox: { provider: 'google' },
    });
    expect(env.oauth).toHaveBeenLastCalledWith('google');
  });

  it('opens the channel list and refetches inboxes after connecting', async () => {
    const wrapper = await mountSetup();
    await wrapper.findComponent(Footer).vm.$emit('viewAll');
    expect(env.opened).toEqual([undefined]);
    await wrapper.findComponent(Dialog).vm.$emit('connected');
    expect(env.dispatch).toHaveBeenCalledWith('inboxes/get');
  });
});
