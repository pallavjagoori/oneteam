/**
 * OneTeam behaviour spec for the widget Article template.
 *
 * Covers hiding without items and listing article links with
 * truncated descriptions.
 */
import { mount } from '@vue/test-utils';
import Article from '../Article.vue';

/**
 * Mounts the article list.
 *
 * @param {Array<object>} items articles
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountArticle = items =>
  mount(Article, {
    props: items ? { items } : {},
    global: { stubs: { FluentIcon: true } },
  });

describe('Article template behaviour', () => {
  it('renders nothing without items', () => {
    expect(mountArticle().find('.chat-bubble').exists()).toBe(false);
  });

  it('lists article links with truncated descriptions', () => {
    const wrapper = mountArticle([
      { link: '/a', title: 'Billing', description: 'x'.repeat(200) },
      { link: '/b', title: 'Setup', description: 'Short' },
    ]);
    const links = wrapper.findAll('a');
    expect(links.map(link => link.attributes('href'))).toEqual(['/a', '/b']);
    expect(wrapper.text()).toContain('Billing');
    expect(links[0].text().length).toBeLessThan(200);
    expect(links[1].text()).toContain('Short');
  });
});
