import tasksAPI from '../tasks';
import { useAxiosMock } from '../../specs/oneteamAxiosMock';

describe('Captain TasksAPI (OneTeam)', () => {
  const axios = useAxiosMock();
  const url = '/api/v1/accounts/1/captain/tasks';
  const signal = new AbortController().signal;

  it('rewrites content', () => {
    tasksAPI.rewrite(
      { content: 'hi', operation: 'casual', conversationId: 9 },
      signal
    );
    expect(axios.post).toHaveBeenCalledWith(
      `${url}/rewrite`,
      { content: 'hi', operation: 'casual', conversation_display_id: 9 },
      { signal }
    );
  });

  it('summarizes a conversation', () => {
    tasksAPI.summarize(9, signal);
    expect(axios.post).toHaveBeenCalledWith(
      `${url}/summarize`,
      { conversation_display_id: 9 },
      { signal }
    );
  });

  it('suggests a reply', () => {
    tasksAPI.replySuggestion(9, signal);
    expect(axios.post).toHaveBeenCalledWith(
      `${url}/reply_suggestion`,
      { conversation_display_id: 9 },
      { signal }
    );
  });

  it('follows up on a previous result', () => {
    tasksAPI.followUp(
      { followUpContext: { id: 1 }, message: 'shorter', conversationId: 9 },
      signal
    );
    expect(axios.post).toHaveBeenCalledWith(
      `${url}/follow_up`,
      {
        follow_up_context: { id: 1 },
        message: 'shorter',
        conversation_display_id: 9,
      },
      { signal }
    );
  });
});
