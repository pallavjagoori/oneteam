import teamsAPI from '../teams';
import { useAxiosMock } from './oneteamAxiosMock';

describe('TeamsAPI (OneTeam)', () => {
  const axios = useAxiosMock();
  const url = '/api/v1/accounts/1/teams';

  it('caches under the team model name', () => {
    expect(teamsAPI.cacheModelName).toBe('team');
  });

  it('reads and wraps cached data like an axios response', () => {
    const data = [{ id: 1 }];
    expect(teamsAPI.extractDataFromResponse({ data })).toBe(data);
    expect(teamsAPI.marshallData(data)).toEqual({ data });
  });

  it('fetches the agents of a team', () => {
    teamsAPI.getAgents({ teamId: 2 });
    expect(axios.get).toHaveBeenCalledWith(`${url}/2/team_members`);
  });

  it('adds agents to a team', () => {
    teamsAPI.addAgents({ teamId: 2, agentsList: [5] });
    expect(axios.post).toHaveBeenCalledWith(`${url}/2/team_members`, {
      user_ids: [5],
    });
  });

  it('replaces the agents of a team', () => {
    teamsAPI.updateAgents({ teamId: 2, agentsList: [5] });
    expect(axios.patch).toHaveBeenCalledWith(`${url}/2/team_members`, {
      user_ids: [5],
    });
  });
});
