/**
 * OneTeam branch spec for the report drilldown composable.
 *
 * Covers error and abort handling, retrying an errored request, missing
 * meta and payload, loading more pages, the load more guards, and stale
 * responses after close.
 */
import { useReportDrilldown } from '../useReportDrilldown';
import ReportsAPI from 'dashboard/api/reports';

vi.mock('dashboard/api/reports', () => ({
  default: { getDrilldown: vi.fn() },
}));

/**
 * Builds a drilldown response envelope.
 *
 * @param {object} meta pagination meta
 * @param {Array} payload records
 * @returns {{data: object}}
 */
const page = (meta, payload) => ({ data: { meta, payload } });

describe('useReportDrilldown branches', () => {
  it('uses the reports API by default', async () => {
    ReportsAPI.getDrilldown.mockResolvedValue(page(undefined, undefined));
    const drilldown = useReportDrilldown();
    await drilldown.open({ metric: 'a' });
    expect(ReportsAPI.getDrilldown).toHaveBeenCalledWith(
      expect.objectContaining({ metric: 'a', page: 1 })
    );
    expect(drilldown.meta.value).toEqual({});
    expect(drilldown.records.value).toEqual([]);
    expect(drilldown.hasMore.value).toBe(false);
    expect(drilldown.hasRecords.value).toBe(false);
  });

  it('skips fetching for an empty request', async () => {
    const fetcher = vi.fn();
    await useReportDrilldown(fetcher).open(null);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('flags errors, retries the same request, and ignores aborts', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('down'));
    const drilldown = useReportDrilldown(fetcher);
    await drilldown.open({ metric: 'a' });
    expect(drilldown.hasError.value).toBe(true);
    fetcher.mockResolvedValueOnce(page({ total_count: 1 }, [{ id: 1 }]));
    await drilldown.open({ metric: 'a' });
    expect(drilldown.hasError.value).toBe(false);
    await drilldown.open({ metric: 'a' });
    expect(fetcher).toHaveBeenCalledTimes(2);
    await [
      { name: 'AbortError' },
      { name: 'CanceledError' },
      { code: 'ERR_CANCELED' },
    ].reduce(async (previous, error) => {
      await previous;
      fetcher.mockRejectedValueOnce(error);
      await drilldown.open({ metric: error.name || error.code });
      expect(drilldown.hasError.value).toBe(false);
    }, Promise.resolve());
  });

  it('loads more pages and guards against extra loads', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(page({ total_count: 3 }, [{ id: 1 }]))
      .mockResolvedValueOnce(
        page({ total_count: 3, current_page: 2 }, undefined)
      )
      .mockResolvedValueOnce(
        page({ total_count: 3, current_page: 3 }, [{ id: 2 }, { id: 3 }])
      );
    const drilldown = useReportDrilldown(fetcher);
    drilldown.loadMore();
    expect(fetcher).not.toHaveBeenCalled();
    const opening = drilldown.open({ metric: 'b' });
    drilldown.loadMore();
    await opening;
    expect(fetcher).toHaveBeenCalledTimes(1);
    drilldown.loadMore();
    expect(drilldown.isFetchingMore.value).toBe(true);
    drilldown.loadMore();
    await vi.waitFor(() => expect(drilldown.isFetchingMore.value).toBe(false));
    expect(fetcher.mock.calls[1][0].page).toBe(2);
    drilldown.loadMore();
    await vi.waitFor(() => expect(drilldown.records.value).toHaveLength(3));
    expect(fetcher.mock.calls[2][0].page).toBe(3);
    drilldown.loadMore();
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('drops responses and errors that arrive after close', async () => {
    let reject;
    const fetcher = vi.fn(
      () =>
        new Promise((_, rejectFn) => {
          reject = rejectFn;
        })
    );
    const drilldown = useReportDrilldown(fetcher);
    const opening = drilldown.open({ metric: 'c' });
    drilldown.close();
    reject(new Error('late'));
    await opening;
    expect(drilldown.hasError.value).toBe(false);
  });
});
