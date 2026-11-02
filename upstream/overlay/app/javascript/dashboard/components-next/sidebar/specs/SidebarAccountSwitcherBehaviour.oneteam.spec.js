/**
 * OneTeam behaviour spec for the account switcher at the top of the
 * sidebar.
 *
 * Covers the expanded trigger (account name, only opening when the user
 * has more than one account), the collapsed logo trigger, the sorted
 * account list with roles (custom or built-in) and a tick on the current
 * account, switching accounts, and the "new account" button when the
 * installation allows it.
 */
import { reactive } from 'vue';
import { mount } from '@vue/test-utils';
import SidebarAccountSwitcher from '../SidebarAccountSwitcher.vue';

const env = vi.hoisted(() => ({ toggle: null }));

vi.mock('dashboard/composables/useAccount', async () => {
  const { computed } = await import('vue');
  return {
    useAccount: () => ({
      accountId: computed(() => env.state.accountId),
      currentAccount: computed(() => env.state.currentAccount),
    }),
  };
});
vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return { useMapGetter: name => computed(() => env.state[name]) };
});

const DropdownContainer = {
  name: 'DropdownContainer',
  setup: () => ({ toggle: (...args) => env.toggle(...args) }),
  template:
    '<div><slot name="trigger" :toggle="toggle" :is-open="true" /><slot /></div>',
};
const passthrough = name => ({
  name,
  props: ['title'],
  emits: ['click'],
  template: `<div class="${name}" @click="$emit('click')"><slot /><slot name="label" /></div>`,
});
const ButtonNext = {
  name: 'Button',
  emits: ['click'],
  template: '<button class="new" @click="$emit(\'click\')"><slot /></button>',
};

const accounts = [
  { id: 2, name: 'Zeta', role: 'agent' },
  { id: 1, name: 'Acme', role: 'administrator' },
  { id: 3, name: 'Beta', custom_role_id: 9, custom_role: { name: 'Lead' } },
];

const mountSwitcher = (isCollapsed = false) =>
  mount(SidebarAccountSwitcher, {
    props: { isCollapsed },
    global: {
      stubs: {
        DropdownContainer,
        DropdownBody: passthrough('DropdownBody'),
        DropdownSection: passthrough('DropdownSection'),
        DropdownItem: passthrough('DropdownItem'),
        Button: ButtonNext,
        NextButton: ButtonNext,
        ButtonNext,
        Logo: { template: '<i class="logo" />' },
        Icon: true,
      },
    },
  });

describe('SidebarAccountSwitcher behaviour', () => {
  const realLocation = window.location;

  beforeEach(() => {
    env.toggle = vi.fn();
    env.state = reactive({
      accountId: 1,
      currentAccount: { name: 'Acme' },
      getCurrentUser: { accounts },
      'globalConfig/get': { createNewAccountFromDashboard: true },
      getUserAccounts: accounts,
    });
    delete window.location;
    window.location = { href: '' };
  });

  afterEach(() => {
    window.location = realLocation;
  });

  it('lists accounts and switches between them', async () => {
    const wrapper = mountSwitcher();
    const trigger = wrapper.find('#sidebar-account-switcher');
    expect(trigger.text()).toBe('Acme');
    expect(trigger.attributes('data-account-id')).toBe('1');
    expect(trigger.classes()).toContain('cursor-pointer');
    expect(trigger.find('.i-lucide-chevron-down').exists()).toBe(true);
    await trigger.trigger('click');
    expect(env.toggle).toHaveBeenCalled();

    const items = wrapper.findAll('[id^="account-"]');
    expect(items.map(i => i.text())).toEqual([
      'Acmeadministrator',
      'BetaLead',
      'Zetaagent',
    ]);
    await items[2].trigger('click');
    expect(window.location.href).toBe('/app/accounts/2/dashboard');

    await wrapper.find('.new').trigger('click');
    expect(wrapper.emitted('showCreateAccountModal')).toHaveLength(1);
  });

  it('does not open with a single account', async () => {
    env.state.getUserAccounts = [accounts[1]];
    env.state.getCurrentUser = {};
    env.state['globalConfig/get'] = {};
    const wrapper = mountSwitcher();
    const trigger = wrapper.find('#sidebar-account-switcher');
    expect(trigger.classes()).toContain('cursor-default');
    await trigger.trigger('click');
    expect(env.toggle).not.toHaveBeenCalled();
    expect(wrapper.find('.DropdownBody').exists()).toBe(false);
  });

  it('opens from the logo when collapsed', async () => {
    env.state.getUserAccounts = [accounts[1]];
    env.state.getCurrentUser = {};
    env.state['globalConfig/get'] = {};
    const wrapper = mountSwitcher(true);
    const logo = wrapper.find('button[title="Acme"]');
    expect(logo.find('.logo').exists()).toBe(true);
    expect(logo.classes()).toContain('bg-n-alpha-1');
    await logo.trigger('click');
    expect(env.toggle).toHaveBeenCalled();
    expect(wrapper.find('.DropdownBody').exists()).toBe(true);
    expect(wrapper.findAll('[id^="account-"]')).toHaveLength(0);
    expect(wrapper.find('.new').exists()).toBe(false);
  });
});
