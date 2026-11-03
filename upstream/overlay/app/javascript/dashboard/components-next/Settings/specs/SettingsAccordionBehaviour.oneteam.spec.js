/**
 * OneTeam behaviour spec for a collapsible settings section.
 *
 * Covers opening by default, starting closed, and toggling by clicking
 * the header.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import SettingsAccordion from '../SettingsAccordion.vue';

vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  useToggle: initial => {
    const state = ref(initial);
    return [
      state,
      () => {
        state.value = !state.value;
      },
    ];
  },
}));

/**
 * Mounts the section with body content.
 *
 * @param {object} props Section props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountAccordion = props =>
  mount(SettingsAccordion, {
    props: { title: 'Advanced', ...props },
    slots: { default: '<p class="body">Body</p>' },
  });

describe('SettingsAccordion behaviour', () => {
  it('opens by default and toggles from the header', async () => {
    const wrapper = mountAccordion();
    expect(wrapper.text()).toContain('Advanced');
    expect(wrapper.find('.body').exists()).toBe(true);
    await wrapper.get('.cursor-pointer').trigger('click');
    expect(wrapper.find('.body').exists()).toBe(false);
    await wrapper.get('.cursor-pointer').trigger('click');
    expect(wrapper.find('.body').exists()).toBe(true);
  });

  it('starts closed when asked', () => {
    expect(mountAccordion({ defaultOpen: false }).find('.body').exists()).toBe(
      false
    );
  });
});
