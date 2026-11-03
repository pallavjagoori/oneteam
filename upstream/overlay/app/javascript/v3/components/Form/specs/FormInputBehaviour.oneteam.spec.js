/**
 * OneTeam behaviour spec for the v3 (auth pages) form input.
 *
 * Covers two-way binding, error and compact styling, the label slot,
 * and showing or hiding a password with the eye toggle.
 */
import { mount } from '@vue/test-utils';
import FormInput from '../Input.vue';

vi.mock('@vueuse/core', async importOriginal => {
  const { ref } = await import('vue');
  return {
    ...(await importOriginal()),
    useToggle: () => {
      const state = ref(false);
      const toggle = () => {
        state.value = !state.value;
      };
      return [state, toggle];
    },
  };
});

const Button = {
  name: 'NextButton',
  props: ['icon'],
  emits: ['click'],
  template: '<button class="eye" @click="$emit(\'click\')" />',
};

/**
 * Mounts the input with a label, name and the given props.
 *
 * @param {object} props Extra props.
 * @param {object} slots Slots to render.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountInput = (props = {}, slots = {}) =>
  mount(FormInput, {
    props: { label: 'Email', name: 'email', modelValue: 'a', ...props },
    slots,
    global: { stubs: { Button } },
  });

describe('Form Input behaviour', () => {
  it('binds the model and renders the label slot', async () => {
    const wrapper = mountInput(
      { placeholder: 'you@x.test' },
      { default: '<a class="forgot">Forgot?</a>' }
    );
    const input = wrapper.get('input');
    expect(input.attributes('type')).toBe('text');
    expect(input.attributes('placeholder')).toBe('you@x.test');
    expect(wrapper.find('.forgot').exists()).toBe(true);
    await input.setValue('b');
    expect(wrapper.emitted('update:modelValue')).toEqual([['b']]);
    expect(wrapper.find('.eye').exists()).toBe(false);
  });

  it('applies error, compact and icon styling', () => {
    const input = mountInput({
      hasError: true,
      spacing: 'compact',
      icon: 'i-lucide-mail',
      errorMessage: 'Bad',
    }).get('input');
    expect(input.classes()).toEqual(
      expect.arrayContaining(['error', 'mb-0', 'pl-9'])
    );
    expect(FormInput.props.spacing.validator('wide')).toBe(false);
  });

  it('toggles password visibility', async () => {
    const wrapper = mountInput({ type: 'password' });
    const input = wrapper.get('input');
    expect(input.attributes('type')).toBe('password');
    expect(input.classes()).toContain('pr-10');
    expect(wrapper.getComponent(Button).props('icon')).toBe('i-lucide-eye');
    await wrapper.get('.eye').trigger('click');
    expect(input.attributes('type')).toBe('text');
    expect(wrapper.getComponent(Button).props('icon')).toBe('i-lucide-eye-off');
    expect(wrapper.get('.eye').attributes('aria-label')).toBe('Hide password');
  });
});
