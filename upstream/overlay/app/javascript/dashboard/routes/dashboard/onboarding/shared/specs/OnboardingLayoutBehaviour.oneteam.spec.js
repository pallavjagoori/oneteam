/**
 * OneTeam behaviour spec for the onboarding OnboardingLayout.
 *
 * Covers the greeting and subtitle, the full width continue button,
 * and the optional skip button.
 */
import { mount } from '@vue/test-utils';
import OnboardingLayout from '../OnboardingLayout.vue';

/**
 * Mounts the layout.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountLayout = props =>
  mount(OnboardingLayout, {
    props: { greeting: 'Hi', ...props },
    global: {
      stubs: {
        NextButton: {
          emits: ['click'],
          template: '<button @click="$emit(\'click\')"><slot /></button>',
        },
      },
    },
  });

describe('OnboardingLayout behaviour', () => {
  it('shows a full width continue button without skip', async () => {
    const wrapper = mountLayout({});
    expect(wrapper.find('p').exists()).toBe(false);
    const buttons = wrapper.findAll('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0].classes()).toContain('w-full');
    await buttons[0].trigger('click');
    expect(wrapper.emitted('continue')).toHaveLength(1);
  });

  it('shows the subtitle and a skip button', async () => {
    const wrapper = mountLayout({ subtitle: 'Welcome', skipLabel: 'Skip' });
    expect(wrapper.text()).toContain('Welcome');
    const buttons = wrapper.findAll('button');
    expect(buttons[0].classes()).toContain('flex-1');
    await buttons[1].trigger('click');
    expect(wrapper.emitted('skip')).toHaveLength(1);
  });
});
