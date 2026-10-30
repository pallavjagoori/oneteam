import { createPinia, setActivePinia } from 'pinia';
import { createStore } from '../storeFactory';
import { apiError } from './oneteamStore';

/*
 * OneTeam coverage for Pinia stores built by the store factory: the error
 * path of each CRUD helper, updates for records that are not loaded, and
 * meta defaults.
 */
const API = {
  get: vi.fn(),
  show: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};
const useThings = createStore({ name: 'OneTeamThings', type: 'pinia', API });

describe('Pinia store factory (OneTeam)', () => {
  let store;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useThings();
  });

  afterEach(() => vi.clearAllMocks());

  it.each([
    ['show', 1, 'fetchingItem'],
    ['create', { name: 'x' }, 'creatingItem'],
    ['update', { id: 1, name: 'x' }, 'updatingItem'],
    ['delete', 1, 'deletingItem'],
  ])(
    '%s reports a failure and clears its flag',
    async (action, payload, flag) => {
      API[action].mockRejectedValue(apiError('Nope'));
      await expect(store[action](payload)).rejects.toThrow('Nope');
      expect(store.uiFlags[flag]).toBe(false);
    }
  );

  it('returns an updated record that is not loaded without adding it', async () => {
    API.update.mockResolvedValue({ data: { id: 9, name: 'x' } });
    await expect(store.update({ id: 9, name: 'x' })).resolves.toEqual({
      id: 9,
      name: 'x',
    });
    expect(store.records).toEqual([]);
  });

  it('defaults meta counts and page', () => {
    store.setMeta({});
    expect(store.meta).toMatchObject({ totalCount: 0, page: 1 });
    store.setMeta({ totalCount: '4', page: '2' });
    expect(store.meta).toMatchObject({ totalCount: 4, page: 2 });
  });
});
