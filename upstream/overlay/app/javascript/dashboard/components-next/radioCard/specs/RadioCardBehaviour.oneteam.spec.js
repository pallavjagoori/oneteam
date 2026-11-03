/**
 * OneTeam behaviour spec for RadioCard.
 *
 * Covers selecting an inactive card, ignoring active or disabled cards, the
 * disabled and beta labels, and the disabled message.
 */
import { mount } from '@vue/test-utils';
import RadioCard from '../RadioCard.vue';

const Label = {
  name: 'Label',
  props: { label: String, color: String },
  template: '<span class="label">{{ label }}</span>',
};

/**
 * Mounts a card with the required props plus overrides.
 *
 * @param {object} props - Prop overrides.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountCard = props =>
  mount(RadioCard, {
    props: { id: 'api', label: 'API', description: 'Use the API', ...props },
    global: { stubs: { Label } },
  });

describe('RadioCard behaviour', () => {
  it('emits select only for an enabled, inactive card', async () => {
    const wrapper = mountCard();
    expect(wrapper.find('input').attributes('name')).toBe('api');
    await wrapper.find('input').trigger('change');
    expect(wrapper.emitted('select')).toEqual([['api']]);

    await wrapper.setProps({ isActive: true });
    await wrapper.find('input').trigger('change');
    await wrapper.setProps({ isActive: false, disabled: true });
    wrapper.vm.$.setupState.handleChange?.();
    await wrapper.find('input').trigger('change');
    expect(wrapper.emitted('select')).toHaveLength(1);
  });

  it('shows the disabled label and message, and the beta label', () => {
    const wrapper = mountCard({
      name: 'channel',
      disabled: true,
      disabledLabel: 'Soon',
      disabledMessage: 'Not on your plan',
      beta: true,
    });
    const labels = wrapper.findAll('.label').map(l => l.text());
    expect(labels).toEqual(['Soon', 'GENERAL.BETA']);
    expect(wrapper.text()).toContain('Not on your plan');
    expect(wrapper.text()).not.toContain('Use the API');
    expect(wrapper.find('input').attributes('name')).toBe('channel');
  });

  it('shows the description when disabled without a message', () => {
    const wrapper = mountCard({ disabled: true });
    expect(wrapper.text()).toContain('Use the API');
  });
});
