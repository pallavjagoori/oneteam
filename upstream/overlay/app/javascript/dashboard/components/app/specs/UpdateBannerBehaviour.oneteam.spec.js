/**
 * OneTeam behaviour spec for the "new Chatwoot version" banner.
 *
 * Covers showing it to admins on installations that display the
 * manifest when a newer valid version exists, hiding it for agents,
 * older or invalid versions, hidden manifests and versions already
 * dismissed, and dismissing it (remembering the version, also when the
 * stored list is missing or not a list).
 */
import { mount } from '@vue/test-utils';
import { LocalStorage } from 'shared/helpers/localStorage';
import UpdateBanner from '../UpdateBanner.vue';

const env = vi.hoisted(() => ({ admin: true }));

vi.mock('dashboard/composables/useAdmin', async () => {
  const { computed } = await import('vue');
  return { useAdmin: () => ({ isAdmin: computed(() => env.admin) }) };
});

const Banner = {
  name: 'Banner',
  props: ['bannerMessage', 'hrefLink'],
  emits: ['close'],
  template: '<div class="banner" />',
};

const mountBanner = (latestChatwootVersion = '4.20.0', config = {}) =>
  mount(UpdateBanner, {
    props: { latestChatwootVersion },
    global: {
      mocks: {
        $store: {
          getters: {
            'globalConfig/get': {
              appVersion: '4.19.1',
              displayManifest: true,
              ...config,
            },
          },
        },
      },
      stubs: { Banner },
    },
  });

describe('UpdateBanner behaviour', () => {
  beforeEach(() => {
    env.admin = true;
    localStorage.clear();
  });

  it('shows a newer version to admins and remembers dismissal', async () => {
    const wrapper = mountBanner();
    const banner = wrapper.findComponent(Banner);
    expect(banner.props()).toEqual({
      bannerMessage: 'GENERAL_SETTINGS.UPDATE_CHATWOOT',
      hrefLink: 'https://github.com/chatwoot/chatwoot/releases',
    });
    await banner.vm.$emit('close');
    expect(wrapper.findComponent(Banner).exists()).toBe(false);
    expect(LocalStorage.get('dismissedUpdates')).toEqual(['4.20.0']);
    expect(mountBanner().findComponent(Banner).exists()).toBe(false);

    const next = mountBanner('4.21.0');
    await next.findComponent(Banner).vm.$emit('close');
    expect(LocalStorage.get('dismissedUpdates')).toEqual(['4.20.0', '4.21.0']);
  });

  it('replaces a stored value that is not a list', async () => {
    LocalStorage.set('dismissedUpdates', 'oops');
    const wrapper = mountBanner();
    await wrapper.findComponent(Banner).vm.$emit('close');
    expect(LocalStorage.get('dismissedUpdates')).toEqual(['4.20.0']);
  });

  it.each([
    [
      'for agents',
      () => {
        env.admin = false;
      },
      '4.20.0',
      {},
    ],
    ['for an older version', () => {}, '4.19.0', {}],
    ['for an invalid version', () => {}, 'latest', {}],
    [
      'when the manifest is hidden',
      () => {},
      '4.20.0',
      { displayManifest: false },
    ],
  ])('stays hidden %s', (label, setup, version, config) => {
    setup();
    expect(mountBanner(version, config).findComponent(Banner).exists()).toBe(
      false
    );
  });
});
