/**
 * OneTeam behaviour spec for the article properties panel.
 *
 * Covers loading the meta fields, saving edits, the slug field events
 * and closing the panel.
 */
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import ArticleEditorProperties from '../ArticleEditorProperties.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('@chatwoot/utils', async importOriginal => ({
  ...(await importOriginal()),
  debounce: fn => fn,
}));

/**
 * Builds a v-model field stub.
 *
 * @param {string} name stub name
 * @returns {object}
 */
const field = name => ({
  name,
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<div />',
});

/**
 * Mounts the panel.
 *
 * @param {object} article article edited
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountPanel = article =>
  mount(ArticleEditorProperties, {
    props: { article },
    global: {
      stubs: {
        TextArea: field('TextArea'),
        InlineInput: field('InlineInput'),
        TagInput: field('TagInput'),
        ArticleSlugField: {
          name: 'ArticleSlugField',
          emits: ['saveSlug', 'previewArticle'],
          template: '<div />',
        },
        Button: {
          name: 'NextButton',
          emits: ['click'],
          template: '<button @click="$emit(\'click\')" />',
        },
      },
    },
  });

describe('ArticleEditorProperties behaviour', () => {
  it('loads the meta fields and saves edits', async () => {
    const wrapper = mountPanel({
      meta: { title: 'T', description: 'D', tags: ['a'] },
    });
    await nextTick();
    expect(
      wrapper.findComponent({ name: 'InlineInput' }).props('modelValue')
    ).toBe('T');
    expect(
      wrapper.findComponent({ name: 'TextArea' }).props('modelValue')
    ).toBe('D');
    expect(
      wrapper.findComponent({ name: 'TagInput' }).props('modelValue')
    ).toEqual(['a']);
    expect(wrapper.emitted('saveArticle').at(-1)).toEqual([
      { title: 'T', description: 'D', tags: ['a'] },
    ]);

    wrapper
      .findComponent({ name: 'InlineInput' })
      .vm.$emit('update:modelValue', 'New');
    wrapper
      .findComponent({ name: 'TextArea' })
      .vm.$emit('update:modelValue', 'Desc');
    wrapper
      .findComponent({ name: 'TagInput' })
      .vm.$emit('update:modelValue', ['b']);
    await nextTick();
    expect(wrapper.emitted('saveArticle').at(-1)).toEqual([
      { title: 'New', description: 'Desc', tags: ['b'] },
    ]);
  });

  it('defaults missing meta and forwards slug and close events', async () => {
    const wrapper = mountPanel({});
    await nextTick();
    expect(
      wrapper.findComponent({ name: 'InlineInput' }).props('modelValue')
    ).toBe('');
    expect(
      wrapper.findComponent({ name: 'TagInput' }).props('modelValue')
    ).toEqual([]);

    const slug = wrapper.findComponent({ name: 'ArticleSlugField' });
    slug.vm.$emit('saveSlug', 'my-slug');
    slug.vm.$emit('previewArticle');
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('saveSlug')).toEqual([['my-slug']]);
    expect(wrapper.emitted('previewArticle')).toHaveLength(1);
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
