/**
 * OneTeam spec for createContactSearcher error handling.
 *
 * Aborted or cancelled searches resolve to null so callers can ignore
 * them, while any other API failure is rethrown to the caller.
 */
import ContactAPI from 'dashboard/api/contacts';
import { createContactSearcher } from '../composeConversationHelper';

vi.mock('dashboard/api/contacts', () => ({ default: { search: vi.fn() } }));

describe('createContactSearcher errors', () => {
  it('returns null for cancelled requests', async () => {
    ContactAPI.search.mockRejectedValueOnce({ name: 'CanceledError' });
    await expect(createContactSearcher()('alice')).resolves.toBeNull();
  });

  it('rethrows other failures', async () => {
    const failure = new Error('server down');
    ContactAPI.search.mockRejectedValueOnce(failure);
    await expect(createContactSearcher()('alice')).rejects.toBe(failure);
  });
});
