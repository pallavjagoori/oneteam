import liveReportsAPI from '../liveReports';
import { useAxiosMock } from './oneteamAxiosMock';

describe('LiveReportsAPI (OneTeam)', () => {
  const axios = useAxiosMock();
  const url = '/api/v2/accounts/1/live_reports';

  it('fetches conversation metrics', () => {
    liveReportsAPI.getConversationMetric({ team_id: 1 });
    expect(axios.get).toHaveBeenCalledWith(`${url}/conversation_metrics`, {
      params: { team_id: 1 },
    });
  });

  it('fetches conversation metrics without params', () => {
    liveReportsAPI.getConversationMetric();
    expect(axios.get).toHaveBeenCalledWith(`${url}/conversation_metrics`, {
      params: {},
    });
  });

  it('groups conversations by the given field', () => {
    liveReportsAPI.getGroupedConversations({ groupBy: 'team_id' });
    expect(axios.get).toHaveBeenCalledWith(
      `${url}/grouped_conversation_metrics`,
      { params: { group_by: 'team_id' } }
    );
  });

  it('groups conversations by assignee by default', () => {
    liveReportsAPI.getGroupedConversations();
    expect(axios.get).toHaveBeenCalledWith(
      `${url}/grouped_conversation_metrics`,
      { params: { group_by: 'assignee_id' } }
    );
  });
});
