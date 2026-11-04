/**
 * OneTeam behaviour spec for the onboarding OnboardingFormSelect.
 *
 * Covers the placeholder option, the empty and chosen text colours,
 * the error shake, and emitting the chosen value.
 */
import { mount } from '@vue/test-utils';
import OnboardingFormSelect from '../OnboardingFormSelect.vue';

const OPTIONS = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B' },
];

describe('OnboardingFormSelect behaviour', () => {
  it('shows the placeholder and error while empty', async () => {
    const wrapper = mount(OnboardingFormSelect, {
      props: { options: OPTIONS, placeholder: 'Pick', hasError: true },
      global: { stubs: { Icon: true } },
    });
    const select = wrapper.find('select');
    expect(select.classes()).toContain('text-n-slate-9');
    expect(select.classes()).toContain('animate-shake');
    expect(wrapper.findAll('option')).toHaveLength(3);
    await select.setValue('b');
    expect(wrapper.emitted('update:modelValue')).toEqual([['b']]);
  });

  it('renders a chosen value without a placeholder', () => {
    const wrapper = mount(OnboardingFormSelect, {
      props: { options: OPTIONS, modelValue: 'a' },
      global: { stubs: { Icon: true } },
    });
    expect(wrapper.find('select').classes()).toContain('text-n-slate-12');
    expect(wrapper.findAll('option')).toHaveLength(2);
  });
});
