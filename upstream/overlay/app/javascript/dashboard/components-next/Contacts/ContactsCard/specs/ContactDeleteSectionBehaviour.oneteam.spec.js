/**
 * OneTeam behaviour spec for the contact delete section.
 *
 * Covers expanding and collapsing the warning and opening the confirm
 * dialog.
 */
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import ContactDeleteSection from '../ContactDeleteSection.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('@vueuse/core', async importOriginal => {
  const { ref: r } = await import('vue');
  return {
    ...(await importOriginal()),
    useToggle: () => {
      const state = r(false);
      const toggle = () => {
        state.value = !state.value;
      };
      return [state, toggle];
    },
  };
});

const Button = {
  name: 'NextButton',
  props: ['label'],
  emits: ['click'],
  template: '<button :data-label="label" @click="$emit(\'click\')" />',
};

const open = vi.fn();
const ConfirmContactDeleteDialog = {
  name: 'ConfirmContactDeleteDialog',
  props: ['selectedContact'],
  setup: () => ({ dialogRef: ref({ open }) }),
  template: '<div />',
};

/**
 * Mounts the section with stubbed buttons and dialog.
 *
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountSection = () =>
  mount(ContactDeleteSection, {
    props: { selectedContact: { id: 4 } },
    global: {
      stubs: {
        Button,
        ConfirmContactDeleteDialog,
        Policy: { template: '<div><slot /></div>' },
      },
    },
  });

const section = wrapper => wrapper.get('div.transition-all');

describe('ContactDeleteSection behaviour', () => {
  beforeEach(() => {
    open.mockClear();
  });

  it('expands and collapses the warning', async () => {
    const wrapper = mountSection();
    expect(section(wrapper).classes()).toContain('opacity-0');
    await wrapper.get('[data-label$="DELETE_CONTACT"]').trigger('click');
    expect(section(wrapper).classes()).toContain('opacity-100');
    await wrapper.get('[data-label$="DELETE_CONTACT"]').trigger('click');
    expect(section(wrapper).classes()).toContain('opacity-0');
  });

  it('opens the confirm dialog', async () => {
    const wrapper = mountSection();
    expect(
      wrapper.getComponent(ConfirmContactDeleteDialog).props('selectedContact')
    ).toEqual({ id: 4 });
    await wrapper.get('[data-label$="DELETE_CONTACT.BUTTON"]').trigger('click');
    expect(open).toHaveBeenCalled();
  });
});
