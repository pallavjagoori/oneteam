import automationAPI from '../automation';
import { useAxiosMock } from './oneteamAxiosMock';

describe('AutomationsAPI (OneTeam)', () => {
  const axios = useAxiosMock();
  const url = '/api/v1/accounts/1/automation_rules';

  it('clones a rule', () => {
    automationAPI.clone(4);
    expect(axios.post).toHaveBeenCalledWith(`${url}/4/clone`);
  });

  it('lists the rules linked to a monitor', () => {
    const signal = new AbortController().signal;
    automationAPI.linkedToMonitor(9, signal);
    expect(axios.get).toHaveBeenCalledWith(url, {
      params: { monitor_id: 9 },
      signal,
    });
  });
});
