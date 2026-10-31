/**
 * OneTeam spec for the CSAT survey page's API calls.
 */
import { API } from 'survey/helpers/axios';
import { getSurveyDetails, updateSurvey } from '../survey';

describe('survey API', () => {
  beforeEach(() => {
    vi.spyOn(API, 'get').mockResolvedValue({ data: { id: 1 } });
    vi.spyOn(API, 'put').mockResolvedValue({});
  });
  afterEach(() => vi.restoreAllMocks());

  it('loads a survey by its uuid', async () => {
    await expect(getSurveyDetails({ uuid: 'u-1' })).resolves.toEqual({
      data: { id: 1 },
    });
    expect(API.get).toHaveBeenCalledWith('/public/api/v1/csat_survey/u-1', {
      params: undefined,
    });
  });

  it('submits the rating and feedback', async () => {
    await updateSurvey({ uuid: 'u-1', data: { rating: 5, feedback: 'Great' } });
    expect(API.put).toHaveBeenCalledWith('/public/api/v1/csat_survey/u-1', {
      rating: 5,
      feedback: 'Great',
    });
  });
});
