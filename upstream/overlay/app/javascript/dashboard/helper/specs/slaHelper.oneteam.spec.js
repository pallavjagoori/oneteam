import { evaluateSLAStatus, shouldRefreshSLAStatus } from '../slaHelper';

const NOW = 1_000_000;

describe('slaHelper (OneTeam)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW * 1000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not refresh without an SLA or a conversation', () => {
    expect(shouldRefreshSLAStatus({})).toBe(false);
  });

  it('accepts null events and ignores unknown or empty ones', () => {
    expect(
      evaluateSLAStatus({
        appliedSla: { sla_rt_due_at: NOW + 7200 },
        chat: { status: 'open' },
        slaEvents: null,
      })
    ).toMatchObject({ type: 'RT', threshold: '2h', isSlaMissed: false });

    expect(
      evaluateSLAStatus({
        appliedSla: { sla_rt_due_at: NOW + 7200 },
        chat: { status: 'open' },
        slaEvents: [{ event_type: 'other' }, {}, { event_type: 'nrt' }],
      })
    ).toMatchObject({ type: 'RT', isSlaMissed: false });
  });

  it('uses the event time when no due time is known for its type', () => {
    expect(
      evaluateSLAStatus({
        appliedSla: {},
        chat: { status: 'open' },
        slaEvents: [{ event_type: 'rt', created_at: NOW - 120 }],
      })
    ).toEqual({
      type: 'RT',
      threshold: '2m',
      icon: 'flame',
      isSlaMissed: true,
    });
  });

  it('reads first reply times given as numeric or date strings', () => {
    const sla = { sla_frt_due_at: NOW + 600 };
    expect(
      evaluateSLAStatus({
        appliedSla: sla,
        chat: { status: 'open', first_reply_created_at: String(NOW) },
      }).type
    ).toBe('');
    expect(
      evaluateSLAStatus({
        appliedSla: sla,
        chat: {
          status: 'open',
          first_reply_created_at: new Date(NOW * 1000).toISOString(),
        },
      }).type
    ).toBe('');
    // An unparseable time is kept as it is; comparing it to the due time is
    // false, so the first reply counts as made.
    expect(
      evaluateSLAStatus({
        appliedSla: sla,
        chat: { status: 'open', first_reply_created_at: 'soon' },
      }).type
    ).toBe('');
  });

  it('shows misses without a timer when a completed SLA has no completion time', () => {
    expect(
      evaluateSLAStatus({
        appliedSla: { sla_status: 'missed' },
        chat: { status: 'resolved' },
        slaEvents: [
          { event_type: 'nrt', created_at: NOW - 100 },
          { event_type: 'nrt', created_at: NOW - 50 },
        ],
      })
    ).toEqual({ type: 'NRT', threshold: '', icon: 'flame', isSlaMissed: true });
  });

  it('puts misses before upcoming deadlines, whatever the order', () => {
    expect(
      evaluateSLAStatus({
        appliedSla: { sla_rt_due_at: NOW + 60 },
        chat: { status: 'open' },
        slaEvents: [
          { event_type: 'nrt', created_at: NOW - 7200 },
          { event_type: 'nrt', created_at: NOW - 3600 },
        ],
      })
    ).toMatchObject({ type: 'NRT', threshold: '1h', isSlaMissed: true });
  });

  it('puts a later miss before an earlier upcoming deadline', () => {
    expect(
      evaluateSLAStatus({
        appliedSla: { sla_frt_due_at: NOW + 60, sla_rt_due_at: NOW - 60 },
        chat: { status: 'open' },
      })
    ).toMatchObject({ type: 'RT', isSlaMissed: true });
  });
});
