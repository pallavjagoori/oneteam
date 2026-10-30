import articlesAPI from '../helpCenter/articles';
import { useAxiosMock } from './oneteamAxiosMock';

// ArticlesAPI extends PortalsAPI, so its base URL is the portals URL.
const url = '/api/v1/accounts/1/portals/docs/articles';

describe('ArticlesAPI (OneTeam)', () => {
  const axios = useAxiosMock();

  it('lists articles with the given filters', () => {
    const signal = new AbortController().signal;
    articlesAPI.getArticles({
      pageNumber: 2,
      portalSlug: 'docs',
      locale: 'en',
      status: 1,
      signal,
    });
    expect(axios.get).toHaveBeenCalledWith(`${url}?page=2&locale=en&status=1`, {
      signal,
    });
  });

  it('searches articles', () => {
    articlesAPI.searchArticles({ portalSlug: 'docs', query: 'refund' });
    expect(axios.get).toHaveBeenCalledWith(`${url}?query=refund`);
  });

  it('reads, updates and deletes an article', () => {
    articlesAPI.getArticle({ id: 3, portalSlug: 'docs' });
    expect(axios.get).toHaveBeenCalledWith(`${url}/3`);
    articlesAPI.updateArticle({
      portalSlug: 'docs',
      articleId: 3,
      articleObj: { title: 'T' },
    });
    expect(axios.patch).toHaveBeenCalledWith(`${url}/3`, { title: 'T' });
    articlesAPI.deleteArticle({ articleId: 3, portalSlug: 'docs' });
    expect(axios.delete).toHaveBeenCalledWith(`${url}/3`);
  });

  it('creates an article', () => {
    articlesAPI.createArticle({
      portalSlug: 'docs',
      articleObj: {
        content: 'Body',
        title: 'T',
        authorId: 1,
        categoryId: 2,
        locale: 'en',
      },
    });
    expect(axios.post).toHaveBeenCalledWith(url, {
      content: 'Body',
      title: 'T',
      author_id: 1,
      category_id: 2,
      locale: 'en',
    });
  });

  it('reorders articles', () => {
    articlesAPI.reorderArticles({
      portalSlug: 'docs',
      reorderedGroup: { 3: 1 },
      categorySlug: 'billing',
    });
    expect(axios.post).toHaveBeenCalledWith(`${url}/reorder`, {
      positions_hash: { 3: 1 },
      category_slug: 'billing',
    });
  });

  it('translates in bulk, without forcing by default', () => {
    articlesAPI.bulkTranslate({
      portalSlug: 'docs',
      articleIds: [3],
      locale: 'fr',
      categoryId: 2,
    });
    expect(axios.post).toHaveBeenCalledWith(`${url}/bulk_actions/translate`, {
      ids: [3],
      locale: 'fr',
      category_id: 2,
      force: false,
    });
  });

  it('updates status and category in bulk', () => {
    articlesAPI.bulkUpdateStatus({
      portalSlug: 'docs',
      articleIds: [3],
      status: 'published',
    });
    expect(axios.patch).toHaveBeenCalledWith(
      `${url}/bulk_actions/update_status`,
      { ids: [3], status: 'published' }
    );
    articlesAPI.bulkUpdateCategory({
      portalSlug: 'docs',
      articleIds: [3],
      categoryId: 2,
    });
    expect(axios.patch).toHaveBeenCalledWith(
      `${url}/bulk_actions/update_category`,
      { ids: [3], category_id: 2 }
    );
  });

  it('deletes in bulk', () => {
    articlesAPI.bulkDelete({ portalSlug: 'docs', articleIds: [3] });
    expect(axios.delete).toHaveBeenCalledWith(
      `${url}/bulk_actions/delete_articles`,
      { data: { ids: [3] } }
    );
  });
});
