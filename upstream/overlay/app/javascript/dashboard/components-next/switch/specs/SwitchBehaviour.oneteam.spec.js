/**
 * OneTeam behaviour spec for the next-gen switch.
 *
 * Covers the on and off styling, toggling the model, and the disabled
 * state.
 */
import { mount } from '@vue/test-utils';
import Switch from '../Switch.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

describe('Switch behaviour', () => {
  it('toggles off to on', async () => {
    const wrapper = mount(Switch, {
      props: { 'onUpdate:modelValue': () => {} },
    });
    const button = wrapper.get('button');
    expect(button.attributes('aria-checked')).toBe('false');
    expect(button.classes()).toContain('bg-n-slate-6');
    expect(wrapper.text()).toBe('SWITCH.TOGGLE');
    await button.trigger('click');
    expect(wrapper.emitted('update:modelValue')).toEqual([[true]]);
    expect(wrapper.emitted('change')).toHaveLength(1);
  });

  it('shows the on state and can be disabled', () => {
    const button = mount(Switch, {
      props: { modelValue: true, disabled: true },
    }).get('button');
    expect(button.attributes('aria-checked')).toBe('true');
    expect(button.classes()).toContain('bg-n-brand');
    expect(button.attributes('disabled')).toBeDefined();
  });
});
