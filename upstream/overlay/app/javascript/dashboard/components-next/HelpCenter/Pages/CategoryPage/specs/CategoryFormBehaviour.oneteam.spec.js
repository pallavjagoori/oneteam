/**
 * OneTeam behaviour spec for the help center category form.
 *
 * Covers the portal and locale header, creating a category (locale from
 * the active locale, slug derived from the name, slug help text from the
 * route, validation messages and the disabled submit), editing an
 * existing category (prefill, locked slug, update spinner), the emoji or
 * icon picker (open, select, colour, remove, close on outside click),
 * cancelling, and hiding the action buttons.
 */
import { computed, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import CategoryForm from '../CategoryForm.vue';

const env = vi.hoisted(() => ({ creating: null, flags: {} }));

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => env.creating,
  useStoreGetters: () => ({
    'categories/uiFlags': computed(() => id => env.flags[id]),
  }),
}));
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { portalSlug: 'docs', locale: 'en' } }),
}));
vi.mock('dashboard/helper/commons.js', () => ({
  convertToCategorySlug: name => name.toLowerCase().replace(/\s+/g, '-'),
}));
vi.mock(
  'dashboard/components-next/emoji-icon-picker/EmojiIconPicker.vue',
  () => ({
    __esModule: true,
    default: {
      name: 'EmojiIconPicker',
      props: ['value', 'color'],
      emits: ['select', 'colorChange', 'remove'],
      template: '<div class="picker" />',
    },
  })
);
vi.mock('@vueuse/components', () => ({
  OnClickOutside: {
    name: 'OnClickOutside',
    emits: ['trigger'],
    template: '<div class="outside"><slot /></div>',
  },
}));

const Input = {
  name: 'Input',
  props: ['modelValue', 'label', 'message', 'messageType', 'disabled'],
  emits: ['update:modelValue'],
  template:
    '<div class="input" :data-label="label"><slot name="prefix" /><input :value="modelValue" :disabled="disabled" :data-message="message" :data-type="messageType" @input="$emit(\'update:modelValue\', $event.target.value)" /></div>',
};
const TextArea = {
  name: 'TextArea',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template:
    '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
};
const Button = {
  name: 'NextButton',
  props: ['label', 'disabled', 'isLoading'],
  emits: ['click'],
  template:
    '<button :data-label="label" :disabled="disabled" :data-loading="isLoading" @click="$emit(\'click\')"><slot /></button>',
};
const EmojiIcon = {
  name: 'EmojiIcon',
  props: ['value', 'color'],
  template: '<span class="emoji" :data-color="color">{{ value }}</span>',
};

const key = k => `HELP_CENTER.CATEGORY_PAGE.CATEGORY_DIALOG.${k}`;
const mountForm = props =>
  mount(CategoryForm, {
    props: {
      portalName: 'Docs',
      activeLocaleName: 'English',
      activeLocaleCode: 'en',
      ...props,
    },
    global: {
      stubs: { Input, TextArea, NextButton: Button, Button, EmojiIcon },
    },
  });
const field = (wrapper, k) => wrapper.find(`[data-label="${key(k)}"] input`);
const action = (wrapper, k) =>
  wrapper.find(`[data-label="${key(`BUTTONS.${k}`)}"]`);
const clickAction = (wrapper, k) =>
  wrapper
    .findAllComponents(Button)
    .find(b => b.props('label') === key(`BUTTONS.${k}`))
    .vm.$emit('click');
const iconButton = wrapper => wrapper.find('.outside button');

describe('Category form behaviour', () => {
  beforeEach(() => {
    env.creating = ref(false);
    env.flags = {};
  });

  it('creates a category with a derived slug', async () => {
    const wrapper = mountForm({ mode: 'create' });
    expect(wrapper.text()).toContain('Docs');
    expect(wrapper.text()).toContain('English (en)');
    expect(wrapper.vm.state.locale).toBe('en');
    expect(action(wrapper, 'CREATE').attributes('disabled')).toBeDefined();
    expect(field(wrapper, 'FORM.SLUG.LABEL').attributes('data-message')).toBe(
      key('FORM.SLUG.HELP_TEXT')
    );

    clickAction(wrapper, 'CREATE');
    await flushPromises();
    expect(wrapper.emitted('submit')).toBeUndefined();
    expect(field(wrapper, 'FORM.NAME.LABEL').attributes('data-message')).toBe(
      key('FORM.NAME.ERROR')
    );
    expect(field(wrapper, 'FORM.NAME.LABEL').attributes('data-type')).toBe(
      'error'
    );
    expect(field(wrapper, 'FORM.SLUG.LABEL').attributes('data-message')).toBe(
      key('FORM.SLUG.ERROR')
    );

    await field(wrapper, 'FORM.NAME.LABEL').setValue('Getting Started');
    await wrapper.find('textarea').setValue('Basics');
    await flushPromises();
    expect(field(wrapper, 'FORM.SLUG.LABEL').element.value).toBe(
      'getting-started'
    );
    expect(field(wrapper, 'FORM.NAME.LABEL').attributes('data-type')).toBe(
      'info'
    );
    await action(wrapper, 'CREATE').trigger('click');
    await flushPromises();
    expect(wrapper.emitted('submit')[0][0]).toMatchObject({
      name: 'Getting Started',
      slug: 'getting-started',
      description: 'Basics',
      locale: 'en',
    });

    env.creating.value = true;
    await flushPromises();
    expect(action(wrapper, 'CREATE').attributes('data-loading')).toBe('true');
    await action(wrapper, 'CANCEL').trigger('click');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });

  it('edits a category without changing its slug', async () => {
    env.flags = { 9: { isUpdating: true } };
    const wrapper = mountForm({
      mode: 'edit',
      selectedCategory: {
        id: 9,
        name: 'Billing',
        slug: 'billing',
        icon: 'i-lucide-credit-card',
        icon_color: '#123',
        description: 'Money',
      },
    });
    await flushPromises();
    expect(wrapper.vm.state.locale).toBe('');
    expect(
      field(wrapper, 'FORM.SLUG.LABEL').attributes('disabled')
    ).toBeDefined();
    expect(wrapper.find('.emoji').attributes('data-color')).toBe('#123');
    expect(action(wrapper, 'EDIT').attributes('data-loading')).toBe('true');
    await field(wrapper, 'FORM.NAME.LABEL').setValue('Payments');
    expect(field(wrapper, 'FORM.SLUG.LABEL').element.value).toBe('billing');

    await wrapper.setProps({
      selectedCategory: { id: 10, name: 'Plans', slug: 'plans' },
    });
    expect(wrapper.vm.state.iconColor).toBe('');
    expect(action(wrapper, 'EDIT').attributes('data-loading')).toBeUndefined();
    await wrapper.setProps({ selectedCategory: null });
    expect(wrapper.vm.state.name).toBe('Plans');
    expect(action(wrapper, 'EDIT').attributes('data-loading')).toBe('false');
  });

  it('picks, recolours and removes an icon', async () => {
    const wrapper = mountForm({ mode: 'create' });
    expect(wrapper.find('.i-lucide-smile-plus').exists()).toBe(true);
    await iconButton(wrapper).trigger('click');
    await flushPromises();
    const picker = () => wrapper.findComponent({ name: 'EmojiIconPicker' });
    picker().vm.$emit('select', {
      type: 'icon',
      value: 'i-lucide-star',
      color: '#f00',
    });
    await flushPromises();
    expect(picker().exists()).toBe(false);
    expect(wrapper.find('.emoji').attributes('data-color')).toBe('#f00');

    await iconButton(wrapper).trigger('click');
    await flushPromises();
    picker().vm.$emit('colorChange', '#0f0');
    await flushPromises();
    expect(wrapper.find('.emoji').attributes('data-color')).toBe('#0f0');
    picker().vm.$emit('select', { type: 'emoji', value: '📦', color: '#00f' });
    await flushPromises();
    expect(wrapper.find('.emoji').attributes('data-color')).toBe('');

    await iconButton(wrapper).trigger('click');
    await flushPromises();
    picker().vm.$emit('remove');
    await flushPromises();
    expect(picker().exists()).toBe(false);
    expect(wrapper.find('.emoji').exists()).toBe(false);

    await iconButton(wrapper).trigger('click');
    await flushPromises();
    wrapper.findComponent({ name: 'OnClickOutside' }).vm.$emit('trigger');
    await flushPromises();
    expect(picker().exists()).toBe(false);
  });

  it('hides the action buttons when asked', () => {
    const wrapper = mountForm({ mode: 'create', showActionButtons: false });
    expect(action(wrapper, 'CREATE').exists()).toBe(false);
  });
});
