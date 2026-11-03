/**
 * OneTeam behaviour spec for the company facts grid.
 *
 * Covers loading attribute definitions on mount, the profile facts
 * (industry, size, location with flag, added date) and their "unknown"
 * fallbacks, custom attribute facts (checkbox, date and text values,
 * skipping empty ones), and padding the grid to full rows.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import CompanyFacts from '../CompanyFacts.vue';

const dispatch = vi.fn();
const attributes = ref([]);

vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch }),
  useMapGetter: () => attributes,
}));
vi.mock('shared/helpers/timeHelper', () => ({
  dateFormat: time => `date:${time}`,
}));

const mountFacts = company =>
  mount(CompanyFacts, {
    props: { company },
    global: {
      stubs: { Flag: { props: ['country'], template: '<b>{{ country }}</b>' } },
    },
  });
const values = wrapper => wrapper.findAll('dd').map(dd => dd.text());

describe('CompanyFacts behaviour', () => {
  it('shows profile and custom facts', () => {
    attributes.value = [
      {
        attributeKey: 'paid',
        attributeDisplayName: 'Paid',
        attributeDisplayType: 'checkbox',
      },
      {
        attributeKey: 'trial',
        attributeDisplayName: 'Trial',
        attributeDisplayType: 'checkbox',
      },
      {
        attributeKey: 'renewal',
        attributeDisplayName: 'Renewal',
        attributeDisplayType: 'date',
      },
      {
        attributeKey: 'tier',
        attributeDisplayName: 'Tier',
        attributeDisplayType: 'text',
      },
      {
        attributeKey: 'empty',
        attributeDisplayName: 'Empty',
        attributeDisplayType: 'text',
      },
    ];
    const wrapper = mountFacts({
      createdAt: 100,
      additionalAttributes: {
        industry: 'Retail',
        employee_count: 50,
        city: 'Pune',
        country: 'India',
        country_code: 'IN',
      },
      customAttributes: {
        paid: true,
        trial: false,
        renewal: '1970-01-02T00:00:00Z',
        tier: 3,
        empty: '',
      },
    });
    expect(dispatch).toHaveBeenCalledWith('attributes/get');
    expect(values(wrapper)).toEqual([
      'Retail',
      '50',
      'INPune, IN',
      'date:100',
      'COMPANIES.DETAIL.FACTS.YES',
      'COMPANIES.DETAIL.FACTS.NO',
      'date:86400',
      '3',
    ]);
    expect(wrapper.find('dd span[title]').attributes('title')).toBe(
      'Pune, India'
    );
    expect(wrapper.findAll('dl > div')).toHaveLength(8);
  });

  it('falls back to unknown and pads the grid', () => {
    attributes.value = null;
    const wrapper = mountFacts({
      additionalAttributes: { country_code: 'IN' },
    });
    expect(values(wrapper)).toEqual(
      Array(4).fill('COMPANIES.DETAIL.FACTS.UNKNOWN')
    );
    expect(wrapper.find('b').exists()).toBe(false);
    expect(wrapper.find('dd').classes()).toContain('text-n-slate-9');

    attributes.value = [
      {
        attributeKey: 'tier',
        attributeDisplayName: 'Tier',
        attributeDisplayType: 'text',
      },
    ];
    const padded = mountFacts({ customAttributes: { tier: 'Gold' } });
    expect(padded.findAll('dl > div')).toHaveLength(8);
  });
});
