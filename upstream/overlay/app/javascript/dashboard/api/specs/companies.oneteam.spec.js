import companyAPI from '../companies';
import { useAxiosMock } from './oneteamAxiosMock';

describe('CompanyAPI (OneTeam)', () => {
  const axios = useAxiosMock();
  const url = '/api/v1/accounts/1/companies';

  it('lists companies on page 1 sorted by name by default', () => {
    companyAPI.get();
    expect(axios.get).toHaveBeenCalledWith(`${url}?page=1&sort=name`);
  });

  it('searches with defaults', () => {
    companyAPI.search();
    expect(axios.get).toHaveBeenCalledWith(`${url}/search?q=&page=1&sort=name`);
  });

  it('lists contacts, leaving out an empty query', () => {
    companyAPI.listContacts(2);
    expect(axios.get).toHaveBeenCalledWith(`${url}/2/contacts?page=1`);
    companyAPI.listContacts(2, 3, 'jane');
    expect(axios.get).toHaveBeenLastCalledWith(
      `${url}/2/contacts?page=3&q=jane`
    );
  });

  it('lists notes', () => {
    companyAPI.listNotes(2);
    expect(axios.get).toHaveBeenCalledWith(`${url}/2/notes?page=1`);
    companyAPI.listNotes(2, 2, 'call');
    expect(axios.get).toHaveBeenLastCalledWith(`${url}/2/notes?page=2&q=call`);
  });

  it('lists conversations', () => {
    companyAPI.listConversations(2);
    expect(axios.get).toHaveBeenCalledWith(`${url}/2/conversations?page=1`);
    companyAPI.listConversations(2, 4);
    expect(axios.get).toHaveBeenLastCalledWith(`${url}/2/conversations?page=4`);
  });

  it('filters conversations', () => {
    companyAPI.filterConversations(2, [{ attribute_key: 'status' }]);
    expect(axios.post).toHaveBeenCalledWith(`${url}/2/conversations/filter`, {
      payload: [{ attribute_key: 'status' }],
      page: 1,
    });
  });

  it('searches contacts, keeping an empty query', () => {
    companyAPI.searchContacts(2);
    expect(axios.get).toHaveBeenCalledWith(
      `${url}/2/contacts/search?q=&page=1`
    );
    companyAPI.searchContacts(2, 'jo', 2);
    expect(axios.get).toHaveBeenLastCalledWith(
      `${url}/2/contacts/search?q=jo&page=2`
    );
  });

  it('creates and removes contacts', () => {
    companyAPI.createContact(2, { name: 'Jo' });
    expect(axios.post).toHaveBeenCalledWith(`${url}/2/contacts`, {
      name: 'Jo',
    });
    companyAPI.removeContact(2, 9);
    expect(axios.delete).toHaveBeenCalledWith(`${url}/2/contacts/9`);
  });

  it('deletes custom attributes', () => {
    companyAPI.destroyCustomAttributes(2, ['tier']);
    expect(axios.post).toHaveBeenCalledWith(
      `${url}/2/destroy_custom_attributes`,
      { custom_attributes: ['tier'] }
    );
  });

  it('requests enrichment', () => {
    companyAPI.enrich(2);
    expect(axios.post).toHaveBeenCalledWith(`${url}/2/enrichment`);
  });

  it('deletes the avatar', () => {
    companyAPI.destroyAvatar(2);
    expect(axios.delete).toHaveBeenCalledWith(`${url}/2/avatar`);
  });
});
