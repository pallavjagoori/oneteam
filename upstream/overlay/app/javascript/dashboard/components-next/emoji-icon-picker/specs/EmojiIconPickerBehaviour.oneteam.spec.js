/**
 * OneTeam behaviour spec for the combined emoji and icon picker.
 *
 * Covers the starting tab for each mode and saved value, switching tabs,
 * the remove button, searching and selecting icons in outline and filled
 * styles, the color change event for saved icons, the empty icon and
 * emoji states, and selecting, tinting and remembering emojis.
 */
import { mount } from '@vue/test-utils';
import EmojiIconPicker from '../EmojiIconPicker.vue';

const helper = vi.hoisted(() => ({
  sections: [],
  recent: [],
}));

vi.mock('shared/components/emoji/pickerHelper', () => ({
  buildEmojiSections: search => (search === 'none' ? [] : helper.sections),
  getEmojiTint: emoji => `tint-${emoji}`,
  getRecentEmojis: () => helper.recent,
  addRecentEmoji: emoji => [emoji],
}));
vi.mock('virtua/vue', () => ({
  Virtualizer: {
    props: ['data'],
    template:
      '<div><template v-for="item in data" :key="item.name"><slot :item="item" /></template></div>',
  },
}));

const Input = {
  name: 'Input',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<div class="input"><slot name="prefix" /></div>',
};
const ColorPalette = {
  name: 'ColorPalette',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<div class="palette" />',
};
const Button = {
  name: 'Button',
  emits: ['click'],
  template: '<button class="remove" @click="$emit(\'click\')" />',
};

const mountPicker = props =>
  mount(EmojiIconPicker, {
    props,
    global: {
      stubs: { Input, ColorPalette, Button },
      directives: { tooltip: {} },
    },
  });

const iconButton = (wrapper, name) => wrapper.find(`button[title="${name}"]`);

describe('EmojiIconPicker behaviour', () => {
  beforeEach(() => {
    helper.recent = [];
    helper.sections = [
      {
        name: 'Smileys',
        emojis: [{ slug: 'grin', name: 'grin', emoji: '😀' }],
      },
    ];
  });

  it('picks the starting tab from mode and saved value', () => {
    expect(mountPicker().find('.palette').exists()).toBe(true);
    expect(mountPicker({ value: '😀' }).find('.palette').exists()).toBe(false);
    expect(mountPicker({ value: 'home-line' }).find('.palette').exists()).toBe(
      true
    );

    const emojiOnly = mountPicker({ mode: 'emoji' });
    expect(emojiOnly.find('.palette').exists()).toBe(false);
    expect(emojiOnly.find('.pt-2').exists()).toBe(true);
    const iconOnly = mountPicker({ mode: 'icon' });
    expect(iconOnly.find('.palette').exists()).toBe(true);
    expect(iconOnly.find('.pt-2').exists()).toBe(true);
    expect(
      EmojiIconPicker.props.mode.validator('icon') &&
        !EmojiIconPicker.props.mode.validator('other')
    ).toBe(true);
  });

  it('switches tabs and removes the value', async () => {
    const wrapper = mountPicker({ value: 'home-line', showRemoveButton: true });
    const [icons, emojis] = wrapper.findAll('.rounded-md');
    await emojis.trigger('click');
    expect(wrapper.find('.palette').exists()).toBe(false);
    expect(emojis.classes()).toContain('bg-n-surface-1');
    await icons.trigger('click');
    expect(wrapper.find('.palette').exists()).toBe(true);

    await wrapper.find('.remove').trigger('click');
    expect(wrapper.emitted('remove')).toHaveLength(1);
    expect(
      mountPicker({ mode: 'icon', showRemoveButton: true, value: 'x-line' })
        .find('.rounded-md')
        .exists()
    ).toBe(false);
  });

  it('searches and selects icons in both styles', async () => {
    const wrapper = mountPicker({ color: '#EF4444' });
    await iconButton(wrapper, 'home').trigger('click');
    expect(wrapper.emitted('select')[0][0]).toEqual({
      type: 'icon',
      value: 'home-line',
      icon: 'home-line',
      color: '#EF4444',
    });

    const toggle = wrapper.find('.size-9');
    await toggle.trigger('click');
    expect(toggle.find('span').classes()).toContain('i-ri-contrast-2-fill');
    await iconButton(wrapper, 'star').trigger('click');
    expect(wrapper.emitted('select')[1][0].value).toBe('star-fill');
    await toggle.trigger('click');
    expect(toggle.find('span').classes()).toContain('i-ri-contrast-2-line');

    const search = wrapper.findComponent(Input);
    await search.trigger('keydown.enter');
    await search.vm.$emit('update:modelValue', ' HOUSE ');
    expect(iconButton(wrapper, 'home').exists()).toBe(true);
    expect(iconButton(wrapper, 'star').exists()).toBe(false);
    await search.vm.$emit('update:modelValue', 'zzzz');
    expect(wrapper.text()).toContain('EMOJI_ICON_PICKER.NO_ICON');

    const filled = mountPicker({ value: 'home-fill' });
    expect(filled.find('.size-9 span').classes()).toContain(
      'i-ri-contrast-2-fill'
    );
  });

  it('emits color changes only for saved icons', async () => {
    const saved = mountPicker({ value: 'home-line' });
    await saved
      .findComponent(ColorPalette)
      .vm.$emit('update:modelValue', '#000');
    expect(saved.emitted('colorChange')).toEqual([['#000']]);

    const blank = mountPicker();
    await blank
      .findComponent(ColorPalette)
      .vm.$emit('update:modelValue', '#111');
    expect(blank.emitted('colorChange')).toBeUndefined();
  });

  it('tints, selects and searches emojis', async () => {
    helper.recent = [{ emoji: '😀' }];
    const wrapper = mountPicker({ mode: 'emoji' });
    const grin = wrapper.find('button[title="grin"]');
    expect(wrapper.text()).toContain('Smileys');
    await grin.trigger('mouseenter');
    expect(grin.element.style.getPropertyValue('--ep-tint')).toBe('tint-😀');
    await grin.trigger('click');
    expect(wrapper.emitted('select')[0][0]).toEqual({
      type: 'emoji',
      value: '😀',
      emoji: '😀',
    });

    await wrapper.find('.input').trigger('keydown.enter');
    await wrapper.findComponent(Input).vm.$emit('update:modelValue', 'none');
    expect(wrapper.text()).toContain('EMOJI_ICON_PICKER.NO_EMOJI');
  });
});
