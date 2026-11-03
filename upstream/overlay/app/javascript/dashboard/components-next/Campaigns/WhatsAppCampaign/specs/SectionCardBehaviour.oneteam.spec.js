/**
 * OneTeam behaviour spec for the WhatsApp campaign form section card.
 *
 * Covers collapsing and expanding the section, discard and save, and
 * disabling them when clean, saving or blocked.
 */
import { mount } from '@vue/test-utils';
import SectionCard from '../SectionCard.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const Button = {
  name: 'NextButton',
  props: { label: String, disabled: Boolean, isLoading: Boolean },
  emits: ['click'],
  template: '<button class="action" />',
};

/**
 * Mounts the card with stubbed buttons and body content.
 *
 * @param {object} props Card props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountCard = (props = {}) =>
  mount(SectionCard, {
    props: { title: 'Audience', ...props },
    slots: { default: '<p class="body">Fields</p>' },
    global: { stubs: { Button } },
  });

const buttons = wrapper => wrapper.findAllComponents(Button);

describe('SectionCard behaviour', () => {
  it('collapses and expands the section', async () => {
    const wrapper = mountCard();
    expect(wrapper.text()).toContain('Audience');
    expect(wrapper.find('.body').exists()).toBe(true);
    expect(wrapper.get('span').classes()).toContain('rotate-180');
    await wrapper.get('button[type="button"]').trigger('click');
    expect(wrapper.find('.body').exists()).toBe(false);
    expect(buttons(wrapper)).toHaveLength(0);
  });

  it('discards and saves when dirty', () => {
    const wrapper = mountCard({ isDirty: true });
    const [discard, save] = buttons(wrapper);
    expect(discard.props('disabled')).toBe(false);
    expect(save.props('disabled')).toBe(false);
    discard.vm.$emit('click');
    save.vm.$emit('click');
    expect(wrapper.emitted('discard')).toHaveLength(1);
    expect(wrapper.emitted('save')).toHaveLength(1);
  });

  it('disables the actions when clean, saving or blocked', () => {
    const [discard, save] = buttons(mountCard());
    expect(discard.props('disabled')).toBe(true);
    expect(save.props('disabled')).toBe(true);
    const saving = buttons(mountCard({ isDirty: true, isSaving: true }))[1];
    expect(saving.props()).toMatchObject({ disabled: true, isLoading: true });
    const blocked = buttons(
      mountCard({ isDirty: true, isSaveDisabled: true })
    )[1];
    expect(blocked.props('disabled')).toBe(true);
  });
});
