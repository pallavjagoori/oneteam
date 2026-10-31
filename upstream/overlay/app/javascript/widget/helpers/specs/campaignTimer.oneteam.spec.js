/**
 * OneTeam specs for campaign timers: each campaign starts after the visitor
 * has spent its "time on page", and new timers replace old ones.
 */
import campaignTimer from '../campaignTimer';
import store from '../../store';

vi.mock('../../store', () => ({ default: { dispatch: vi.fn() } }));

describe('campaign timers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts each campaign after its time on page', () => {
    campaignTimer.initTimers(
      {
        campaigns: [
          { id: 1, timeOnPage: 5 },
          { id: 2, timeOnPage: 10 },
        ],
      },
      'web-1'
    );

    vi.advanceTimersByTime(5000);
    expect(store.dispatch).toHaveBeenCalledWith('campaign/startCampaign', {
      campaignId: 1,
      websiteToken: 'web-1',
    });
    expect(store.dispatch).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5000);
    expect(store.dispatch).toHaveBeenCalledTimes(2);
  });

  it('cancels pending campaigns when timers are set again', () => {
    campaignTimer.initTimers(
      { campaigns: [{ id: 3, timeOnPage: 5 }] },
      'web-1'
    );
    campaignTimer.initTimers({ campaigns: [] }, 'web-1');

    vi.advanceTimersByTime(10000);

    expect(store.dispatch).not.toHaveBeenCalled();
  });
});
