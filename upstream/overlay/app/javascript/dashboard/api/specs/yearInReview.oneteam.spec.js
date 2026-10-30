import yearInReviewAPI from '../yearInReview';
import { useAxiosMock } from './oneteamAxiosMock';

describe('YearInReviewAPI (OneTeam)', () => {
  const axios = useAxiosMock();

  it('fetches the review for a year', () => {
    yearInReviewAPI.get(2025);
    expect(axios.get).toHaveBeenCalledWith(
      '/api/v2/accounts/1/year_in_review',
      { params: { year: 2025 } }
    );
  });
});
