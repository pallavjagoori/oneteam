/**
 * OneTeam behaviour spec for the article slug field.
 *
 * Covers the fixed timestamp prefix and editable suffix, normalising on
 * blur, resetting on escape, using the (draft) title, saving a changed
 * slug from the banner or Enter (not while updating or unchanged), and
 * the "updated" banner with a preview link after the slug changes.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import ArticleSlugField from '../ArticleSlugField.vue';

const updating = ref(false);

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => ref(() => ({ isUpdating: updating.value })),
}));

const InlineInput = {
  name: 'InlineInput',
  props: ['modelValue', 'disabled'],
  emits: ['update:modelValue', 'enterPress', 'escapePress', 'blur'],
  template: '<input />',
};
const Banner = {
  name: 'Banner',
  props: ['color'],
  emits: ['action'],
  template: '<p :class="color"><slot /></p>',
};

const mountField = article =>
  mount(ArticleSlugField, {
    props: {
      article: {
        id: 1,
        title: 'Hello World',
        slug: '1700000000-hi',
        ...article,
      },
    },
    global: {
      stubs: {
        InlineInput,
        Banner,
        Button: {
          name: 'Button',
          emits: ['click'],
          template: '<button @click="$emit(\'click\')" />',
        },
      },
      directives: { tooltip: {} },
    },
  });
const input = wrapper => wrapper.findComponent(InlineInput);
const type = async (wrapper, value) => {
  input(wrapper).vm.$emit('update:modelValue', value);
  await wrapper.vm.$nextTick();
};

describe('ArticleSlugField behaviour', () => {
  beforeEach(() => {
    updating.value = false;
  });

  it('edits, normalises, resets and saves the slug', async () => {
    const wrapper = mountField();
    expect(wrapper.find('span').text()).toBe('1700000000-');
    expect(input(wrapper).props('modelValue')).toBe('hi');
    expect(wrapper.findComponent(Banner).exists()).toBe(false);

    await type(wrapper, 'New Slug!');
    input(wrapper).vm.$emit('blur');
    await wrapper.vm.$nextTick();
    expect(input(wrapper).props('modelValue')).toBe('new-slug');
    expect(wrapper.find('.amber').exists()).toBe(true);
    wrapper.findComponent(Banner).vm.$emit('action');
    expect(wrapper.emitted('saveSlug')).toEqual([['1700000000-new-slug']]);

    input(wrapper).vm.$emit('escapePress');
    await wrapper.vm.$nextTick();
    expect(input(wrapper).props('modelValue')).toBe('hi');
    input(wrapper).vm.$emit('enterPress');
    expect(wrapper.emitted('saveSlug')).toHaveLength(1);

    await type(wrapper, '!!');
    input(wrapper).vm.$emit('blur');
    await wrapper.vm.$nextTick();
    expect(input(wrapper).props('modelValue')).toBe('hi');

    await wrapper.find('button').trigger('click');
    expect(input(wrapper).props('modelValue')).toBe('hello-world');
    expect(wrapper.find('button').exists()).toBe(false);
  });

  it('blocks saving while updating and shows the updated banner', async () => {
    updating.value = true;
    const wrapper = mountField({ slug: 'plain', draftTitle: 'Draft' });
    expect(wrapper.find('span').text()).toBe('');
    expect(input(wrapper).props('disabled')).toBe(true);
    await type(wrapper, 'other');
    input(wrapper).vm.$emit('enterPress');
    expect(wrapper.emitted('saveSlug')).toBeUndefined();
    await wrapper.findComponent({ name: 'Button' }).vm.$emit('click');
    expect(input(wrapper).props('modelValue')).toBe('draft');

    updating.value = false;
    await wrapper.setProps({ article: { id: 1, title: '', slug: 'draft' } });
    expect(wrapper.find('.teal').exists()).toBe(true);
    wrapper.findComponent(Banner).vm.$emit('action');
    expect(wrapper.emitted('previewArticle')).toHaveLength(1);
    expect(wrapper.find('button').exists()).toBe(false);
  });
});
