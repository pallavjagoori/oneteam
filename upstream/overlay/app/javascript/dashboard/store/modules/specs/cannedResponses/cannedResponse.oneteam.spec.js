import CannedResponseAPI from 'dashboard/api/cannedResponse';
import cannedResponse from '../../cannedResponse';
import { apiError, buildStore } from '../../../specs/oneteamStore';

/*
 * OneTeam coverage for the canned responses Vuex module, run as a real
 * store: cache revalidation, sorting and every action's error path.
 */
vi.mock('dashboard/api/cannedResponse', () => ({
  default: Object.fromEntries(
    [
      'validateCacheKey',
      'refetchAndCommit',
      'get',
      'create',
      'update',
      'delete',
    ].map(name => [name, vi.fn()])
  ),
}));

describe('canned responses store (OneTeam)', () => {
  let store;
  const flags = () => store.getters.getUIFlags;

  beforeEach(() => {
    store = buildStore({ cannedResponse });
  });

  afterEach(() => vi.clearAllMocks());

  it('refetches responses when the cache key is stale', async () => {
    CannedResponseAPI.validateCacheKey.mockResolvedValueOnce(false);
    CannedResponseAPI.refetchAndCommit.mockResolvedValueOnce({
      data: [{ id: 1, short_code: 'hi' }],
    });
    await store.dispatch('revalidateCannedResponses', { newKey: 'k' });
    expect(store.getters.getCannedResponses).toHaveLength(1);

    CannedResponseAPI.validateCacheKey.mockResolvedValueOnce(true);
    await store.dispatch('revalidateCannedResponses', { newKey: 'k' });
    CannedResponseAPI.validateCacheKey.mockRejectedValueOnce(new Error('x'));
    await store.dispatch('revalidateCannedResponses', { newKey: 'k' });
    expect(CannedResponseAPI.refetchAndCommit).toHaveBeenCalledTimes(1);
  });

  it('loads responses, clearing the flag on failure', async () => {
    CannedResponseAPI.get.mockResolvedValueOnce({
      data: [
        { id: 1, short_code: 'b' },
        { id: 2, short_code: 'a' },
      ],
    });
    await store.dispatch('getCannedResponse');
    expect(
      store.getters.getSortedCannedResponses('asc').map(r => r.id)
    ).toEqual([2, 1]);
    expect(
      store.getters.getSortedCannedResponses('desc').map(r => r.id)
    ).toEqual([1, 2]);

    CannedResponseAPI.get.mockRejectedValueOnce(new Error('x'));
    await store.dispatch('getCannedResponse');
    expect(flags().fetchingList).toBe(false);
  });

  it('creates, updates and deletes responses', async () => {
    CannedResponseAPI.create.mockResolvedValue({
      data: { id: 1, short_code: 'a' },
    });
    await expect(
      store.dispatch('createCannedResponse', { short_code: 'a' })
    ).resolves.toEqual({ id: 1, short_code: 'a' });

    CannedResponseAPI.update.mockResolvedValue({
      data: { id: 1, short_code: 'b' },
    });
    await store.dispatch('updateCannedResponse', { id: 1, short_code: 'b' });
    expect(CannedResponseAPI.update).toHaveBeenCalledWith(1, {
      short_code: 'b',
    });
    expect(store.getters.getCannedResponses[0].short_code).toBe('b');

    CannedResponseAPI.delete.mockResolvedValue({});
    await expect(store.dispatch('deleteCannedResponse', 1)).resolves.toBe(1);
    expect(store.getters.getCannedResponses).toEqual([]);
  });

  // Chatwoot quirk (see FINDINGS.md): deleting never clears `deletingItem`.
  it('leaves the deleting flag on after a delete', async () => {
    CannedResponseAPI.delete.mockResolvedValue({});
    await store.dispatch('deleteCannedResponse', 1);
    expect(flags().deletingItem).toBe(true);
  });

  it.each([
    ['createCannedResponse', 'create', {}, 'creatingItem', false],
    ['updateCannedResponse', 'update', { id: 1 }, 'updatingItem', false],
    ['deleteCannedResponse', 'delete', 1, 'deletingItem', true],
  ])('%s reports a failure', async (action, method, payload, flag, after) => {
    CannedResponseAPI[method].mockRejectedValue(apiError('Taken'));
    await expect(store.dispatch(action, payload)).rejects.toThrow('Taken');
    expect(flags()[flag]).toBe(after);
  });
});
