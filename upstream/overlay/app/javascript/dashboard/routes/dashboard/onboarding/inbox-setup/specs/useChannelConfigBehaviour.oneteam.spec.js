/**
 * OneTeam behaviour spec for the onboarding channel configuration check.
 *
 * Covers channels that need installation or global credentials (with
 * and without them), channels that need none, and TikTok availability
 * on cloud.
 */
import { computed } from 'vue';
import { useChannelConfig } from '../useChannelConfig';

const env = vi.hoisted(() => ({
  azure: '',
  cloud: false,
  metaDisabled: false,
  features: [],
}));

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => computed(() => ({ azureAppId: env.azure })),
}));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({
    isCloudFeatureEnabled: flag => env.features.includes(flag),
    isOnChatwootCloud: computed(() => env.cloud),
    isMetaInboxCreationDisabled: computed(() => env.metaDisabled),
  }),
}));

describe('useChannelConfig behaviour', () => {
  afterEach(() => {
    delete window.chatwootConfig;
    env.azure = '';
    env.cloud = false;
    env.features = [];
    env.metaDisabled = false;
  });

  it('treats credential channels as unconfigured without any config', () => {
    delete window.chatwootConfig;
    const { isConfigured, isEnabled } = useChannelConfig();
    expect(isConfigured('outlook')).toBe(false);
    expect(isConfigured('gmail')).toBe(false);
    expect(isConfigured('facebook')).toBe(false);
    expect(isConfigured('website')).toBe(true);
    expect(isEnabled('tiktok')).toBe(true);
    expect(isEnabled('website')).toBe(true);
  });

  it('configures channels from installation and global credentials', () => {
    window.chatwootConfig = {
      googleOAuthClientId: 'g',
      tiktokAppId: 't',
      fbAppId: 'f',
    };
    env.azure = 'a';
    const { isConfigured } = useChannelConfig();
    expect(isConfigured('outlook')).toBe(true);
    expect(isConfigured('gmail')).toBe(true);
    expect(isConfigured('tiktok')).toBe(true);
    expect(isConfigured('facebook')).toBe(true);
  });

  it('checks Meta channels against signup config and flags', () => {
    window.chatwootConfig = {
      whatsappAppId: 'w',
      whatsappConfigurationId: 'c',
      instagramAppId: 'i',
      fbAppId: 'f',
    };
    expect(useChannelConfig().isConfigured('whatsapp')).toBe(true);
    expect(useChannelConfig().isConfigured('instagram')).toBe(false);
    env.features = ['channel_instagram'];
    expect(useChannelConfig().isConfigured('instagram')).toBe(true);
    env.cloud = true;
    expect(useChannelConfig().isConfigured('whatsapp')).toBe(false);
    env.features = ['whatsapp_embedded_signup_inbox_creation'];
    expect(useChannelConfig().isConfigured('whatsapp')).toBe(true);
    window.chatwootConfig.whatsappAppId = 'none';
    expect(useChannelConfig().isConfigured('whatsapp')).toBe(false);
    window.chatwootConfig = {};
    expect(useChannelConfig().isConfigured('whatsapp')).toBe(false);
    env.metaDisabled = true;
    expect(useChannelConfig().isConfigured('whatsapp')).toBe(false);
    expect(useChannelConfig().isConfigured('facebook')).toBe(false);
    expect(useChannelConfig().isConfigured('instagram')).toBe(false);
  });

  it('enables TikTok on cloud only with its feature flag', () => {
    env.cloud = true;
    expect(useChannelConfig().isEnabled('tiktok')).toBe(false);
    env.features = ['channel_tiktok'];
    expect(useChannelConfig().isEnabled('tiktok')).toBe(true);
  });
});
