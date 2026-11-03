/**
 * OneTeam behaviour spec for the two-factor authentication status card.
 *
 * Covers the enable prompt, the enabled status, and showing nothing
 * while setup is in progress.
 */
import { mount } from '@vue/test-utils';
import MfaStatusCard from '../MfaStatusCard.vue';

const Button = {
  name: 'Button',
  props: ['label'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};

/**
 * Mounts the card.
 *
 * @param {object} props Card props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountCard = props =>
  mount(MfaStatusCard, {
    props,
    global: { stubs: { Button, Icon: true }, mocks: { $t: key => key } },
  });

describe('MfaStatusCard behaviour', () => {
  it('prompts to enable two-factor authentication', async () => {
    const wrapper = mountCard({ mfaEnabled: false });
    expect(wrapper.text()).toContain('MFA_SETTINGS.ENHANCE_SECURITY');
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('enableMfa')).toHaveLength(1);
  });

  it('shows the enabled status', () => {
    const wrapper = mountCard({ mfaEnabled: true });
    expect(wrapper.text()).toContain('MFA_SETTINGS.STATUS_ENABLED');
    expect(wrapper.find('button').exists()).toBe(false);
  });

  it('shows nothing during setup', () => {
    expect(mountCard({ mfaEnabled: false, showSetup: true }).text()).toBe('');
    expect(mountCard({ mfaEnabled: true, showSetup: true }).text()).toBe('');
  });
});
