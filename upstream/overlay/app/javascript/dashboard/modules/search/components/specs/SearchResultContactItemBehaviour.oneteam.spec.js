/**
 * OneTeam behaviour spec for a contact row in search results.
 *
 * Covers the link to the contact, the name and avatar, the "updated"
 * time with its exact-time tooltip, email and phone with separators, and
 * the location from a country name or code (with or without a city),
 * hidden for unknown countries.
 */
import { mount } from '@vue/test-utils';
import SearchResultContactItem from '../SearchResultContactItem.vue';

vi.mock('shared/helpers/timeHelper', () => ({
  dynamicTime: time => `t${time}`,
}));
vi.mock('shared/composables/useExactTimestamp', () => ({
  useExactTimestamp: () => time => `exact${time}`,
}));

const tooltips = [];
const RouterLink = {
  name: 'RouterLink',
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
};
const Avatar = { name: 'Avatar', props: ['name', 'src'], template: '<i />' };
const Flag = {
  name: 'Flag',
  props: ['country'],
  template: '<b class="flag">{{ country }}</b>',
};

const mountItem = props =>
  mount(SearchResultContactItem, {
    props,
    global: {
      stubs: { RouterLink, Avatar, Flag, CardLayout: false },
      directives: {
        tooltip: {
          mounted: (el, binding) => tooltips.push(binding.value.content),
        },
      },
    },
  });

const separators = wrapper => wrapper.findAll('div.w-px').length;
const location = wrapper => wrapper.find('.flag + span');

describe('SearchResultContactItem behaviour', () => {
  it('shows every detail of a contact', () => {
    const wrapper = mountItem({
      id: 4,
      accountId: 2,
      name: 'Ann',
      thumbnail: 'a.png',
      email: 'ann@acme.io',
      phone: '+1555',
      updatedAt: 100,
      additionalAttributes: { country: 'IN', city: 'Pune' },
    });
    expect(wrapper.find('a').attributes('href')).toBe(
      '/app/accounts/2/contacts/4'
    );
    expect(wrapper.find('h5').text()).toBe('Ann');
    expect(wrapper.findComponent(Avatar).props()).toEqual({
      name: 'Ann',
      src: 'a.png',
    });
    expect(wrapper.text()).toContain('SEARCH.UPDATED_AT');
    expect(tooltips).toContain('exact100');
    expect(wrapper.find('[title="ann@acme.io"]').exists()).toBe(true);
    expect(wrapper.find('[title="+1555"]').exists()).toBe(true);
    expect(separators(wrapper)).toBe(2);
    expect(wrapper.find('.flag').text()).toBe('IN');
    expect(location(wrapper).text()).toBe('Pune, India');
  });

  it('finds the country by code and leaves out the city', () => {
    const wrapper = mountItem({
      phone: '+1555',
      additionalAttributes: { countryCode: 'DE' },
    });
    expect(wrapper.text()).not.toContain('SEARCH.UPDATED_AT');
    expect(separators(wrapper)).toBe(1);
    expect(location(wrapper).text()).toBe('Germany');
  });

  it('hides the location without a known country', () => {
    const unknown = mountItem({
      email: 'a@b.c',
      additionalAttributes: { country: 'Atlantis' },
    });
    expect(unknown.find('.flag').exists()).toBe(false);
    expect(separators(unknown)).toBe(0);
    expect(unknown.vm.formattedLocation).toBe('');

    const none = mountItem({ additionalAttributes: { city: 'Pune' } });
    expect(none.find('.flag').exists()).toBe(false);

    const onlyLocation = mountItem({ additionalAttributes: { country: 'IN' } });
    expect(separators(onlyLocation)).toBe(0);
    expect(location(onlyLocation).text()).toBe('India');
  });
});
