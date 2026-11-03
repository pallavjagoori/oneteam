/**
 * OneTeam behaviour spec for the automation run type picker.
 *
 * Covers marking the instant or delayed card and switching between them.
 */
import { mount } from '@vue/test-utils';
import AutomationRunTypeSelector from '../AutomationRunTypeSelector.vue';

const RadioCard = {
  name: 'RadioCard',
  props: { id: String, isActive: Boolean },
  emits: ['select'],
  template: '<div />',
};

describe('AutomationRunTypeSelector behaviour', () => {
  it('switches between instant and delayed runs', async () => {
    const wrapper = mount(AutomationRunTypeSelector, {
      props: { modelValue: false, 'onUpdate:modelValue': () => {} },
      global: { stubs: { RadioCard }, mocks: { $t: key => key } },
    });
    const [instant, wait] = wrapper.findAllComponents(RadioCard);
    expect(instant.props('isActive')).toBe(true);
    expect(wait.props('isActive')).toBe(false);
    wait.vm.$emit('select', 'automation_run_after_wait');
    instant.vm.$emit('select', 'automation_run_instantly');
    expect(wrapper.emitted('update:modelValue')).toEqual([[true], [false]]);
  });
});
