/**
 * OneTeam behaviour spec for a social profile handle input.
 *
 * Covers the label, host prefix and network icon, the profile link for
 * a saved handle, custom links, trimming a pasted URL to a handle, and
 * the disabled state.
 */
import { mount } from '@vue/test-utils';
import SocialProfileInput from '../SocialProfileInput.vue';

const Icon = { name: 'Icon', props: ['icon'], template: '<i />' };

/**
 * Mounts the input.
 *
 * @param {object} props Input props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountInput = props =>
  mount(SocialProfileInput, {
    props: { network: 'github', 'onUpdate:modelValue': () => {}, ...props },
    global: { stubs: { Icon } },
  });

describe('SocialProfileInput behaviour', () => {
  it('links a saved handle and keeps pasted URLs as handles', async () => {
    const wrapper = mountInput({
      label: 'GitHub',
      placeholder: 'username',
      modelValue: 'octo',
    });
    expect(wrapper.text()).toContain('GitHub');
    expect(wrapper.text()).toContain('github.com/');
    expect(wrapper.get('a').attributes('href')).toBe('https://github.com/octo');
    expect(wrapper.getComponent(Icon).props('icon')).toBe('i-ri-github-fill');
    const input = wrapper.get('input');
    input.element.value = 'https://github.com/hubot';
    await input.trigger('input');
    expect(wrapper.emitted('update:modelValue')).toEqual([['hubot']]);
  });

  it('shows a plain icon without a handle and hides the prefix for custom links', () => {
    const empty = mountInput({ disabled: true });
    expect(empty.find('a').exists()).toBe(false);
    expect(empty.find('.opacity-50').exists()).toBe(true);
    expect(empty.get('input').element.disabled).toBe(true);
    expect(empty.find('.mb-0\\.5').exists()).toBe(false);
    const custom = mountInput({ modelValue: 'https://gitlab.com/octo' });
    expect(custom.text()).not.toContain('github.com/');
  });
});
