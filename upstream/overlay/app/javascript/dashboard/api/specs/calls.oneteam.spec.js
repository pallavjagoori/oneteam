import callsAPI from '../calls';
import { useAxiosMock } from './oneteamAxiosMock';

describe('CallsAPI (OneTeam)', () => {
  const axios = useAxiosMock();
  const url = '/api/v1/accounts/1/calls';

  it('lists calls with the given filters', () => {
    callsAPI.get({ page: 2 });
    expect(axios.get).toHaveBeenCalledWith(url, { params: { page: 2 } });
  });

  it('lists calls without filters', () => {
    callsAPI.get();
    expect(axios.get).toHaveBeenCalledWith(url, { params: {} });
  });
});
