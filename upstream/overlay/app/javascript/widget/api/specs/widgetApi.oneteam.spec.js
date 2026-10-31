/**
 * OneTeam spec for the widget's HTTP calls. Each test pins the method, path
 * and body the widget sends, which is the contract the Laravel port's widget
 * API must answer.
 */
import { API, setHeader, removeHeader } from 'widget/helpers/axios';
import ContactsAPI from '../contacts';
import IntegrationAPI from '../integration';
import ConversationLabelsAPI from '../conversationLabels';
import EventsAPI from '../events';
import endPoints from '../endPoints';
import {
  sendMessageAPI,
  sendAttachmentAPI,
  toggleTyping,
  sendEmailTranscript,
  toggleStatus,
} from '../conversation';

const SEARCH = '?website_token=abc';

beforeEach(() => {
  ['get', 'post', 'patch', 'delete'].forEach(method => {
    vi.spyOn(API, method).mockResolvedValue({ data: {} });
  });
  window.WOOT_WIDGET = { $root: { $i18n: { locale: 'fr' } } };
  window.history.replaceState(null, '', `/widget${SEARCH}`);
  window.referrerURL = 'https://shop.example.test/cart';
});

afterEach(() => {
  vi.restoreAllMocks();
  delete window.referrerURL;
});

describe('contact API', () => {
  it('reads, updates and identifies the contact', () => {
    ContactsAPI.get();
    expect(API.get).toHaveBeenCalledWith(`/api/v1/widget/contact${SEARCH}`);
    ContactsAPI.update({ name: 'Ada' });
    expect(API.patch).toHaveBeenCalledWith(`/api/v1/widget/contact${SEARCH}`, {
      name: 'Ada',
    });
    ContactsAPI.setUser('u-1', { email: 'ada@example.test' });
    expect(API.patch).toHaveBeenCalledWith(
      `/api/v1/widget/contact/set_user${SEARCH}`,
      { identifier: 'u-1', email: 'ada@example.test' }
    );
  });

  it('sets and deletes custom attributes', () => {
    ContactsAPI.setCustomAttributes({ plan: 'pro' });
    expect(API.patch).toHaveBeenCalledWith(`/api/v1/widget/contact${SEARCH}`, {
      custom_attributes: { plan: 'pro' },
    });
    ContactsAPI.setCustomAttributes();
    expect(API.patch).toHaveBeenLastCalledWith(
      `/api/v1/widget/contact${SEARCH}`,
      { custom_attributes: {} }
    );
    ContactsAPI.deleteCustomAttribute('plan');
    expect(API.post).toHaveBeenCalledWith(
      `/api/v1/widget/contact/destroy_custom_attributes${SEARCH}`,
      { custom_attributes: ['plan'] }
    );
  });
});

describe('integration, label and event APIs', () => {
  it('adds the contact to a Dyte meeting', () => {
    IntegrationAPI.addParticipantToDyteMeeting(12);
    expect(API.post).toHaveBeenCalledWith(
      `/api/v1/widget/integrations/dyte/add_participant_to_meeting${SEARCH}&locale=fr`,
      { message_id: 12 }
    );
  });

  it('adds and removes conversation labels', () => {
    ConversationLabelsAPI.create('vip');
    expect(API.post).toHaveBeenCalledWith(`/api/v1/widget/labels${SEARCH}`, {
      label: 'vip',
    });
    ConversationLabelsAPI.destroy('vip');
    expect(API.delete).toHaveBeenCalledWith(
      `/api/v1/widget/labels/vip${SEARCH}`
    );
  });

  it('records a custom event with when and where it started', () => {
    EventsAPI.create('checkout');
    expect(API.post).toHaveBeenCalledWith(
      `/api/v1/widget/events${SEARCH}&locale=fr`,
      {
        name: 'checkout',
        event_info: {
          initiated_at: { timestamp: expect.any(String) },
          referer: 'https://shop.example.test/cart',
        },
      }
    );
    delete window.referrerURL;
    EventsAPI.create('home');
    expect(API.post.mock.calls[1][1].event_info.referer).toBe('');
  });
});

describe('conversation API', () => {
  it('sends a message with optional pending metadata', async () => {
    await sendMessageAPI('Hi');
    expect(API.post).toHaveBeenCalledWith(
      `/api/v1/widget/messages${SEARCH}&locale=fr`,
      {
        message: {
          content: 'Hi',
          reply_to: null,
          timestamp: expect.any(String),
          referer_url: 'https://shop.example.test/cart',
        },
      }
    );
    await sendMessageAPI('Hi', 4, {
      customAttributes: { plan: 'pro' },
      labels: ['vip'],
    });
    expect(API.post.mock.calls[1][1]).toMatchObject({
      message: { reply_to: 4 },
      custom_attributes: { plan: 'pro' },
      labels: ['vip'],
    });
  });

  it('sends typing, transcript and status requests', async () => {
    await toggleTyping({ typingStatus: 'on' });
    expect(API.post).toHaveBeenCalledWith(
      `/api/v1/widget/conversations/toggle_typing${SEARCH}`,
      { typing_status: 'on' }
    );
    await sendEmailTranscript();
    expect(API.post).toHaveBeenCalledWith(
      `/api/v1/widget/conversations/transcript${SEARCH}`
    );
    await toggleStatus();
    expect(API.get).toHaveBeenCalledWith(
      `/api/v1/widget/conversations/toggle_status${SEARCH}`
    );
  });

  it('uploads an attachment as multipart form data', async () => {
    const file = new File(['x'], 'photo.png', { type: 'image/png' });
    await sendAttachmentAPI(
      { attachment: { file }, replyTo: 7 },
      { customAttributes: { plan: 'pro' }, labels: ['vip', 'new'] }
    );
    const [url, form] = API.post.mock.calls[0];
    expect(url).toBe(`/api/v1/widget/messages${SEARCH}`);
    expect(form.get('message[attachments][]').name).toBe('photo.png');
    expect(form.get('message[referer_url]')).toBe(
      'https://shop.example.test/cart'
    );
    expect(form.get('message[reply_to]')).toBe('7');
    expect(form.get('custom_attributes[plan]')).toBe('pro');
    expect(form.getAll('labels[]')).toEqual(['vip', 'new']);
  });

  it('uploads a direct-upload signed id without metadata', async () => {
    delete window.referrerURL;
    await sendAttachmentAPI({ attachment: { file: 'signed-blob-id' } });
    const [, form] = API.post.mock.calls[0];
    expect(form.get('message[attachments][]')).toBe('signed-blob-id');
    expect(form.get('message[referer_url]')).toBe('');
    expect(form.has('message[reply_to]')).toBe(false);
    expect(form.has('labels[]')).toBe(false);
  });

  it('builds the same attachment request through endPoints directly', () => {
    const { params } = endPoints.sendAttachment(
      { attachment: { file: 'id' } },
      { customAttributes: {}, labels: [] }
    );
    expect(params.has('custom_attributes[plan]')).toBe(false);
  });
});

describe('auth header', () => {
  it('sets and removes a header on the shared client', () => {
    setHeader('token-1');
    expect(API.defaults.headers.common['X-Auth-Token']).toBe('token-1');
    setHeader('v', 'X-Other');
    removeHeader('X-Other');
    removeHeader('X-Auth-Token');
    expect(API.defaults.headers.common['X-Auth-Token']).toBeUndefined();
  });
});
