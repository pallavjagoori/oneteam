/**
 * OneTeam behaviour spec for a Captain feature model row.
 *
 * Covers the title and description, picking a model when allowed, and
 * the dimmed row without a picker otherwise.
 */
import { mount } from '@vue/test-utils';
import ModelSelector from '../ModelSelector.vue';

const ModelDropdown = {
  name: 'ModelDropdown',
  props: ['featureKey'],
  emits: ['change'],
  template: '<div />',
};

/**
 * Mounts the row.
 *
 * @param {boolean} isAllowed Whether the plan allows the feature.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountRow = isAllowed =>
  mount(ModelSelector, {
    props: {
      featureKey: 'reply',
      title: 'Replies',
      description: 'Model for replies',
      isAllowed,
    },
    global: { stubs: { ModelDropdown } },
  });

describe('ModelSelector behaviour', () => {
  it('relays model changes when allowed', () => {
    const wrapper = mountRow(true);
    expect(wrapper.get('h4').text()).toBe('Replies');
    expect(wrapper.text()).toContain('Model for replies');
    expect(wrapper.classes()).not.toContain('opacity-60');
    const dropdown = wrapper.getComponent(ModelDropdown);
    expect(dropdown.props('featureKey')).toBe('reply');
    dropdown.vm.$emit('change', { feature: 'reply', model: 'gpt', extra: 1 });
    expect(wrapper.emitted('change')).toEqual([
      [{ feature: 'reply', model: 'gpt' }],
    ]);
  });

  it('dims the row without a picker when not allowed', () => {
    const wrapper = mountRow(false);
    expect(wrapper.classes()).toContain('opacity-60');
    expect(wrapper.findComponent(ModelDropdown).exists()).toBe(false);
  });
});
