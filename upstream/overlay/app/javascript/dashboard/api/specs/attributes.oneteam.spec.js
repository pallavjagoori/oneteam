import attributesAPI from '../attributes';
import { useAxiosMock } from './oneteamAxiosMock';

describe('AttributeAPI (OneTeam)', () => {
  const axios = useAxiosMock();

  it('lists the attribute definitions', () => {
    attributesAPI.getAttributesByModel();
    expect(axios.get).toHaveBeenCalledWith(
      '/api/v1/accounts/1/custom_attribute_definitions'
    );
  });
});
