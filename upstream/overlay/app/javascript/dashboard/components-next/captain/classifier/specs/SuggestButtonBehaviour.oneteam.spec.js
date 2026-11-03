/**
 * OneTeam behaviour spec for the Captain suggest button and its
 * loading skeleton.
 *
 * Covers the idle, active and loading styles, the tooltip, emitting
 * click, and rendering the skeleton.
 */
import { mount } from '@vue/test-utils';
import SuggestButton from '../SuggestButton.vue';
import SuggestionSkeleton from '../SuggestionSkeleton.vue';

const NextButton = {
  name: 'NextButton',
  props: ['variant'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')" />',
};

/**
 * Mounts the button, capturing the tooltip.
 *
 * @param {object} props Button props.
 * @returns {{ wrapper: import('@vue/test-utils').VueWrapper, tip: { value?: string } }}
 *   The wrapper and the tooltip value.
 */
const mountButton = props => {
  const tip = {};
  const wrapper = mount(SuggestButton, {
    props,
    global: {
      stubs: { NextButton },
      directives: {
        tooltip: (el, binding) => {
          tip.value = binding.value;
        },
      },
      mocks: { $t: key => key },
    },
  });
  return { wrapper, tip };
};

describe('SuggestButton behaviour', () => {
  it('suggests and shows its states', async () => {
    const { wrapper, tip } = mountButton();
    const button = wrapper.getComponent(NextButton);
    expect(button.props('variant')).toBe('ghost');
    expect(tip.value).toBe('CONVERSATION.SUGGESTIONS.SUGGEST');
    await button.trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);
    await wrapper.setProps({ isActive: true, isLoading: true });
    expect(button.props('variant')).toBe('faded');
    expect(button.classes()).toEqual(
      expect.arrayContaining(['!bg-n-iris-3', 'animate-twinkle'])
    );
  });

  it('renders the suggestion skeleton', () => {
    expect(mount(SuggestionSkeleton).classes()).toContain('bg-n-iris-2');
  });
});
