import endPoints from '../endPoints';

describe('endPoints (OneTeam)', () => {
  it('builds the Facebook pages URL for an account', () => {
    expect(endPoints('fetchFacebookPages').url(4)).toBe(
      'api/v1/accounts/4/callbacks/facebook_pages.json'
    );
  });
});
