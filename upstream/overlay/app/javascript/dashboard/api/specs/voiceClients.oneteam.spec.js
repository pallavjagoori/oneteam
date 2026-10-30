import voiceAPI from '../channel/voice/voiceAPIClient';
import whatsappCallsAPI from '../channel/whatsapp/whatsappCallsAPI';
import { useAxiosMock } from './oneteamAxiosMock';

const base = '/api/v1/accounts/1';

describe('VoiceAPI (OneTeam)', () => {
  const axios = useAxiosMock({ data: { ok: true } });

  it('starts a call through the contacts API and returns its data', async () => {
    await expect(voiceAPI.initiateCall(3, 4)).resolves.toEqual({ ok: true });
    expect(axios.post).toHaveBeenCalledWith(`${base}/contacts/3/call`, {
      inbox_id: 4,
      conversation_id: null,
    });
  });

  it('leaves a conference', async () => {
    await expect(
      voiceAPI.leaveConference({ inboxId: 4, conversationId: 5, callSid: 's' })
    ).resolves.toEqual({ ok: true });
    expect(axios.delete).toHaveBeenCalledWith(`${base}/inboxes/4/conference`, {
      params: { conversation_id: 5, call_sid: 's' },
    });
  });

  it('joins a conference', async () => {
    await expect(
      voiceAPI.joinConference({
        conversationId: 5,
        inboxId: 4,
        callSid: 's',
        attemptId: 'a',
      })
    ).resolves.toEqual({ ok: true });
    expect(axios.post).toHaveBeenCalledWith(`${base}/inboxes/4/conference`, {
      conversation_id: 5,
      call_sid: 's',
      attempt_id: 'a',
    });
  });

  it('fetches a token, and refuses without an inbox', async () => {
    await expect(voiceAPI.getToken(4)).resolves.toEqual({ ok: true });
    expect(axios.get).toHaveBeenCalledWith(
      `${base}/inboxes/4/conference/token`
    );
    await expect(voiceAPI.getToken()).rejects.toThrow('Inbox ID is required');
  });
});

describe('WhatsappCallsAPI (OneTeam)', () => {
  const axios = useAxiosMock({ data: { id: 1 } });
  const url = `${base}/whatsapp_calls`;

  it('shows a call', async () => {
    await expect(whatsappCallsAPI.show(1)).resolves.toEqual({ id: 1 });
    expect(axios.get).toHaveBeenCalledWith(`${url}/1`);
  });

  it('starts a call', async () => {
    await whatsappCallsAPI.initiate(
      { conversationId: 5, contactId: 3, inboxId: 4 },
      'offer'
    );
    expect(axios.post).toHaveBeenCalledWith(`${url}/initiate`, {
      conversation_id: 5,
      contact_id: 3,
      inbox_id: 4,
      sdp_offer: 'offer',
    });
  });

  it('accepts, rejects and ends a call', async () => {
    await whatsappCallsAPI.accept(1, 'answer');
    expect(axios.post).toHaveBeenCalledWith(`${url}/1/accept`, {
      sdp_answer: 'answer',
    });
    await whatsappCallsAPI.reject(1);
    expect(axios.post).toHaveBeenCalledWith(`${url}/1/reject`);
    await whatsappCallsAPI.terminate(1);
    expect(axios.post).toHaveBeenCalledWith(`${url}/1/terminate`);
  });

  it('uploads a recording, with a default file name', async () => {
    const blob = new Blob(['x']);
    await whatsappCallsAPI.uploadRecording(1, blob);
    let form = axios.post.mock.calls.at(-1)[1];
    expect(axios.post.mock.calls.at(-1)[0]).toBe(`${url}/1/upload_recording`);
    expect(form.get('recording').name).toBe('call-recording.webm');

    await whatsappCallsAPI.uploadRecording(1, blob, 'call.ogg');
    form = axios.post.mock.calls.at(-1)[1];
    expect(form.get('recording').name).toBe('call.ogg');
  });
});
