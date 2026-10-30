import inboxMembersAPI from '../inboxMembers';
import { useAxiosMock } from './oneteamAxiosMock';

describe('InboxMembers API (OneTeam)', () => {
  const axios = useAxiosMock();

  it('replaces the agents of an inbox', () => {
    inboxMembersAPI.update({ inboxId: 2, agentList: [1, 3] });
    expect(axios.patch).toHaveBeenCalledWith(
      '/api/v1/accounts/1/inbox_members',
      { inbox_id: 2, user_ids: [1, 3] }
    );
  });
});
