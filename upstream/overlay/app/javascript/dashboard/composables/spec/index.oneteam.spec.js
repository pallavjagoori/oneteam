import analyticsHelper from 'dashboard/helper/AnalyticsHelper/index';
import { useTrack } from '../index';

/*
 * OneTeam coverage for useTrack's promise that a broken analytics client
 * never breaks the feature that tracked the event.
 */
vi.mock('dashboard/helper/AnalyticsHelper/index', () => ({
  default: { track: vi.fn() },
}));

describe('useTrack (OneTeam)', () => {
  it('returns null when the analytics client throws', () => {
    analyticsHelper.track.mockImplementation(() => {
      throw new Error('blocked by an ad blocker');
    });
    expect(useTrack('Event')).toBeNull();
  });
});
