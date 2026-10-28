import conversationAPI from '../inbox/conversation';
import { useAxiosMock } from './oneteamAxiosMock';

describe('inbox ConversationApi (OneTeam)', () => {
  const axios = useAxiosMock();
  const url = '/api/v1/accounts/1/conversations';
  const signal = new AbortController().signal;

  it('lists conversations with filters and a signal', () => {
    conversationAPI.get({ inboxId: 1, status: 'open', page: 2 }, { signal });
    expect(axios.get).toHaveBeenCalledWith(url, {
      signal,
      params: expect.objectContaining({ inbox_id: 1, status: 'open', page: 2 }),
    });
    conversationAPI.get({});
    expect(axios.get.mock.calls.at(-1)[1].signal).toBeUndefined();
  });

  it('filters conversations', () => {
    conversationAPI.filter({
      queryData: { payload: [] },
      page: 1,
      sortBy: 'x',
    });
    expect(axios.post).toHaveBeenCalledWith(
      `${url}/filter`,
      { payload: [] },
      { signal: undefined, params: { page: 1, sort_by: 'x' } }
    );
  });

  it('searches conversations', () => {
    conversationAPI.search({ q: 'refund' });
    expect(axios.get).toHaveBeenCalledWith(`${url}/search`, {
      params: { q: 'refund', page: 1 },
    });
  });

  it('changes status, without a snooze time by default', () => {
    conversationAPI.toggleStatus({ conversationId: 2, status: 'resolved' });
    expect(axios.post).toHaveBeenCalledWith(`${url}/2/toggle_status`, {
      status: 'resolved',
      snoozed_until: null,
    });
  });

  it('changes priority and assignment', () => {
    conversationAPI.togglePriority({ conversationId: 2, priority: 'high' });
    expect(axios.post).toHaveBeenCalledWith(`${url}/2/toggle_priority`, {
      priority: 'high',
    });
    conversationAPI.assignAgent({
      conversationId: 2,
      agentId: 3,
      assigneeType: 'User',
    });
    expect(axios.post).toHaveBeenCalledWith(`${url}/2/assignments`, {
      assignee_id: 3,
      assignee_type: 'User',
    });
    conversationAPI.assignTeam({ conversationId: 2, teamId: 4 });
    expect(axios.post).toHaveBeenCalledWith(`${url}/2/assignments`, {
      team_id: 4,
    });
  });

  it('marks read and unread', () => {
    conversationAPI.markMessageRead({ id: 2 });
    expect(axios.post).toHaveBeenCalledWith(`${url}/2/update_last_seen`);
    conversationAPI.markMessagesUnread({ id: 2 });
    expect(axios.post).toHaveBeenCalledWith(`${url}/2/unread`);
  });

  it('sends typing status', () => {
    conversationAPI.toggleTyping({
      conversationId: 2,
      status: 'on',
      isPrivate: false,
    });
    expect(axios.post).toHaveBeenCalledWith(`${url}/2/toggle_typing_status`, {
      typing_status: 'on',
      is_private: false,
    });
  });

  it('mutes and unmutes', () => {
    conversationAPI.mute(2);
    expect(axios.post).toHaveBeenCalledWith(`${url}/2/mute`);
    conversationAPI.unmute(2);
    expect(axios.post).toHaveBeenCalledWith(`${url}/2/unmute`);
  });

  it('fetches counts', () => {
    conversationAPI.meta({ inboxId: 1, status: 'open' });
    expect(axios.get).toHaveBeenCalledWith(`${url}/meta`, {
      params: expect.objectContaining({ inbox_id: 1, status: 'open' }),
    });
  });

  it('emails a transcript', () => {
    conversationAPI.sendEmailTranscript({
      conversationId: 2,
      email: 'jo@example.com',
    });
    expect(axios.post).toHaveBeenCalledWith(`${url}/2/transcript`, {
      email: 'jo@example.com',
    });
  });

  it('checks and requests contact info', () => {
    conversationAPI.getContactInfoRequestAvailability(2, { signal });
    expect(axios.get).toHaveBeenCalledWith(`${url}/2/contact_info_request`, {
      signal,
    });
    conversationAPI.getContactInfoRequestAvailability(2);
    expect(axios.get).toHaveBeenLastCalledWith(
      `${url}/2/contact_info_request`,
      { signal: undefined }
    );
    conversationAPI.requestContactInfo(2);
    expect(axios.post).toHaveBeenCalledWith(`${url}/2/contact_info_request`);
  });

  it('updates custom attributes', () => {
    conversationAPI.updateCustomAttributes({
      conversationId: 2,
      customAttributes: { plan: 'pro' },
    });
    expect(axios.post).toHaveBeenCalledWith(`${url}/2/custom_attributes`, {
      custom_attributes: { plan: 'pro' },
    });
  });

  it('reads and updates participants', () => {
    conversationAPI.fetchParticipants(2);
    expect(axios.get).toHaveBeenCalledWith(`${url}/2/participants`);
    conversationAPI.updateParticipants({ conversationId: 2, userIds: [1] });
    expect(axios.patch).toHaveBeenCalledWith(`${url}/2/participants`, {
      user_ids: [1],
    });
  });

  it('fetches attachments and the inbox assistant, and deletes', () => {
    conversationAPI.getAllAttachments(2);
    expect(axios.get).toHaveBeenCalledWith(`${url}/2/attachments`);
    conversationAPI.getInboxAssistant(2);
    expect(axios.get).toHaveBeenCalledWith(`${url}/2/inbox_assistant`);
    conversationAPI.delete(2);
    expect(axios.delete).toHaveBeenCalledWith(`${url}/2`);
  });
});
