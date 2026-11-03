/**
 * OneTeam behaviour spec for a required attribute row.
 *
 * Covers the label, type icon (with a fallback), key, and deleting the
 * row without bubbling the click.
 */
import { mount } from '@vue/test-utils';
import ConversationRequiredAttributeItem from '../ConversationRequiredAttributeItem.vue';

const Icon = { name: 'Icon', props: ['icon'], template: '<i />' };
const Button = {
  name: 'Button',
  props: ['icon'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\', $event)" />',
};

/**
 * Mounts the row for an attribute.
 *
 * @param {object} attribute Attribute to show.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountItem = attribute =>
  mount(ConversationRequiredAttributeItem, {
    props: { attribute },
    global: { stubs: { Icon, Button } },
  });

describe('ConversationRequiredAttributeItem behaviour', () => {
  it('shows the attribute and deletes it', async () => {
    const attribute = { label: 'Plan', type: 'List', value: 'plan' };
    const wrapper = mountItem(attribute);
    expect(wrapper.get('h5').text()).toBe('Plan');
    expect(wrapper.text()).toContain('plan');
    expect(wrapper.findAllComponents(Icon)[0].props('icon')).toBe(
      'i-lucide-list'
    );
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('delete')).toEqual([[attribute]]);
  });

  it('falls back to the text icon for unknown or missing types', () => {
    expect(
      mountItem({ label: 'X', type: 'Rich' })
        .findAllComponents(Icon)[0]
        .props('icon')
    ).toBe('i-lucide-align-justify');
    expect(
      mountItem({ label: 'Y' }).findAllComponents(Icon)[0].props('icon')
    ).toBe('i-lucide-align-justify');
  });
});
