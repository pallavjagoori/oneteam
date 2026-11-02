/**
 * OneTeam behaviour spec for a channel tile on the "add inbox" screen.
 *
 * Covers when each channel is active (feature flags, Facebook /
 * Instagram / TikTok app ids, always-on channels, nothing before
 * features load), the coming-soon, beta and voice badges, clicking an
 * active tile, ignoring disabled tiles, and opening the support widget
 * to request TikTok access on Chatwoot Cloud.
 */
import { mount } from '@vue/test-utils';
import ChannelItem from '../ChannelItem.vue';

const env = vi.hoisted(() => ({ cloud: false }));

vi.mock('dashboard/composables/useAccount', async () => {
  const { computed } = await import('vue');
  return {
    useAccount: () => ({ isOnChatwootCloud: computed(() => env.cloud) }),
  };
});

const ChannelSelector = {
  name: 'ChannelSelector',
  props: {
    title: String,
    isComingSoon: Boolean,
    isBeta: Boolean,
    hasVoiceBadge: Boolean,
    disabled: Boolean,
  },
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ title }}</button>',
};

const mountItem = (key, enabledFeatures = { any: true }) =>
  mount(ChannelItem, {
    props: { channel: { key, title: key }, enabledFeatures },
    global: { stubs: { ChannelSelector } },
  });
const selector = wrapper => wrapper.findComponent(ChannelSelector);
const isActive = (key, features) =>
  !selector(mountItem(key, features)).props('disabled');

describe('Channel item behaviour', () => {
  beforeEach(() => {
    env.cloud = false;
    window.chatwootConfig = {};
    window.$chatwoot = undefined;
  });

  it('decides which channels are active', () => {
    expect(isActive('website', {})).toBe(false);
    expect(isActive('website', { channel_website: true })).toBe(true);
    expect(isActive('email', { channel_email: false })).toBe(false);
    expect(isActive('facebook', { channel_facebook: true })).toBe(false);
    expect(isActive('instagram', { channel_instagram: true })).toBe(false);
    expect(isActive('tiktok', { channel_tiktok: true })).toBe(false);
    window.chatwootConfig = {
      fbAppId: '1',
      instagramAppId: '2',
      tiktokAppId: '3',
    };
    expect(isActive('facebook', { channel_facebook: true })).toBe(true);
    expect(isActive('instagram', { channel_instagram: true })).toBe(true);
    expect(isActive('tiktok', { channel_tiktok: true })).toBe(true);
    expect(isActive('whatsapp_call', { channel_voice: true })).toBe(true);
    expect(isActive('api')).toBe(true);
    expect(isActive('carrier_pigeon')).toBe(false);
  });

  it('shows coming-soon, beta and voice badges', () => {
    const voice = selector(mountItem('voice'));
    expect(voice.props()).toMatchObject({
      isComingSoon: true,
      isBeta: true,
      hasVoiceBadge: false,
    });
    const enabledVoice = selector(mountItem('voice', { channel_voice: true }));
    expect(enabledVoice.props()).toMatchObject({
      isComingSoon: false,
      hasVoiceBadge: true,
    });
    expect(selector(mountItem('api')).props('isBeta')).toBe(false);
  });

  it('emits clicks only for active tiles', async () => {
    const active = mountItem('api');
    await active.find('button').trigger('click');
    expect(active.emitted('channelItemClick')).toEqual([['api']]);
    const inactive = mountItem('email', { channel_email: false });
    await inactive.find('button').trigger('click');
    expect(inactive.emitted('channelItemClick')).toBeUndefined();
  });

  it('opens the support widget to request TikTok access on cloud', async () => {
    env.cloud = true;
    window.chatwootConfig = { tiktokAppId: '3' };
    const toggle = vi.fn();
    const wrapper = mountItem('tiktok', { channel_tiktok: false });
    expect(selector(wrapper).props('disabled')).toBe(false);
    await wrapper.find('button').trigger('click');
    window.$chatwoot = { toggle };
    await wrapper.find('button').trigger('click');
    expect(toggle).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted('channelItemClick')).toBeUndefined();
  });
});
