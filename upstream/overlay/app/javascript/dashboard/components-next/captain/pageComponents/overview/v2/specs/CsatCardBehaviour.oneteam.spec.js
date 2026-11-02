/**
 * OneTeam behaviour spec for the Captain overview's CSAT card.
 *
 * Covers the autonomous and assisted scores (one decimal, or a dash when
 * missing), their trends (signed, zero, or none) and whether the trend
 * is good, the comparison with human-only conversations, and passing
 * the loading state on.
 */
import { mount } from '@vue/test-utils';
import CsatCard from '../CsatCard.vue';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key, args) => (args ? `${key} ${args.value}` : key),
  }),
}));

const MetricCard = {
  name: 'MetricCard',
  props: [
    'label',
    'hint',
    'value',
    'trend',
    'trendGood',
    'trendUp',
    'description',
    'valueClass',
    'layout',
    'loading',
  ],
  template: '<div class="metric" />',
};

const mountCard = props =>
  mount(CsatCard, {
    props,
    global: {
      stubs: {
        MetricCard,
        OverviewPanel: {
          props: ['title', 'borderClass', 'shadow'],
          template: '<section :data-title="title"><slot /></section>',
        },
      },
    },
  });

const metrics = wrapper =>
  wrapper.findAllComponents(MetricCard).map(m => m.props());

describe('CsatCard behaviour', () => {
  it('shows scores, trends and the comparison with humans', () => {
    const wrapper = mountCard({
      autonomous: { current: 4.25, trend: 0.5 },
      assisted: { current: 3.5, trend: -0.25 },
      humanOnly: { current: 4 },
      loading: true,
    });
    expect(wrapper.find('section').attributes('data-title')).toBe(
      'CAPTAIN.OVERVIEW.V2.CSAT.TITLE'
    );
    const [autonomous, assisted] = metrics(wrapper);
    expect(autonomous).toEqual(
      expect.objectContaining({
        label: 'CAPTAIN.OVERVIEW.V2.CSAT.AUTONOMOUS',
        hint: 'CAPTAIN.OVERVIEW.V2.CSAT.AUTONOMOUS_HINT',
        value: '4.3',
        trend: '+0.5',
        trendGood: true,
        trendUp: true,
        description: 'CAPTAIN.OVERVIEW.V2.CSAT.VS_HUMANS +0.3',
        valueClass: 'text-n-blue-11',
        layout: 'spread',
        loading: true,
      })
    );
    expect(assisted).toEqual(
      expect.objectContaining({
        label: 'CAPTAIN.OVERVIEW.V2.CSAT.ASSISTED',
        value: '3.5',
        trend: '-0.3',
        trendGood: false,
        trendUp: false,
        description: 'CAPTAIN.OVERVIEW.V2.CSAT.VS_HUMANS -0.5',
      })
    );
  });

  it('handles flat trends and equal scores', () => {
    const [autonomous] = metrics(
      mountCard({
        autonomous: { current: 4, trend: 0 },
        humanOnly: { current: 4 },
      })
    );
    expect(autonomous).toEqual(
      expect.objectContaining({
        trend: '0',
        trendGood: null,
        trendUp: null,
        description: 'CAPTAIN.OVERVIEW.V2.CSAT.VS_HUMANS 0',
      })
    );
  });

  it('shows dashes without data', () => {
    const [autonomous, assisted] = metrics(
      mountCard({ autonomous: { current: 4 } })
    );
    expect(autonomous).toEqual(
      expect.objectContaining({
        value: '4.0',
        trend: '',
        trendGood: null,
        description: '',
      })
    );
    expect(assisted).toEqual(
      expect.objectContaining({ value: '—', trend: '', description: '' })
    );
  });
});
