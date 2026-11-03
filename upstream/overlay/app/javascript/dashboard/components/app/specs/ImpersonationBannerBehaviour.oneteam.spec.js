/**
 * OneTeam behaviour spec for the impersonation banner.
 *
 * Covers hiding it for normal sessions and, while impersonating, naming
 * the user and logging out from the stop action.
 */
import { computed } from 'vue';
import { mount } from '@vue/test-utils';
import ImpersonationBanner from '../ImpersonationBanner.vue';

const env = vi.hoisted(() => ({ impersonating: false, logout: vi.fn() }));

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: (key, args) => `${key}${JSON.stringify(args ?? '')}` }),
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => computed(() => ({ name: 'Ann', email: 'a@x.io' })),
}));
vi.mock('dashboard/composables/useImpersonation', () => ({
  useImpersonation: () => ({
    isImpersonating: computed(() => env.impersonating),
  }),
}));
vi.mock('dashboard/api/auth', () => ({
  default: { logout: (...args) => env.logout(...args) },
}));

const Banner = {
  name: 'Banner',
  props: ['color', 'actionLabel'],
  emits: ['action'],
  template: '<div class="banner"><slot /></div>',
};

/**
 * Mounts the banner.
 *
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountBanner = () =>
  mount(ImpersonationBanner, { global: { stubs: { Banner } } });

describe('ImpersonationBanner behaviour', () => {
  it('stays hidden outside impersonation', () => {
    env.impersonating = false;
    expect(mountBanner().find('.banner').exists()).toBe(false);
  });

  it('names the user and stops impersonating', () => {
    env.impersonating = true;
    env.logout.mockClear();
    const wrapper = mountBanner();
    const banner = wrapper.getComponent(Banner);
    expect(banner.props()).toEqual({
      color: 'ruby',
      actionLabel: 'APP_GLOBAL.IMPERSONATION.STOP""',
    });
    expect(wrapper.text()).toContain(
      'APP_GLOBAL.IMPERSONATION.MESSAGE{"name":"Ann","email":"a@x.io"}'
    );
    banner.vm.$emit('action');
    expect(env.logout).toHaveBeenCalledTimes(1);
  });
});
