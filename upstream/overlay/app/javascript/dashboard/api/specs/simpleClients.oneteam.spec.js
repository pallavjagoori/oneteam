import customRoleAPI from '../customRole';
import slaAPI from '../sla';
import labelsAPI from '../labels';
import ApiClient from '../ApiClient';
import { useAxiosMock } from './oneteamAxiosMock';

// Clients that only name their resource and inherit everything else.
describe('resource-only API clients (OneTeam)', () => {
  useAxiosMock();

  it.each([
    [customRoleAPI, '/api/v1/accounts/1/custom_roles'],
    [slaAPI, '/api/v1/accounts/1/sla_policies'],
    [labelsAPI, '/api/v1/accounts/1/labels'],
  ])('points at %#', (client, url) => {
    expect(client).toBeInstanceOf(ApiClient);
    expect(client.url).toBe(url);
  });

  it('caches labels under the label model name', () => {
    expect(labelsAPI.cacheModelName).toBe('label');
  });
});
