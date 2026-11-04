/**
 * OneTeam behaviour spec for the next colour picker.
 *
 * Covers toggling the Chrome picker, emitting the picked hex colour,
 * and closing on outside clicks only while open.
 */
import { mount } from '@vue/test-utils';
import ColorPicker from '../ColorPicker.vue';

vi.mock('@lk77/vue3-color', () => ({
  Chrome: {
    name: 'Chrome',
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<div class="chrome" />',
  },
}));
vi.mock('@vueuse/components', () => ({
  OnClickOutside: {
    name: 'OnClickOutside',
    emits: ['trigger'],
    template: '<div><slot /></div>',
  },
}));

/**
 * Mounts the picker.
 *
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountPicker = () =>
  mount(ColorPicker, {
    props: { modelValue: '#ff0000' },
    global: {
      stubs: {
        Button: {
          emits: ['click'],
          template: '<button @click="$emit(\'click\')"><slot /></button>',
        },
      },
    },
  });

describe('ColorPicker behaviour', () => {
  it('toggles the picker, emits colours and closes outside', async () => {
    const wrapper = mountPicker();
    const outside = wrapper.findComponent({ name: 'OnClickOutside' });
    expect(wrapper.text()).toContain('#ff0000');
    outside.vm.$emit('trigger');
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.chrome').exists()).toBe(false);
    await wrapper.find('button').trigger('click');
    const chrome = wrapper.findComponent({ name: 'Chrome' });
    expect(chrome.props('modelValue')).toBe('#ff0000');
    chrome.vm.$emit('update:modelValue', { hex: '#00ff00' });
    expect(wrapper.emitted('update:modelValue')).toEqual([['#00ff00']]);
    outside.vm.$emit('trigger');
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.chrome').exists()).toBe(false);
  });
});
