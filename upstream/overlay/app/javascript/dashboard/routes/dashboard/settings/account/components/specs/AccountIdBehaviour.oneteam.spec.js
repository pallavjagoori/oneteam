/**
 * OneTeam behaviour spec for the account ID settings section.
 *
 * Covers showing the current account ID as a copyable code block, and
 * no ID before the account loads.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import AccountId from '../AccountId.vue';

const account = vi.hoisted(() => ({ current: null }));

vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({ currentAccount: account.current }),
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const WootCode = { name: 'WootCode', props: ['script'], template: '<pre />' };
const SectionLayout = {
  name: 'SectionLayout',
  props: ['title'],
  template: '<section><slot /></section>',
};

/**
 * Mounts the section.
 *
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountSection = () =>
  mount(AccountId, { global: { stubs: { WootCode, SectionLayout } } });

describe('AccountId behaviour', () => {
  it('shows the account ID', () => {
    account.current = ref({ id: 42 });
    const wrapper = mountSection();
    expect(wrapper.getComponent(SectionLayout).props('title')).toBe(
      'GENERAL_SETTINGS.FORM.ACCOUNT_ID.TITLE'
    );
    expect(wrapper.getComponent(WootCode).props('script')).toBe('42');
  });

  it('shows nothing before the account loads', () => {
    account.current = ref(null);
    expect(
      mountSection().getComponent(WootCode).props('script')
    ).toBeUndefined();
  });
});
