/**
 * Covers the widget home article row, which emits its link when clicked.
 */
import { mount } from '@vue/test-utils';
import ArticleListItem from '../ArticleListItem.vue';

describe('ArticleListItem', () => {
  it('emits selectArticle with the link', async () => {
    const wrapper = mount(ArticleListItem, {
      props: { link: '/hc/a/1', title: 'Billing' },
    });
    await wrapper.find('[role="button"]').trigger('click');
    expect(wrapper.emitted('selectArticle')[0]).toEqual(['/hc/a/1']);
  });
});
