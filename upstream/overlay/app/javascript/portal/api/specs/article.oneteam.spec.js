/**
 * OneTeam spec for the help center portal's article search request.
 */
import axios from 'axios';
import ArticlesAPI from '../article';

describe('portal ArticlesAPI', () => {
  it('searches a portal locale for articles', () => {
    const get = vi.spyOn(axios, 'get').mockResolvedValue({ data: [] });
    ArticlesAPI.searchArticles('help', 'en', 'billing');
    expect(get).toHaveBeenCalledWith('/hc/help/en/articles.json?query=billing');
    get.mockRestore();
  });
});
