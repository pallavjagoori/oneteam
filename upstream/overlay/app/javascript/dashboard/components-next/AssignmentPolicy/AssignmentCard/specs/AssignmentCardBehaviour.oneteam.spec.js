/**
 * OneTeam behaviour spec for an assignment policy option card.
 *
 * Covers the title, description and feature list, and clicking the card
 * or its chevron (which does not bubble to the card).
 */
import { mount } from '@vue/test-utils';
import AssignmentCard from '../AssignmentCard.vue';

const CardLayout = {
  name: 'CardLayout',
  emits: ['click'],
  template: '<div class="card" @click="$emit(\'click\')"><slot /></div>',
};
const Button = {
  name: 'NextButton',
  emits: ['click'],
  template: '<button @click="$emit(\'click\', $event)" />',
};
const Icon = { name: 'Icon', props: ['icon'], template: '<i />' };

describe('AssignmentCard behaviour', () => {
  it('lists features and emits one click per press', async () => {
    const wrapper = mount(AssignmentCard, {
      props: {
        title: 'Round robin',
        description: 'Share evenly',
        features: [
          { id: 1, icon: 'i-lucide-users', label: 'Fair' },
          { id: 2, icon: 'i-lucide-zap', label: 'Fast' },
        ],
      },
      global: { stubs: { CardLayout, Button, Icon } },
    });
    expect(wrapper.get('h3').text()).toBe('Round robin');
    expect(wrapper.get('p').text()).toBe('Share evenly');
    expect(wrapper.findAll('li').map(li => li.text())).toEqual([
      'Fair',
      'Fast',
    ]);
    expect(wrapper.findAllComponents(Icon).map(i => i.props('icon'))).toEqual([
      'i-lucide-users',
      'i-lucide-zap',
    ]);
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);
    await wrapper.get('.card').trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(2);
  });

  it('defaults to no features', () => {
    expect(AssignmentCard.props.features.default()).toEqual([]);
  });
});
