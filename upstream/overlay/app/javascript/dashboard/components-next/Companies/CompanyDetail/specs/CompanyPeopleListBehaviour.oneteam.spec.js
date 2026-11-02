/**
 * OneTeam behaviour spec for the people (contacts) list on a company.
 *
 * Covers loading the page named in the URL and keeping the URL in sync,
 * searching (debounced, trimmed, back to page one), the loading, empty
 * and no-match states, contact names with fallbacks, the email, phone
 * and location details (with a flag), opening a contact, paging, and
 * removing a contact (stepping back a page when the last one on a page
 * goes, refetching search results, and the success and error alerts).
 */
import { nextTick, reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import CompanyPeopleList from '../CompanyPeopleList.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
  useRouter: () => env.router,
}));
vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  useDebounceFn: fn => fn,
}));
vi.mock('dashboard/composables/useAccount', async () => {
  const { computed } = await import('vue');
  return { useAccount: () => ({ accountId: computed(() => 1) }) };
});
vi.mock('dashboard/stores/companies', () => ({
  useCompaniesStore: () => env.store,
}));

const Button = {
  name: 'Button',
  props: ['disabled', 'icon'],
  emits: ['click'],
  template:
    '<button class="unlink" :disabled="disabled" @click="$emit(\'click\')" />',
};
const PaginationFooter = {
  name: 'PaginationFooter',
  props: ['currentPage', 'totalItems', 'itemsPerPage'],
  emits: ['update:currentPage'],
  template: '<div class="pages" />',
};

const contacts = [
  {
    id: 1,
    name: 'Ann',
    email: 'ann@acme.io',
    phoneNumber: '+1555',
    additionalAttributes: { city: 'Pune', country: 'India', countryCode: 'IN' },
  },
  { id: 2, email: 'bob@acme.io' },
  { id: 3, additionalAttributes: { country: 'Peru' } },
  { id: 4, name: 'Dee' },
];

const mountList = (query = '') =>
  mount(CompanyPeopleList, {
    props: { company: { id: 7 }, query },
    global: {
      directives: { tooltip: {} },
      stubs: {
        Button,
        NextButton: Button,
        PaginationFooter,
        Avatar: { props: ['name'], template: '<i class="avatar" />' },
        Flag: {
          props: ['country'],
          template: '<b class="flag">{{ country }}</b>',
        },
        Spinner: { template: '<i class="spinner" />' },
      },
    },
  });

describe('CompanyPeopleList behaviour', () => {
  beforeEach(() => {
    env.route = { query: { page: '2', tab: 'people' } };
    env.router = { replace: vi.fn(), push: vi.fn() };
    env.store = reactive({
      companyContacts: contacts,
      companyContactsMeta: { page: 2, totalCount: 30 },
      getUIFlags: { fetchingContacts: false, removingContact: false },
      getCompanyContacts: vi.fn().mockResolvedValue(),
      removeContactFromCompany: vi.fn().mockResolvedValue(),
    });
  });

  it('loads the page from the URL and lists contacts', async () => {
    const wrapper = mountList();
    expect(env.store.getCompanyContacts).toHaveBeenCalledWith(7, 2, undefined);
    expect(env.router.replace).toHaveBeenCalledWith({
      query: { page: '2', tab: 'people', q: undefined },
    });
    const names = wrapper.findAll('button[type="button"]').map(b => b.text());
    expect(names).toEqual([
      'Ann',
      'bob@acme.io',
      'COMPANIES.DETAIL.CONTACTS.UNNAMED_CONTACT',
      'Dee',
    ]);
    expect(wrapper.findAll('[title]').map(s => s.attributes('title'))).toEqual([
      'ann@acme.io',
      '+1555',
      'Pune, India',
      'bob@acme.io',
      'Peru',
    ]);
    expect(wrapper.findAll('.flag').map(f => f.text())).toEqual(['IN']);

    await wrapper.find('button[type="button"]').trigger('click');
    expect(env.router.push).toHaveBeenCalledWith({
      name: 'contacts_edit',
      params: { accountId: 1, contactId: 1 },
    });

    const pages = wrapper.findComponent(PaginationFooter);
    expect(pages.props()).toEqual({
      currentPage: 2,
      totalItems: 30,
      itemsPerPage: 25,
    });
    await pages.vm.$emit('update:currentPage', 1);
    expect(env.store.getCompanyContacts).toHaveBeenLastCalledWith(
      7,
      1,
      undefined
    );
    expect(env.router.replace).toHaveBeenLastCalledWith({
      query: { page: undefined, tab: 'people', q: undefined },
    });
  });

  it('searches from page one', async () => {
    env.route.query = {};
    env.store.companyContactsMeta = {};
    const wrapper = mountList();
    expect(env.store.getCompanyContacts).toHaveBeenCalledWith(7, 1, undefined);
    expect(wrapper.findComponent(PaginationFooter).exists()).toBe(false);
    env.store.companyContactsMeta = { totalCount: 40 };
    await nextTick();
    expect(wrapper.findComponent(PaginationFooter).props('currentPage')).toBe(
      1
    );
    await wrapper.setProps({ query: '  ann ' });
    expect(env.store.getCompanyContacts).toHaveBeenLastCalledWith(7, 1, 'ann');
    expect(env.router.replace).toHaveBeenLastCalledWith({
      query: { page: undefined, q: 'ann' },
    });
  });

  it('shows loading, empty and no-match states', async () => {
    env.store.companyContacts = [];
    env.store.getUIFlags.fetchingContacts = true;
    const wrapper = mountList();
    expect(wrapper.find('.spinner').exists()).toBe(true);
    env.store.getUIFlags.fetchingContacts = false;
    await nextTick();
    expect(wrapper.text()).toContain('COMPANIES.DETAIL.PEOPLE.EMPTY');
    await wrapper.setProps({ query: 'zed' });
    expect(wrapper.text()).toContain('COMPANIES.DETAIL.PEOPLE.NO_MATCHES');
  });

  it('removes a contact and steps back from an emptied page', async () => {
    env.store.companyContacts = [contacts[0]];
    const wrapper = mountList();
    await wrapper.find('.unlink').trigger('click');
    await flushPromises();
    expect(env.store.removeContactFromCompany).toHaveBeenCalledWith(7, 1, 1);
    expect(env.store.getCompanyContacts).toHaveBeenCalledTimes(1);
    expect(useAlert).toHaveBeenCalledWith(
      'COMPANIES.DETAIL.CONTACTS.MESSAGES.REMOVE_SUCCESS'
    );

    env.store.getUIFlags.removingContact = true;
    await nextTick();
    expect(wrapper.find('.unlink').attributes('disabled')).toBeDefined();
  });

  it('refetches search results after removing and reports failures', async () => {
    const wrapper = mountList('ann');
    await wrapper.findAll('.unlink')[1].trigger('click');
    await flushPromises();
    expect(env.store.removeContactFromCompany).toHaveBeenCalledWith(7, 2, 2);
    expect(env.store.getCompanyContacts).toHaveBeenLastCalledWith(7, 2, 'ann');

    env.store.removeContactFromCompany.mockRejectedValueOnce(new Error('no'));
    await wrapper.find('.unlink').trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'COMPANIES.DETAIL.CONTACTS.MESSAGES.REMOVE_ERROR'
    );
  });
});
