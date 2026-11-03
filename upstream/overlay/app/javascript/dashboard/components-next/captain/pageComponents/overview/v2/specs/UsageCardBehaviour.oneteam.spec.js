/**
 * OneTeam behaviour spec for the Captain overview UsageCard.
 *
 * Covers meter values and percentages, empty limits, the buy button for
 * cloud admins, and the refresh and buy events.
 */
import { mount } from '@vue/test-utils';
import UsageCard from '../UsageCard.vue';

const env = vi.hoisted(() => ({ cloud: true, admin: true }));

vi.mock('dashboard/composables/useAccount', async () => {
  const { ref: vueRef } = await import('vue');
  return { useAccount: () => ({ isOnChatwootCloud: vueRef(env.cloud) }) };
});

vi.mock('dashboard/composables/useAdmin', async () => {
  const { ref: vueRef } = await import('vue');
  return { useAdmin: () => ({ isAdmin: vueRef(env.admin) }) };
});

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key, params) => (params ? `${key}:${JSON.stringify(params)}` : key),
  }),
}));

const MetricStub = {
  name: 'ProgressMetric',
  props: ['label', 'used', 'total', 'usageLabel', 'valueLabel', 'loading'],
  template: '<div class="metric" />',
};

const ButtonStub = {
  name: 'NextButton',
  props: { label: String },
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};

/**
 * Mounts the usage card.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountCard = props =>
  mount(UsageCard, {
    props,
    global: {
      mocks: { $t: key => key },
      stubs: {
        Button: ButtonStub,
        ProgressMetric: MetricStub,
        OverviewPanel: {
          template: '<section><slot name="actions" /><slot /></section>',
        },
      },
    },
  });

describe('UsageCard behaviour', () => {
  beforeEach(() => {
    env.cloud = true;
    env.admin = true;
  });

  it('computes meter values and percentages', () => {
    const wrapper = mountCard({
      responseLimits: { consumed: 25, totalCount: 200 },
      documentLimits: { consumed: 1, totalCount: 3 },
      loading: true,
    });
    const [responses, documents] = wrapper.findAllComponents(MetricStub);
    expect(responses.props()).toMatchObject({
      used: 25,
      total: 200,
      loading: true,
    });
    expect(responses.props('usageLabel')).toContain('"percentage":"12.5"');
    expect(documents.props('usageLabel')).toContain('"percentage":"33.3"');
    expect(documents.props('valueLabel')).toContain('"used":"1"');
  });

  it('shows zero usage without limits', () => {
    const [responses] = mountCard({}).findAllComponents(MetricStub);
    expect(responses.props()).toMatchObject({ used: 0, total: 0 });
    expect(responses.props('usageLabel')).toContain('"percentage":"0"');
  });

  it('treats missing consumption as zero', () => {
    const [responses] = mountCard({
      responseLimits: { totalCount: 10 },
    }).findAllComponents(MetricStub);
    expect(responses.props('usageLabel')).toContain('"percentage":"0"');
  });

  it('emits refresh and buy for cloud admins', async () => {
    const wrapper = mountCard({});
    const buttons = wrapper.findAll('button');
    expect(buttons).toHaveLength(2);
    await buttons[0].trigger('click');
    await buttons[1].trigger('click');
    expect(wrapper.emitted('refresh')).toHaveLength(1);
    expect(wrapper.emitted('buy')).toHaveLength(1);
  });

  it('hides the buy button off cloud', () => {
    env.cloud = false;
    expect(mountCard({}).findAll('button')).toHaveLength(1);
  });
});
