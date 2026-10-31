/**
 * OneTeam behaviour spec for text, link and number custom attributes.
 *
 * Covers the sidebar view (click to edit) and the editing view (link,
 * edit and delete buttons), the input type per attribute type, saving a
 * value with Enter or the check button, cancelling on outside clicks,
 * and the error messages for required, number, URL and regex checks
 * (custom cue, fallback and invalid patterns).
 */
import { flushPromises, mount } from '@vue/test-utils';
import OtherAttribute from '../OtherAttribute.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const Input = {
  name: 'Input',
  props: ['modelValue', 'type', 'message', 'messageType'],
  emits: ['update:modelValue', 'enter'],
  template: '<input class="field" />',
};
const Button = {
  name: 'Button',
  props: ['icon', 'color'],
  emits: ['click'],
  template: '<button :data-icon="icon" @click="$emit(\'click\', $event)" />',
};

const mountAttribute = (attribute, isEditingView = false) =>
  mount(OtherAttribute, {
    props: { attribute, isEditingView },
    global: {
      stubs: { Input, Button },
      directives: {
        onClickaway: {
          mounted: (el, binding) => {
            env.clickaway = binding.value;
          },
        },
      },
    },
  });
const button = (wrapper, icon) => wrapper.find(`[data-icon="${icon}"]`);
const input = wrapper => wrapper.findComponent(Input);
const type = async (wrapper, value) => {
  input(wrapper).vm.$emit('update:modelValue', value);
  input(wrapper).vm.$emit('enter');
  await flushPromises();
};

describe('OtherAttribute behaviour', () => {
  it('shows a placeholder and edits on click in the sidebar', async () => {
    const wrapper = mountAttribute({ attributeDisplayType: 'text' });
    const label = wrapper.find('span');
    expect(label.text()).toBe(
      'CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.TRIGGER.INPUT'
    );
    expect(wrapper.classes()).toContain('justify-end');
    await label.trigger('click');
    expect(input(wrapper).props('type')).toBe('text');
    expect(input(wrapper).props('modelValue')).toBe('');
  });

  it('saves a valid value with Enter and leaves editing', async () => {
    const wrapper = mountAttribute({
      attributeDisplayType: 'text',
      value: 'gold',
    });
    await wrapper.find('span').trigger('click');
    await type(wrapper, 'silver');
    expect(wrapper.emitted('update')).toEqual([['silver']]);
    expect(input(wrapper).exists()).toBe(false);
  });

  it('requires a value, with a number-specific message', async () => {
    const wrapper = mountAttribute({ attributeDisplayType: 'text' });
    await wrapper.find('span').trigger('click');
    await type(wrapper, '');
    expect(input(wrapper).props()).toMatchObject({
      message: 'CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.VALIDATIONS.REQUIRED',
      messageType: 'error',
    });
    expect(button(wrapper, 'i-lucide-check').exists()).toBe(true);
    expect(wrapper.emitted('update')).toBeUndefined();

    const number = mountAttribute({ attributeDisplayType: 'number' });
    await number.find('span').trigger('click');
    expect(input(number).props('type')).toBe('number');
    expect(input(number).props('messageType')).toBe('info');
    await type(number, '');
    expect(input(number).props('message')).toBe(
      'CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.VALIDATIONS.INVALID_NUMBER'
    );
  });

  it('validates links and saves with the check button', async () => {
    const wrapper = mountAttribute({ attributeDisplayType: 'link' });
    await wrapper.find('span').trigger('click');
    expect(input(wrapper).props('type')).toBe('url');
    await type(wrapper, 'not a url');
    expect(input(wrapper).props('message')).toBe(
      'CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.VALIDATIONS.INVALID_URL'
    );
    await type(wrapper, '');
    expect(input(wrapper).props('message')).toBe(
      'CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.VALIDATIONS.REQUIRED'
    );
    input(wrapper).vm.$emit('update:modelValue', 'https://example.com');
    await button(wrapper, 'i-lucide-check').trigger('click');
    await flushPromises();
    expect(wrapper.emitted('update')).toEqual([['https://example.com']]);
  });

  it('checks text against the regex with its cue or a fallback', async () => {
    const cued = mountAttribute({
      attributeDisplayType: 'text',
      regexPattern: '/^[0-9]+$/',
      regexCue: 'Digits only',
    });
    await cued.find('span').trigger('click');
    await type(cued, 'abc');
    expect(input(cued).props('message')).toBe('Digits only');
    await type(cued, '');
    expect(input(cued).props('message')).toBe(
      'CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.VALIDATIONS.REQUIRED'
    );
    await type(cued, '42');
    expect(cued.emitted('update')).toEqual([['42']]);

    const broken = mountAttribute({
      attributeDisplayType: 'text',
      regexPattern: '/[/',
    });
    await broken.find('span').trigger('click');
    await type(broken, 'x');
    expect(input(broken).props('message')).toBe(
      'CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.VALIDATIONS.INVALID_INPUT'
    );
  });

  it('cancels editing on outside clicks', async () => {
    const wrapper = mountAttribute({
      attributeDisplayType: 'text',
      value: 'a',
    });
    await wrapper.find('span').trigger('click');
    env.clickaway();
    await flushPromises();
    expect(input(wrapper).exists()).toBe(false);
    expect(wrapper.find('span').text()).toBe('a');
  });

  it('shows a link with edit and delete buttons in the editing view', async () => {
    const wrapper = mountAttribute(
      { attributeDisplayType: 'link', value: 'https://example.com' },
      true
    );
    expect(wrapper.classes()).toContain('justify-start');
    const link = wrapper.find('a');
    expect(link.attributes('href')).toBe('https://example.com');
    expect(wrapper.find('span').classes()).toContain('text-n-blue-11');
    await wrapper.find('span').trigger('click');
    expect(input(wrapper).exists()).toBe(false);
    await button(wrapper, 'i-lucide-trash').trigger('click');
    expect(wrapper.emitted('delete')).toHaveLength(1);
    await button(wrapper, 'i-lucide-pencil').trigger('click');
    expect(input(wrapper).props('modelValue')).toBe('https://example.com');
  });

  it('shows plain text values in the editing view', () => {
    const wrapper = mountAttribute(
      { attributeDisplayType: 'text', value: 'gold' },
      true
    );
    expect(wrapper.find('a').exists()).toBe(false);
    expect(wrapper.find('span').classes()).toContain('text-n-slate-12');
  });
});
