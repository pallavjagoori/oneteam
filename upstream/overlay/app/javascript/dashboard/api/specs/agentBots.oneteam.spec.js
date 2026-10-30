import agentBotsAPI from '../agentBots';
import { useAxiosMock } from './oneteamAxiosMock';

describe('AgentBotsAPI (OneTeam)', () => {
  const axios = useAxiosMock();
  const url = '/api/v1/accounts/1/agent_bots';
  const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };

  it('creates a bot as multipart form data', () => {
    agentBotsAPI.create({ name: 'Bot' });
    expect(axios.post).toHaveBeenCalledWith(url, { name: 'Bot' }, multipart);
  });

  it('updates a bot as multipart form data', () => {
    agentBotsAPI.update(3, { name: 'Bot' });
    expect(axios.patch).toHaveBeenCalledWith(
      `${url}/3`,
      { name: 'Bot' },
      multipart
    );
  });

  it('deletes the bot avatar', () => {
    agentBotsAPI.deleteAgentBotAvatar(3);
    expect(axios.delete).toHaveBeenCalledWith(`${url}/3/avatar`);
  });

  it('resets the access token', () => {
    agentBotsAPI.resetAccessToken(3);
    expect(axios.post).toHaveBeenCalledWith(`${url}/3/reset_access_token`);
  });

  it('resets the secret', () => {
    agentBotsAPI.resetSecret(3);
    expect(axios.post).toHaveBeenCalledWith(`${url}/3/reset_secret`);
  });
});
