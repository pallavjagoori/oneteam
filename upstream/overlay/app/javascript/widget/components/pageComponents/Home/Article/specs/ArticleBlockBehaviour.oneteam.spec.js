/**
 * OneTeam behaviour spec for the widget home popular articles block.
 *
 * Covers showing at most six articles, opening one, and view all.
 */
import { mount } from '@vue/test-utils';
import ArticleBlock from '../ArticleBlock.vue';

vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return { useMapGetter: () => computed(() => '#123456') };
});

const ArticleListItem = {
  name: 'ArticleListItem',
  props: ['link', 'title'],
  emits: ['selectArticle'],
  template: '<div class="item" />',
};

describe('ArticleBlock behaviour', () => {
  it('lists up to six articles and emits view and viewAll', async () => {
    const articles = Array.from({ length: 8 }, (_, i) => ({
      slug: `a${i}`,
      link: `/a/${i}`,
      title: `Article ${i}`,
    }));
    const wrapper = mount(ArticleBlock, {
      props: { articles },
      global: { stubs: { ArticleListItem }, mocks: { $t: key => key } },
    });
    const items = wrapper.findAllComponents(ArticleListItem);
    expect(items).toHaveLength(6);
    items[1].vm.$emit('selectArticle', '/a/1');
    expect(wrapper.emitted('view')).toEqual([['/a/1']]);
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('viewAll')).toHaveLength(1);
  });
});
