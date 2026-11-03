/**
 * OneTeam behaviour spec for a company row in the companies list.
 *
 * Covers the name (with an unnamed fallback), description, the detail
 * chips (domain, industry, employees, location with or without a flag,
 * contacts), last activity with its exact-time tooltip, and opening the
 * company.
 */
import { mount } from '@vue/test-utils';
import CompaniesCard from '../CompaniesCard.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({
    t: (key, args) => (args ? `${key}:${Object.values(args)[0]}` : key),
  }),
}));
vi.mock('shared/helpers/timeHelper', async importOriginal => ({
  ...(await importOriginal()),
  dynamicTime: time => `ago:${time}`,
}));
vi.mock('shared/composables/useExactTimestamp', () => ({
  useExactTimestamp: () => time => `exact:${time}`,
}));

const Avatar = { name: 'Avatar', props: ['name', 'src'], template: '<i />' };
const Flag = { name: 'Flag', props: ['country'], template: '<i />' };
const Icon = { name: 'Icon', props: ['icon'], template: '<i />' };

/**
 * Mounts the card, capturing tooltip values.
 *
 * @param {object} props Card props.
 * @returns {{ wrapper: import('@vue/test-utils').VueWrapper, tip: { value?: object } }}
 *   The wrapper and the last tooltip value.
 */
const mountCard = props => {
  const tip = {};
  const wrapper = mount(CompaniesCard, {
    props: { id: 5, ...props },
    global: {
      stubs: { Avatar, Flag, Icon },
      directives: {
        tooltip: (el, binding) => {
          tip.value = binding.value;
        },
      },
    },
  });
  return { wrapper, tip };
};

describe('CompaniesCard behaviour', () => {
  it('shows every detail and opens the company', async () => {
    const { wrapper, tip } = mountCard({
      name: 'Acme',
      domain: 'acme.test',
      contactsCount: 3,
      description: 'Rockets',
      lastActivityAt: 1700000000,
      additionalAttributes: {
        industry: 'Aerospace',
        employee_count: 50,
        city: 'Paris',
        country_code: 'FR',
      },
    });
    expect(wrapper.getComponent(Avatar).props('name')).toBe('Acme');
    expect(wrapper.text()).toContain('Rockets');
    const chips = wrapper.findAll('[title]').map(s => s.attributes('title'));
    expect(chips).toEqual([
      'acme.test',
      'Aerospace',
      'COMPANIES.CARD.EMPLOYEES:50',
      'Paris, FR',
      'COMPANIES.CONTACTS_COUNT:3',
    ]);
    expect(wrapper.getComponent(Flag).props('country')).toBe('FR');
    expect(wrapper.findAllComponents(Icon)).toHaveLength(4);
    expect(wrapper.text()).toContain('ago:1700000000');
    expect(tip.value.content).toBe('exact:1700000000');
    await wrapper.trigger('click');
    expect(wrapper.emitted('showCompany')).toEqual([[5]]);
  });

  it('falls back for an unnamed company without details', () => {
    const { wrapper } = mountCard({ contactsCount: null });
    expect(wrapper.text()).toContain('COMPANIES.UNNAMED');
    expect(wrapper.find('[title]').exists()).toBe(false);
    expect(wrapper.find('p').exists()).toBe(false);
    expect(wrapper.find('.flex-shrink-0').exists()).toBe(false);
    expect(wrapper.vm.formattedLastActivityAt).toBe('');
    expect(CompaniesCard.props.additionalAttributes.default()).toEqual({});
  });

  it('shows a location without a flag or icon', () => {
    const { wrapper } = mountCard({
      additionalAttributes: { country: 'France' },
    });
    expect(wrapper.get('[title]').attributes('title')).toBe('France');
    expect(wrapper.findComponent(Flag).exists()).toBe(false);
    expect(wrapper.findComponent(Icon).exists()).toBe(false);
  });
});
