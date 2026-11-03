/**
 * OneTeam behaviour spec for a conversation workflow attribute row.
 *
 * Covers the type icon (with a fallback), the type label and badges, the
 * key and description, and the edit and delete actions.
 */
import { mount } from '@vue/test-utils';
import AttributeListItem from '../AttributeListItem.vue';

const Icon = { name: 'Icon', props: ['icon'], template: '<i />' };
const Label = { name: 'Label', props: ['label'], template: '<span />' };
const AttributeBadge = {
  name: 'AttributeBadge',
  props: ['type'],
  template: '<b />',
};
const Button = {
  name: 'NextButton',
  props: ['icon'],
  emits: ['click'],
  template: '<button :data-icon="icon" @click="$emit(\'click\')" />',
};

/**
 * Mounts the row.
 *
 * @param {object} props Row props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountRow = props =>
  mount(AttributeListItem, {
    props,
    global: { stubs: { Icon, Label, AttributeBadge, Button } },
  });

describe('AttributeListItem behaviour', () => {
  it('shows the attribute and emits edit and delete', async () => {
    const attribute = {
      label: 'Plan',
      type: 'List',
      value: 'plan',
      attribute_description: 'Customer plan',
    };
    const wrapper = mountRow({
      attribute,
      badges: [{ type: 'resolution' }, { type: 'pre-chat' }],
    });
    expect(wrapper.findAllComponents(Icon)[0].props('icon')).toBe(
      'i-lucide-list'
    );
    expect(wrapper.getComponent(Label).props('label')).toBe('List');
    expect(
      wrapper.findAllComponents(AttributeBadge).map(b => b.props('type'))
    ).toEqual(['resolution', 'pre-chat']);
    expect(wrapper.text()).toContain('Customer plan');
    await wrapper.get('[data-icon="i-woot-edit-pen"]').trigger('click');
    await wrapper.get('[data-icon="i-woot-bin"]').trigger('click');
    expect(wrapper.emitted('edit')).toEqual([[attribute]]);
    expect(wrapper.emitted('delete')).toEqual([[attribute]]);
  });

  it('falls back for unknown types and plain descriptions', async () => {
    const wrapper = mountRow({
      attribute: { label: 'X', type: 'currency', description: 'Plain' },
    });
    expect(wrapper.findAllComponents(Icon)[0].props('icon')).toBe(
      'i-lucide-menu'
    );
    expect(wrapper.text()).toContain('Plain');
    await wrapper.setProps({ attribute: { label: 'Y' } });
    expect(wrapper.findAllComponents(Icon)[0].props('icon')).toBe(
      'i-lucide-menu'
    );
    expect(wrapper.find('.w-px').exists()).toBe(false);
    expect(AttributeListItem.props.badges.default()).toEqual([]);
  });
});
