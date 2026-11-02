/**
 * OneTeam behaviour spec for a Captain guardrail or guideline rule card.
 *
 * Covers showing the rule, hover events, the selection checkbox (shown
 * only when selectable), editing inline and saving with Enter (showing
 * the new text straight away), following content changes from the
 * parent, and deleting.
 */
import { mount } from '@vue/test-utils';
import RuleCard from '../RuleCard.vue';

const Checkbox = {
  name: 'Checkbox',
  props: { modelValue: Boolean },
  emits: ['update:modelValue'],
  template: '<input type="checkbox" class="check" />',
};
const InlineInput = {
  name: 'InlineInput',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<input class="inline" :value="modelValue" />',
};
const Button = {
  name: 'Button',
  props: ['icon'],
  emits: ['click'],
  template: '<button :data-icon="icon" @click="$emit(\'click\')" />',
};

const mountCard = props =>
  mount(RuleCard, {
    props: { id: 3, content: 'Never share prices', ...props },
    global: { stubs: { Checkbox, InlineInput, Button, CardLayout: false } },
  });

const text = wrapper => wrapper.find('span.text-sm').text();

describe('RuleCard behaviour', () => {
  it('shows the rule and reports hover and selection', async () => {
    const wrapper = mountCard({ selectable: true, isSelected: true });
    expect(text(wrapper)).toBe('Never share prices');
    expect(wrapper.find('.check').element.parentElement.style.display).toBe('');
    expect(wrapper.findComponent(Checkbox).props('modelValue')).toBe(true);
    await wrapper.findComponent(Checkbox).vm.$emit('update:modelValue', false);
    expect(wrapper.emitted('select')).toEqual([[3]]);

    await wrapper.trigger('mouseenter');
    await wrapper.trigger('mouseleave');
    expect(wrapper.emitted('hover')).toEqual([[true], [false]]);
  });

  it('hides the checkbox when not selectable', () => {
    const wrapper = mountCard();
    expect(wrapper.find('.check').element.parentElement.style.display).toBe(
      'none'
    );
  });

  it('edits inline and saves with Enter', async () => {
    const wrapper = mountCard();
    await wrapper.find('[data-icon="i-lucide-pen"]').trigger('click');
    const input = wrapper.findComponent(InlineInput);
    expect(input.props('modelValue')).toBe('Never share prices');
    await input.vm.$emit('update:modelValue', 'Never share discounts');
    await input.trigger('keyup', { key: 'Enter' });
    expect(wrapper.emitted('edit')).toEqual([
      [{ id: 3, content: 'Never share discounts' }],
    ]);
    expect(wrapper.findComponent(InlineInput).exists()).toBe(false);
    expect(text(wrapper)).toBe('Never share discounts');

    await wrapper.setProps({ content: 'Updated by parent' });
    expect(text(wrapper)).toBe('Updated by parent');
  });

  it('deletes the rule', async () => {
    const wrapper = mountCard();
    await wrapper.find('[data-icon="i-lucide-trash"]').trigger('click');
    expect(wrapper.emitted('delete')).toEqual([[3]]);
  });
});
