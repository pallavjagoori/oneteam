/**
 * OneTeam behaviour spec for the emoji icon picker's colour palette and
 * the saved-value renderer.
 *
 * Covers picking a colour (with its ring, check mark and tooltip), and
 * rendering a tinted icon, an untinted icon or an emoji.
 */
import { mount } from '@vue/test-utils';
import ColorPalette from '../ColorPalette.vue';
import EmojiIcon from '../EmojiIcon.vue';
import { ICON_COLORS } from '../constants';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const Icon = { name: 'Icon', props: ['icon'], template: '<i />' };

describe('ColorPalette behaviour', () => {
  it('picks a colour', async () => {
    const tips = [];
    const wrapper = mount(ColorPalette, {
      props: {
        modelValue: ICON_COLORS[0].value,
        'onUpdate:modelValue': () => {},
      },
      global: {
        directives: {
          tooltip: (el, binding) => {
            tips.push(binding.value);
          },
        },
      },
    });
    const buttons = wrapper.findAll('button');
    expect(buttons).toHaveLength(ICON_COLORS.length);
    expect(tips[0]).toBe(`EMOJI_ICON_PICKER.COLORS.${ICON_COLORS[0].name}`);
    expect(buttons[0].classes()).toContain('ring-2');
    expect(buttons[0].find('.i-lucide-check').exists()).toBe(true);
    expect(buttons[1].find('.i-lucide-check').exists()).toBe(false);
    await buttons[1].trigger('click');
    expect(wrapper.emitted('update:modelValue')).toEqual([
      [ICON_COLORS[1].value],
    ]);
  });
});

describe('EmojiIcon behaviour', () => {
  /**
   * Mounts the renderer.
   *
   * @param {object} props Renderer props.
   * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
   */
  const mountIcon = props =>
    mount(EmojiIcon, {
      props,
      global: {
        stubs: { Icon },
        directives: {
          dompurifyHtml: (el, binding) => {
            el.textContent = binding.value;
          },
        },
      },
    });

  it('renders tinted and untinted icons', () => {
    const tinted = mountIcon({ value: 'rocket', color: '#EF4444' });
    const icon = tinted.getComponent(Icon);
    expect(icon.props('icon')).toMatch(/rocket$/);
    expect(icon.attributes('style')).toContain('color');
    expect(
      mountIcon({ value: 'rocket' }).getComponent(Icon).attributes('style')
    ).toBeUndefined();
  });

  it('renders an emoji', () => {
    const wrapper = mountIcon({ value: '🚀' });
    expect(wrapper.findComponent(Icon).exists()).toBe(false);
    expect(wrapper.text()).toBe('🚀');
  });
});
