import messageAPI, { buildCreatePayload } from '../inbox/message';

const url = '/api/v1/accounts/1/conversations';

describe('inbox MessageApi (OneTeam)', () => {
  // message.create calls axios itself as a function, so the mock is callable.
  const axios = Object.assign(
    vi.fn(() => Promise.resolve({})),
    {
      get: vi.fn(() => Promise.resolve({})),
      post: vi.fn(() => Promise.resolve({})),
      delete: vi.fn(() => Promise.resolve({})),
    }
  );
  const originalAxios = window.axios;

  beforeEach(() => {
    window.axios = axios;
    window.history.pushState({}, '', '/app/accounts/1/dashboard');
  });

  afterEach(() => {
    window.axios = originalAxios;
    window.history.pushState({}, '', '/');
  });

  describe('buildCreatePayload with files', () => {
    it('adds every optional field that is set', () => {
      const form = buildCreatePayload({
        message: 'hi',
        isPrivate: false,
        echoId: 'e1',
        files: [new File(['x'], 'a.txt')],
        toEmails: 'to@example.com',
        subject: 'Re: hi',
        contentAttributes: { in_reply_to: 1 },
        isVoiceMessage: true,
        emailHtmlContent: '<p>hi</p>',
        forwardedAttachmentIds: [7, 8],
      });
      expect(form.get('content')).toBe('hi');
      expect(form.get('cc_emails')).toBe('');
      expect(form.get('bcc_emails')).toBe('');
      expect(form.get('to_emails')).toBe('to@example.com');
      expect(form.get('subject')).toBe('Re: hi');
      expect(form.get('content_attributes')).toBe('{"in_reply_to":1}');
      expect(form.get('is_voice_message')).toBe('true');
      expect(form.get('email_html_content')).toBe('<p>hi</p>');
      expect(form.getAll('forwarded_attachment_ids[]')).toEqual(['7', '8']);
    });

    it('leaves out optional fields that are not set', () => {
      const form = buildCreatePayload({
        isPrivate: true,
        echoId: 'e1',
        files: [new File(['x'], 'a.txt')],
      });
      ['content', 'to_emails', 'subject', 'content_attributes'].forEach(key =>
        expect(form.has(key)).toBe(false)
      );
      expect(form.has('is_voice_message')).toBe(false);
      expect(form.has('email_html_content')).toBe(false);
      expect(form.has('forwarded_attachment_ids[]')).toBe(false);
    });
  });

  it('builds a JSON payload without files', () => {
    expect(buildCreatePayload({ message: 'hi', files: [] })).toMatchObject({
      content: 'hi',
      cc_emails: '',
      bcc_emails: '',
      to_emails: '',
    });
  });

  it('posts a new message', () => {
    messageAPI.create({ conversationId: 2, message: 'hi', private: false });
    expect(axios).toHaveBeenCalledWith({
      method: 'post',
      url: `${url}/2/messages`,
      data: expect.objectContaining({ content: 'hi', private: false }),
    });
  });

  it('deletes and retries a message', () => {
    messageAPI.delete(2, 5);
    expect(axios.delete).toHaveBeenCalledWith(`${url}/2/messages/5`);
    messageAPI.retry(2, 5);
    expect(axios.post).toHaveBeenCalledWith(`${url}/2/messages/5/retry`);
  });

  it('pages back, sending after only when it differs from before', () => {
    messageAPI.getPreviousMessages({ conversationId: 2, before: 10, after: 4 });
    expect(axios.get).toHaveBeenCalledWith(`${url}/2/messages`, {
      params: { before: 10, after: 4 },
    });
    messageAPI.getPreviousMessages({
      conversationId: 2,
      before: 10,
      after: 10,
    });
    expect(axios.get).toHaveBeenLastCalledWith(`${url}/2/messages`, {
      params: { before: 10 },
    });
  });

  it('translates messages', () => {
    messageAPI.translateMessage(2, 5, 'fr');
    expect(axios.post).toHaveBeenCalledWith(`${url}/2/messages/5/translate`, {
      target_language: 'fr',
    });
    messageAPI.autoTranslate(2, [5]);
    expect(axios.post).toHaveBeenCalledWith(
      `${url}/2/messages/auto_translate`,
      { message_ids: [5] }
    );
  });
});
