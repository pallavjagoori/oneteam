import { setActivePinia, createPinia } from 'pinia';
import CallsAPI from 'dashboard/api/calls';
import { useCallHistoryStore } from '../callHistory';

vi.mock('dashboard/api/calls', () => ({ default: { get: vi.fn() } }));

describe('callHistory store (OneTeam)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('ignores the error of a fetch that a newer fetch replaced', async () => {
    let rejectFirst;
    CallsAPI.get
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectFirst = reject;
          })
      )
      .mockResolvedValueOnce({
        data: { payload: [{ id: 2 }], meta: { count: 1 } },
      });
    const store = useCallHistoryStore();

    const first = store.fetchCalls({ page: 1 });
    await store.fetchCalls({ page: 2 });
    rejectFirst(new Error('timeout'));

    await expect(first).resolves.toEqual([{ id: 2 }]);
    expect(store.records).toEqual([{ id: 2 }]);
  });
});
