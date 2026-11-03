/**
 * OneTeam behaviour spec for the monitor MonitorIconPicker.
 *
 * Covers the empty icon fallback, opening the picker, choosing an icon or
 * emoji, changing colour and closing on outside click.
 */
import { mount, flushPromises } from '@vue/test-utils';
import MonitorIconPicker from '../MonitorIconPicker.vue';

const PickerStub = vi.hoisted(() => ({
  name: 'EmojiIconPicker',
  emits: ['select', 'colorChange'],
  template: '<div class="picker" />',
}));

vi.mock(
  'dashboard/components-next/emoji-icon-picker/EmojiIconPicker.vue',
  () => ({ __esModule: true, default: PickerStub })
);

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

/**
 * Mounts the picker with stubs.
 *
 * @param {object} props icon and color models
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountPicker = props =>
  mount(MonitorIconPicker, {
    props,
    global: {
      directives: { tooltip: {} },
      stubs: {
        OnClickOutside: {
          emits: ['trigger'],
          template:
            '<div><button class="outside" @click="$emit(\'trigger\')" /><slot /></div>',
        },
        Button: {
          emits: ['click'],
          template:
            '<button class="toggle" @click="$emit(\'click\')"><slot /></button>',
        },
        EmojiIcon: { template: '<span class="emoji-icon" />' },
        Icon: { template: '<i class="fallback" />' },
      },
    },
  });

/**
 * Opens the picker and waits for the async component.
 *
 * @param {import('@vue/test-utils').VueWrapper} wrapper mounted picker
 * @returns {Promise<object>} the picker stub wrapper
 */
const openPicker = async wrapper => {
  await wrapper.find('.toggle').trigger('click');
  await flushPromises();
  return wrapper.findComponent(PickerStub);
};

describe('MonitorIconPicker behaviour', () => {
  it('shows the fallback icon without a chosen icon', () => {
    const wrapper = mountPicker({ icon: '', color: '' });
    expect(wrapper.find('.fallback').exists()).toBe(true);
  });

  it('stores an icon with its colour and closes', async () => {
    const wrapper = mountPicker({ icon: 'i-lucide-bell', color: 'red' });
    expect(wrapper.find('.emoji-icon').exists()).toBe(true);
    const picker = await openPicker(wrapper);
    picker.vm.$emit('select', {
      type: 'icon',
      value: 'i-lucide-star',
      color: 'blue',
    });
    await flushPromises();
    expect(wrapper.emitted('update:icon')).toEqual([['i-lucide-star']]);
    expect(wrapper.emitted('update:color')).toEqual([['blue']]);
    expect(wrapper.findComponent(PickerStub).exists()).toBe(false);
  });

  it('clears the colour for an emoji', async () => {
    const wrapper = mountPicker({ icon: '', color: 'red' });
    const picker = await openPicker(wrapper);
    picker.vm.$emit('select', { type: 'emoji', value: '🙂' });
    expect(wrapper.emitted('update:color')).toEqual([['']]);
  });

  it('forwards colour changes and closes on outside click', async () => {
    const wrapper = mountPicker({ icon: '', color: '' });
    const picker = await openPicker(wrapper);
    picker.vm.$emit('colorChange', 'green');
    expect(wrapper.emitted('update:color')).toEqual([['green']]);
    await wrapper.find('.outside').trigger('click');
    expect(wrapper.findComponent(PickerStub).exists()).toBe(false);
  });
});
