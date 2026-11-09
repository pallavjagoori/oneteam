/**
 * OneTeam spec for useAccountEnrichment's late enrichment handling.
 *
 * When the account enters the enrichment step after mount, the timeout
 * starts and later fills the form; enrichment data that arrives later
 * only fills fields that are still empty.
 */
import { defineComponent, h, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { useAccountEnrichment } from '../useAccountEnrichment';

const env = vi.hoisted(() => ({ account: null }));

vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({ currentAccount: env.account }),
}));
vi.mock('dashboard/composables/useConfig', () => ({
  useConfig: () => ({ enabledLanguages: [{ iso_639_1_code: 'en' }] }),
}));

const mountWithFields = () => {
  const fields = {
    locale: ref(''),
    website: ref(''),
    timezone: ref(''),
    companySize: ref(''),
    industry: ref(''),
    referralSource: ref(''),
  };
  let api;
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useAccountEnrichment(fields);
        return () => h('div');
      },
    })
  );
  return { wrapper, fields, api };
};

describe('useAccountEnrichment late data', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    env.account = ref({ locale: 'en', custom_attributes: {} });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts the timeout when enrichment begins after mount', async () => {
    const { wrapper, api } = mountWithFields();
    expect(api.isEnriching.value).toBe(false);
    env.account.value = {
      locale: 'en',
      custom_attributes: { onboarding_step: 'enrichment' },
    };
    await nextTick();
    expect(api.isEnriching.value).toBe(true);
    vi.advanceTimersByTime(30000);
    expect(api.isEnriching.value).toBe(false);
    wrapper.unmount();
  });

  it('fills empty fields when enrichment data arrives later', async () => {
    const { wrapper, fields, api } = mountWithFields();
    fields.industry.value = 'Retail';
    env.account.value = {
      locale: 'en',
      custom_attributes: {
        brand_info: {
          domain: 'acme.test',
          industries: [{ industry: 'Software' }],
        },
      },
    };
    await nextTick();
    expect(fields.website.value).toBe('acme.test');
    expect(fields.industry.value).toBe('Retail');
    expect(api.getChangedFields()).toEqual([]);
    fields.website.value = 'other.test';
    expect(api.getChangedFields()).toEqual(['website']);
    wrapper.unmount();
  });
});
