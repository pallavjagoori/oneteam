/**
 * Covers the Google OAuth button's SSO state, which wraps the redirect URL.
 */
import { mount } from '@vue/test-utils';
import GoogleOauthButton from '../Button.vue';

describe('GoogleOauthButton', () => {
  it('encodes the SSO account and redirect URL as JSON state', () => {
    window.chatwootConfig = {
      googleOAuthClientId: 'client',
      googleOAuthCallbackUrl: 'https://app.example.test/cb',
    };
    const wrapper = mount(GoogleOauthButton, {
      props: { redirectUrl: '/next', ssoAccountId: '7' },
      global: { mocks: { $t: key => key } },
    });
    const url = new URL(wrapper.find('a').attributes('href'));
    expect(JSON.parse(url.searchParams.get('state'))).toEqual({
      redirect_url: '/next',
      sso_account_id: '7',
    });
  });
});
