/**
 * OneTeam behaviour spec for the yes or no choice toggle.
 */
import { mount } from '@vue/test-utils';
import ChoiceToggle from '../ChoiceToggle.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

describe('ChoiceToggle behaviour', () => {
  it('marks the current choice and picks another', async () => {
    const wrapper = mount(ChoiceToggle, { props: { modelValue: true } });
    const [yes, no] = wrapper.findAll('input');
    expect(wrapper.text()).toContain('CHOICE_TOGGLE.YES');
    expect(yes.element.checked).toBe(true);
    expect(no.element.checked).toBe(false);
    await no.trigger('change');
    await yes.trigger('change');
    expect(wrapper.emitted('update:modelValue')).toEqual([[false], [true]]);
  });
});
