/**
 * OneTeam behaviour spec for the survey feedback box.
 *
 * Covers sending typed feedback once a rating is picked, blocking it
 * without a rating or text, and the updating spinner.
 */
import { mount } from '@vue/test-utils';
import Feedback from '../Feedback.vue';

const CustomButton = {
  name: 'CustomButton',
  props: ['disabled'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')"><slot /></button>',
};
const TextArea = {
  name: 'TextArea',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<textarea />',
};

/**
 * Mounts the feedback box.
 *
 * @param {object} props - Component props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountFeedback = props =>
  mount(Feedback, {
    props,
    global: {
      stubs: {
        CustomButton,
        TextArea,
        Spinner: { template: '<i class="spin" />' },
      },
      mocks: { $t: key => key },
    },
  });

describe('Feedback behaviour', () => {
  it('sends the typed feedback when a rating is picked', async () => {
    const wrapper = mountFeedback({ selectedRating: 4, isUpdating: true });
    expect(wrapper.find('.spin').exists()).toBe(true);
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('sendFeedback')).toBeUndefined();
    wrapper.getComponent(TextArea).vm.$emit('update:modelValue', 'Great help');
    await wrapper.vm.$nextTick();
    expect(wrapper.getComponent(CustomButton).props('disabled')).toBe(false);
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('sendFeedback')).toEqual([['Great help']]);
  });

  it('stays disabled without a rating', async () => {
    const wrapper = mountFeedback({});
    wrapper.getComponent(TextArea).vm.$emit('update:modelValue', 'Hi');
    await wrapper.vm.$nextTick();
    expect(wrapper.getComponent(CustomButton).props('disabled')).toBe(true);
    expect(wrapper.find('.spin').exists()).toBe(false);
  });
});
