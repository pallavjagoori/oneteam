/**
 * OneTeam behaviour spec for the select menu.
 *
 * Covers toggling the menu, marking the selected option, selecting an
 * option, submenu positions, and closing on outside clicks.
 */
import { mount } from '@vue/test-utils';
import SelectMenu from '../SelectMenu.vue';

const env = vi.hoisted(() => ({ clickaway: null }));

/**
 * Mounts the menu.
 *
 * @param {string} subMenuPosition submenu position
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountMenu = subMenuPosition =>
  mount(SelectMenu, {
    props: {
      options: [
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta' },
      ],
      modelValue: 'a',
      label: 'Sort',
      subMenuPosition,
    },
    global: {
      directives: {
        onClickaway: {
          mounted: (el, binding) => {
            env.clickaway = binding.value;
          },
        },
      },
      stubs: {
        Button: {
          props: ['label', 'icon'],
          emits: ['click'],
          template:
            '<button :data-icon="icon" @click="$emit(\'click\')">{{ label }}</button>',
        },
      },
    },
  });

describe('SelectMenu behaviour', () => {
  it('toggles, marks and selects options', async () => {
    const wrapper = mountMenu();
    const toggle = wrapper.find('button');
    expect(toggle.text()).toBe('Sort');
    await toggle.trigger('click');
    const options = wrapper.findAll('.absolute button');
    expect(options.map(option => option.attributes('data-icon'))).toEqual([
      'i-lucide-check',
      '',
    ]);
    expect(wrapper.find('.absolute').classes()).toContain('ltr:left-full');
    await options[1].trigger('click');
    expect(wrapper.emitted('update:modelValue')).toEqual([['b']]);
    expect(wrapper.find('.absolute').exists()).toBe(false);
    await toggle.trigger('click');
    await toggle.trigger('click');
    expect(wrapper.find('.absolute').exists()).toBe(false);
  });

  it.each([
    ['left', 'ltr:right-full'],
    ['bottom', 'top-full'],
  ])('positions the %s submenu and closes outside', async (position, cls) => {
    const wrapper = mountMenu(position);
    await wrapper.find('button').trigger('click');
    expect(wrapper.find('.absolute').classes()).toContain(cls);
    env.clickaway();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.absolute').exists()).toBe(false);
  });
});
