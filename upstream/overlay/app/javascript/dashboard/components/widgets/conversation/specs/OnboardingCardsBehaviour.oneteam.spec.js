/**
 * OneTeam behaviour spec for the conversation onboarding feature card
 * and the missing-signature alert.
 *
 * Covers the feature card image, text and optional link, and opening
 * profile settings from the signature alert.
 */
import { mount } from '@vue/test-utils';
import OnboardingFeatureCard from '../OnboardingFeatureCard.vue';
import MessageSignatureMissingAlert from '../MessageSignatureMissingAlert.vue';

const push = vi.hoisted(() => vi.fn());

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => ({ push }),
}));

const RouterLink = {
  name: 'RouterLink',
  props: ['to'],
  template: '<a><slot /></a>',
};

describe('OnboardingFeatureCard behaviour', () => {
  it('shows the feature with an optional link', async () => {
    const wrapper = mount(OnboardingFeatureCard, {
      props: {
        imageSrc: '/i.png',
        imageAlt: 'Inbox',
        title: 'Inboxes',
        description: 'Connect channels',
        to: 'settings_inbox_list',
        linkText: 'Go',
      },
      global: { stubs: { RouterLink } },
    });
    expect(wrapper.get('img').attributes()).toMatchObject({
      src: '/i.png',
      alt: 'Inbox',
    });
    expect(wrapper.text()).toContain('Connect channels');
    expect(wrapper.getComponent(RouterLink).props('to')).toEqual({
      name: 'settings_inbox_list',
    });
    await wrapper.setProps({ to: '' });
    expect(wrapper.findComponent(RouterLink).exists()).toBe(false);
  });
});

describe('MessageSignatureMissingAlert behaviour', () => {
  it('opens profile settings', async () => {
    const wrapper = mount(MessageSignatureMissingAlert, {
      global: {
        stubs: {
          Button: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')" />',
          },
        },
        mocks: { $t: key => key },
      },
    });
    expect(wrapper.text()).toContain(
      'CONVERSATION.FOOTER.MESSAGE_SIGNATURE_NOT_CONFIGURED'
    );
    await wrapper.get('button').trigger('click');
    expect(push).toHaveBeenCalledWith({ name: 'profile_settings_index' });
  });
});
