/**
 * OneTeam spec for the SLA and CSAT report filter helpers: finding the
 * active filter for a URL value and mapping filter keys to types and back.
 */
import * as sla from '../SLA/helpers/SLAFilterHelpers';
import * as csat from '../Csat/CsatFilterHelpers';

describe('SLA report filters', () => {
  it('finds labels by title and other filters by id', () => {
    const labels = [{ id: 1, title: 'vip' }];
    const agents = [{ id: 2, name: 'Ada' }];
    expect(sla.getActiveFilter(labels, 'labels', 'vip')).toBe(labels[0]);
    expect(sla.getActiveFilter(agents, 'agents', '2')).toBe(agents[0]);
    expect(sla.getActiveFilter(agents, 'agents', 3)).toBeUndefined();
  });

  it('maps filter keys to types and back', () => {
    expect(sla.getFilterType('sla_policy_id', 'keyToType')).toBe('sla');
    expect(sla.getFilterType('labels', 'typeToKey')).toBe('label_list');
    expect(sla.getFilterType('unknown', 'keyToType')).toBeUndefined();
  });
});

describe('CSAT report filters', () => {
  it('finds the active filter by id', () => {
    const ratings = [{ id: 5, name: '😍' }];
    expect(csat.getActiveFilter(ratings, 'ratings', '5')).toBe(ratings[0]);
  });

  it('maps filter keys to types and back', () => {
    expect(csat.getFilterType('user_ids', 'keyToType')).toBe('agents');
    expect(csat.getFilterType('ratings', 'typeToKey')).toBe('rating');
  });
});
