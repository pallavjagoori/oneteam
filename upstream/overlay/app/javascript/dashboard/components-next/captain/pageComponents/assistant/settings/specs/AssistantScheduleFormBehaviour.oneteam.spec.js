/**
 * OneTeam behaviour spec for the Captain assistant schedule form.
 *
 * Covers loading the saved response window (or the always default),
 * picking another window and submitting it with the existing config.
 */
import { mount } from '@vue/test-utils';
import AssistantScheduleForm from '../AssistantScheduleForm.vue';

const RadioCard = {
  name: 'RadioCard',
  props: ['id', 'isActive'],
  emits: ['select'],
  template: '<div class="card" :data-id="id" :data-active="isActive" />',
};
const Button = {
  name: 'NextButton',
  emits: ['click'],
  template: '<button class="submit" @click="$emit(\'click\')" />',
};

/**
 * Mounts the form for an assistant.
 *
 * @param {object} assistant - The assistant prop.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountForm = assistant =>
  mount(AssistantScheduleForm, {
    props: { assistant },
    global: { stubs: { RadioCard, Button } },
  });

const active = wrapper =>
  wrapper.find('.card[data-active="true"]').attributes('data-id');

describe('AssistantScheduleForm behaviour', () => {
  it('submits the picked window with the existing config', async () => {
    const wrapper = mountForm({
      config: { tone: 'friendly', response_window: 'business_hours' },
    });
    expect(active(wrapper)).toBe('business_hours');
    wrapper
      .findAllComponents(RadioCard)[2]
      .vm.$emit('select', 'outside_business_hours');
    await wrapper.vm.$nextTick();
    expect(active(wrapper)).toBe('outside_business_hours');
    await wrapper.find('.submit').trigger('click');
    expect(wrapper.emitted('submit')).toEqual([
      [
        {
          config: {
            tone: 'friendly',
            response_window: 'outside_business_hours',
          },
        },
      ],
    ]);
  });

  it('defaults to always without a saved window', () => {
    expect(active(mountForm({}))).toBe('always');
    expect(active(mountForm(null))).toBe('always');
  });
});
