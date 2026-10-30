import contactNotesAPI from '../contactNotes';
import { useAxiosMock } from './oneteamAxiosMock';

describe('ContactNotes API (OneTeam)', () => {
  const axios = useAxiosMock();
  const url = '/api/v1/accounts/1/contacts/7/notes';

  it('lists the notes of a contact', () => {
    contactNotesAPI.get(7);
    expect(axios.get).toHaveBeenCalledWith(url);
  });

  it('adds a note to a contact', () => {
    contactNotesAPI.create(7, 'Called back');
    expect(axios.post).toHaveBeenCalledWith(url, { content: 'Called back' });
  });

  it('deletes a note of a contact', () => {
    contactNotesAPI.delete(7, 3);
    expect(axios.delete).toHaveBeenCalledWith(`${url}/3`);
  });
});
