import channelsAPI from '../channels';
import { useAxiosMock } from './oneteamAxiosMock';

describe('channels API (OneTeam)', () => {
  const axios = useAxiosMock();

  it('fetches the Facebook pages for an OAuth token', () => {
    channelsAPI.fetchFacebookPages('token-1', 3);
    expect(axios.post).toHaveBeenCalledWith(
      'api/v1/accounts/3/callbacks/facebook_pages.json',
      { omniauth_token: 'token-1' }
    );
  });
});
