import agentSessionsAPI from '../agentSessions';
import bulkActionsAPI from '../bulkActions';
import messageReportsAPI from '../messageReports';
import copilotMessagesAPI from '../copilotMessages';
import copilotRunsAPI from '../copilotRuns';
import copilotThreadsAPI from '../copilotThreads';
import preferencesAPI from '../preferences';
import toolsAPI from '../tools';
import { useAxiosMock } from '../../specs/oneteamAxiosMock';

const base = '/api/v1/accounts/1/captain';

describe('small Captain API clients (OneTeam)', () => {
  const axios = useAxiosMock();

  it.each([
    [agentSessionsAPI, 'agent_sessions'],
    [bulkActionsAPI, 'bulk_actions'],
    [messageReportsAPI, 'message_reports'],
  ])('points at its resource (%#)', (client, resource) => {
    expect(client.url).toBe(`${base}/${resource}`);
  });

  it('lists and creates copilot messages', () => {
    copilotMessagesAPI.get(3);
    expect(axios.get).toHaveBeenCalledWith(
      `${base}/copilot_threads/3/copilot_messages`,
      { params: { page: 1 } }
    );
    copilotMessagesAPI.get(3, { page: 2 });
    expect(axios.get).toHaveBeenLastCalledWith(
      `${base}/copilot_threads/3/copilot_messages`,
      { params: { page: 2 } }
    );
    copilotMessagesAPI.create({ threadId: 3, message: 'hi' });
    expect(axios.post).toHaveBeenCalledWith(
      `${base}/copilot_threads/3/copilot_messages`,
      { message: 'hi' }
    );
  });

  it('approves and rejects copilot runs', () => {
    copilotRunsAPI.approve(5);
    expect(axios.post).toHaveBeenCalledWith(`${base}/copilot_runs/5/approve`);
    copilotRunsAPI.reject(5);
    expect(axios.post).toHaveBeenCalledWith(`${base}/copilot_runs/5/reject`);
  });

  it('lists copilot threads, page 1 by default', () => {
    copilotThreadsAPI.get();
    expect(axios.get).toHaveBeenCalledWith(`${base}/copilot_threads`, {
      params: { page: 1 },
    });
  });

  it('reads and updates preferences', () => {
    preferencesAPI.get();
    expect(axios.get).toHaveBeenCalledWith(`${base}/preferences`);
    preferencesAPI.updatePreferences({ model: 'x' });
    expect(axios.put).toHaveBeenCalledWith(`${base}/preferences`, {
      model: 'x',
    });
  });

  it('lists tools with params and a signal', () => {
    const signal = new AbortController().signal;
    toolsAPI.get({ signal, assistant_id: 2 });
    expect(axios.get).toHaveBeenCalledWith(`${base}/assistants/tools`, {
      params: { assistant_id: 2 },
      signal,
    });
    toolsAPI.get();
    expect(axios.get).toHaveBeenLastCalledWith(`${base}/assistants/tools`, {
      params: {},
      signal: undefined,
    });
  });
});
