import contactAPI, { buildContactParams } from '../contacts';
import { useAxiosMock } from './oneteamAxiosMock';

describe('ContactAPI (OneTeam)', () => {
  const axios = useAxiosMock();
  const url = '/api/v1/accounts/1/contacts';
  const signal = new AbortController().signal;

  it('builds params with a search and one or more labels', () => {
    expect(buildContactParams(1, 'name', 'vip', 'jo')).toEqual({
      include_contact_inboxes: false,
      page: 1,
      sort: 'name',
      q: 'jo',
      labels: ['vip'],
    });
    expect(buildContactParams(1, 'name', ['a', 'b']).labels).toEqual([
      'a',
      'b',
    ]);
  });

  it('lists contacts with defaults', () => {
    contactAPI.get(1);
    expect(axios.get).toHaveBeenCalledWith(url, {
      params: { include_contact_inboxes: false, page: 1, sort: 'name' },
      signal: undefined,
    });
  });

  it('shows and updates a contact without contact inboxes', () => {
    contactAPI.show(3);
    expect(axios.get).toHaveBeenCalledWith(
      `${url}/3?include_contact_inboxes=false`
    );
    contactAPI.update(3, { name: 'Jo' });
    expect(axios.patch).toHaveBeenCalledWith(
      `${url}/3?include_contact_inboxes=false`,
      { name: 'Jo' }
    );
  });

  it('lists conversations, filtered by inbox and conversation when given', () => {
    contactAPI.getConversations(3);
    expect(axios.get).toHaveBeenCalledWith(`${url}/3/conversations`, {
      params: {},
    });
    contactAPI.getConversations(3, { inboxId: 4, conversationId: 5 });
    expect(axios.get).toHaveBeenLastCalledWith(`${url}/3/conversations`, {
      params: { inbox_id: 4, conversation_id: 5 },
    });
  });

  it('lists attachments, page 1 by default', () => {
    contactAPI.getAttachments(3);
    expect(axios.get).toHaveBeenCalledWith(`${url}/3/attachments`, {
      params: { page: 1 },
    });
  });

  it('lists contactable inboxes and labels', () => {
    contactAPI.getContactableInboxes(3);
    expect(axios.get).toHaveBeenCalledWith(`${url}/3/contactable_inboxes`);
    contactAPI.getContactLabels(3);
    expect(axios.get).toHaveBeenCalledWith(`${url}/3/labels`);
  });

  it('starts a call, without a conversation by default', () => {
    contactAPI.initiateCall(3, 4);
    expect(axios.post).toHaveBeenCalledWith(`${url}/3/call`, {
      inbox_id: 4,
      conversation_id: null,
    });
  });

  it('updates labels', () => {
    contactAPI.updateContactLabels(3, ['vip']);
    expect(axios.post).toHaveBeenCalledWith(`${url}/3/labels`, {
      labels: ['vip'],
    });
  });

  it('searches with defaults and with options', () => {
    contactAPI.search();
    expect(axios.get).toHaveBeenCalledWith(`${url}/search`, {
      params: { include_contact_inboxes: false, page: 1, sort: 'name' },
      signal: undefined,
    });
    contactAPI.search('jo', 2, 'email', 'vip', { signal });
    expect(axios.get).toHaveBeenLastCalledWith(`${url}/search`, {
      params: {
        include_contact_inboxes: false,
        page: 2,
        sort: 'email',
        q: 'jo',
        labels: ['vip'],
      },
      signal,
    });
  });

  it('lists active contacts', () => {
    contactAPI.active();
    expect(axios.get).toHaveBeenCalledWith(`${url}/active`, {
      params: { include_contact_inboxes: false, page: 1, sort: 'name' },
    });
  });

  it('filters contacts', () => {
    contactAPI.filter(undefined, undefined, { payload: [] });
    expect(axios.post).toHaveBeenCalledWith(
      `${url}/filter`,
      { payload: [] },
      {
        params: { include_contact_inboxes: false, page: 1, sort: 'name' },
        signal: undefined,
      }
    );
  });

  it('imports a CSV file as multipart form data', () => {
    const file = new File(['name'], 'contacts.csv');
    contactAPI.importContacts(file);
    const [path, body, config] = axios.post.mock.calls.at(-1);
    expect(path).toBe(`${url}/import`);
    expect(body.get('import_file')).toBeInstanceOf(File);
    expect(config).toEqual({
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  });

  it('deletes custom attributes and the avatar', () => {
    contactAPI.destroyCustomAttributes(3, ['tier']);
    expect(axios.post).toHaveBeenCalledWith(
      `${url}/3/destroy_custom_attributes`,
      { custom_attributes: ['tier'] }
    );
    contactAPI.destroyAvatar(3);
    expect(axios.delete).toHaveBeenCalledWith(`${url}/3/avatar`);
  });

  it('exports contacts', () => {
    contactAPI.exportContacts({ label: 'vip' });
    expect(axios.post).toHaveBeenCalledWith(`${url}/export`, { label: 'vip' });
  });
});
