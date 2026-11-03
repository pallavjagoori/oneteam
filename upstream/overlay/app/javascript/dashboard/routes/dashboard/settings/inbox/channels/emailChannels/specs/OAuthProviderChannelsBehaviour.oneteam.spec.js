/**
 * OneTeam behaviour spec for the Google and Microsoft email channel
 * screens, which configure the shared OAuth channel for each provider.
 */
import { mount } from '@vue/test-utils';
import Google from '../Google.vue';
import Microsoft from '../Microsoft.vue';

const OAuthChannel = {
  name: 'OAuthChannel',
  props: [
    'provider',
    'title',
    'description',
    'submitButtonText',
    'errorMessage',
  ],
  template: '<div />',
};

describe('OAuth provider channels behaviour', () => {
  it.each([
    [Google, 'google', 'GOOGLE'],
    [Microsoft, 'microsoft', 'MICROSOFT'],
  ])('configures the %#th provider', (component, provider, key) => {
    const wrapper = mount(component, {
      global: { stubs: { OAuthChannel }, mocks: { $t: k => k } },
    });
    expect(wrapper.getComponent(OAuthChannel).props()).toEqual({
      provider,
      title: `INBOX_MGMT.ADD.${key}.TITLE`,
      description: `INBOX_MGMT.ADD.${key}.DESCRIPTION`,
      submitButtonText: `INBOX_MGMT.ADD.${key}.SIGN_IN`,
      errorMessage: `INBOX_MGMT.ADD.${key}.ERROR_MESSAGE`,
    });
  });
});
