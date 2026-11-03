/**
 * OneTeam behaviour spec for the two-factor authentication card on the
 * profile page.
 */
import { mount } from '@vue/test-utils';
import MfaSettingsCard from '../MfaSettingsCard.vue';

const push = vi.hoisted(() => vi.fn());

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => ({ params: { accountId: 8 } }),
}));

const Button = {
  name: 'Button',
  props: ['label'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};

describe('MfaSettingsCard behaviour', () => {
  it('opens the two-factor settings for the account', async () => {
    const wrapper = mount(MfaSettingsCard, {
      global: { stubs: { Button, Icon: true }, mocks: { $t: key => key } },
    });
    expect(wrapper.get('h5').text()).toBe('MFA_SETTINGS.TITLE');
    await wrapper.get('button').trigger('click');
    expect(push).toHaveBeenCalledWith({
      name: 'profile_settings_mfa',
      params: { accountId: 8 },
    });
  });
});
