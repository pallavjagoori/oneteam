import axios from 'axios';
import changelogAPI from '../changelog';
import { CHANGELOG_API_URL } from 'shared/constants/links';

vi.mock('axios', () => ({ default: { get: vi.fn(() => Promise.resolve()) } }));

describe('ChangelogApi (OneTeam)', () => {
  it('fetches the changelog from the Chatwoot hub', () => {
    changelogAPI.fetchFromHub();
    expect(axios.get).toHaveBeenCalledWith(CHANGELOG_API_URL);
  });
});
