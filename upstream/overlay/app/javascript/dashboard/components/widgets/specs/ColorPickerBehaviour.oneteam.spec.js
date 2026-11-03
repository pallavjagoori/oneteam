/**
 * OneTeam behaviour spec for the legacy widgets ColorPicker.
 *
 * Covers toggling the picker, emitting the chosen hex and closing on
 * click away only when open.
 */
import { mount } from '@vue/test-utils';
import ColorPicker from '../ColorPicker.vue';

const clickaway = { handler: null };

const ChromeStub = {
  name: 'Chrome',
  emits: ['update:modelValue'],
  template: '<div class="chrome" />',
};

/**
 * Mounts the color picker.
 *
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountPicker = () =>
  mount(ColorPicker, {
    props: { modelValue: '#ff0000' },
    global: {
      stubs: { Chrome: ChromeStub },
      directives: {
        onClickaway: {
          mounted: (el, binding) => {
            clickaway.handler = binding.value;
          },
        },
      },
    },
  });

describe('widgets ColorPicker behaviour', () => {
  it('opens, emits the hex and closes on click away', async () => {
    const wrapper = mountPicker();
    expect(
      wrapper.find('.colorpicker--selected').attributes('style')
    ).toContain('background-color');
    await wrapper.find('.colorpicker--selected').trigger('click');
    wrapper
      .findComponent(ChromeStub)
      .vm.$emit('update:modelValue', { hex: '#00ff00' });
    expect(wrapper.emitted('update:modelValue')).toEqual([['#00ff00']]);
    clickaway.handler();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.chrome').exists()).toBe(false);
  });

  it('ignores click away while closed', () => {
    const wrapper = mountPicker();
    wrapper.vm.closeTogglePicker();
    expect(wrapper.vm.isPickerOpen).toBe(false);
  });
});
