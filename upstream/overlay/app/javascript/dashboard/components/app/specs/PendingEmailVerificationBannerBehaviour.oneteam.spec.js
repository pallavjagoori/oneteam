/**
 * OneTeam behaviour spec for the "verify your email" banner.
 *
 * Covers showing it only to unconfirmed users and resending the
 * confirmation email with a toast.
 */
import { mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import PendingEmailVerificationBanner from '../PendingEmailVerificationBanner.vue';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const Banner = {
  name: 'Banner',
  props: ['bannerMessage', 'actionButtonLabel'],
  emits: ['primaryAction'],
  template: '<div class="banner" />',
};

/**
 * Mounts the banner for a user with the given confirmation state.
 *
 * @param {boolean} confirmed Whether the user's email is confirmed.
 * @param {Function} dispatch Store dispatch spy.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountBanner = (confirmed, dispatch = vi.fn()) =>
  mount(PendingEmailVerificationBanner, {
    global: {
      stubs: { Banner },
      mocks: {
        $t: key => key,
        $store: { getters: { getCurrentUser: { confirmed } }, dispatch },
      },
    },
  });

describe('PendingEmailVerificationBanner behaviour', () => {
  it('hides the banner for confirmed users', () => {
    expect(mountBanner(true).findComponent(Banner).exists()).toBe(false);
  });

  it('resends the confirmation email for unconfirmed users', () => {
    const dispatch = vi.fn();
    const banner = mountBanner(false, dispatch).getComponent(Banner);
    expect(banner.props()).toEqual({
      bannerMessage: 'APP_GLOBAL.EMAIL_VERIFICATION_PENDING',
      actionButtonLabel: 'APP_GLOBAL.RESEND_VERIFICATION_MAIL',
    });
    banner.vm.$emit('primaryAction');
    expect(dispatch).toHaveBeenCalledWith('resendConfirmation');
    expect(useAlert).toHaveBeenCalledWith('APP_GLOBAL.EMAIL_VERIFICATION_SENT');
  });
});
