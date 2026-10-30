import customViewsAPI from '../customViews';
import { useAxiosMock } from './oneteamAxiosMock';

describe('CustomViewsAPI (OneTeam)', () => {
  const axios = useAxiosMock();
  const url = '/api/v1/accounts/1/custom_filters';

  it('lists views of a filter type', () => {
    customViewsAPI.getCustomViewsByFilterType('conversation');
    expect(axios.get).toHaveBeenCalledWith(`${url}?filter_type=conversation`);
  });

  it('deletes a view of a filter type', () => {
    customViewsAPI.deleteCustomViews(4, 'contact');
    expect(axios.delete).toHaveBeenCalledWith(`${url}/4?filter_type=contact`);
  });
});
