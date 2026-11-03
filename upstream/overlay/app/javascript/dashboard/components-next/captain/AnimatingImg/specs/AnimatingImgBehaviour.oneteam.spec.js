/**
 * OneTeam behaviour spec for the Captain animated illustrations.
 *
 * Covers pausing and resuming the animation by clicking, and rendering
 * the static settings illustration.
 */
import { mount } from '@vue/test-utils';
import Guardrails from '../Guardrails.vue';
import ResponseGuidelines from '../ResponseGuidelines.vue';
import Scenarios from '../Scenarios.vue';
import Settings from '../Settings.vue';

describe('Captain animated illustrations behaviour', () => {
  it('hides the guardrail frames while paused', async () => {
    const wrapper = mount(Guardrails);
    const button = wrapper.get('[role="button"]');
    expect(button.attributes('aria-pressed')).toBe('true');
    expect(wrapper.find('.paused-or-hidden').exists()).toBe(false);
    await button.trigger('click');
    expect(button.attributes('aria-pressed')).toBe('false');
    expect(wrapper.findAll('.paused-or-hidden').length).toBeGreaterThan(0);
  });

  it.each([
    ['ResponseGuidelines', ResponseGuidelines],
    ['Scenarios', Scenarios],
  ])('pauses and resumes %s', async (_name, component) => {
    const wrapper = mount(component);
    const button = wrapper.get('[aria-pressed]');
    expect(button.attributes('aria-pressed')).toBe('false');
    await button.trigger('click');
    expect(button.attributes('aria-pressed')).toBe('true');
    await button.trigger('click');
    expect(button.attributes('aria-pressed')).toBe('false');
  });

  it('renders the settings illustration', () => {
    expect(mount(Settings).find('svg').exists()).toBe(true);
  });
});
