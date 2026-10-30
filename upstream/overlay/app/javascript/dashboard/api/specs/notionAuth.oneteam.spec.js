import notionAuthAPI from '../notion_auth';
import { useAxiosMock } from './oneteamAxiosMock';

describe('NotionOAuthClient (OneTeam)', () => {
  const axios = useAxiosMock();

  it('requests an authorization URL', () => {
    notionAuthAPI.generateAuthorization();
    expect(axios.post).toHaveBeenCalledWith(
      '/api/v1/accounts/1/notion/authorization'
    );
  });
});
