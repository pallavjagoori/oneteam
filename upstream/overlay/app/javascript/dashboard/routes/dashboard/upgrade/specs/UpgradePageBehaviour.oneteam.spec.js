/**
 * OneTeam behaviour spec for the cloud upgrade (paywall) page.
 *
 * Covers fetching limits on enterprise builds only, when the paywall
 * shows (cloud, past the 15-day trial, a limit exceeded, not bypassed),
 * the message for conversation, inbox and agent limits, the admin
 * billing button versus the non-admin note, and the slot content.
 */
import { computed, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import UpgradePage from '../UpgradePage.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables/store', () => ({
  useStore: () => env.store,
  useMapGetter: () => computed(() => env.cloud),
}));
vi.mock('vue-router', () => ({ useRouter: () => env.router }));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({ accountId: ref(5), currentAccount: env.account }),
}));
vi.mock('dashboard/composables/useConfig', () => ({
  useConfig: () => ({ isEnterprise: env.enterprise }),
}));
vi.mock('dashboard/composables/useAdmin', () => ({
  useAdmin: () => ({ isAdmin: computed(() => env.admin) }),
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({
    t: (key, params) => (params ? `${key}:${params.allowedAgents}` : key),
  }),
}));

const NextButton = {
  name: 'NextButton',
  props: ['label'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};

const ok = { allowed: 10, consumed: 1 };
const over = { allowed: 2, consumed: 3 };
const oldDate = '2020-01-01T00:00:00Z';

const mountPage = async ({
  limits = { conversation: over, non_web_inboxes: ok, agents: ok },
  createdAt = oldDate,
  account,
  cloud = true,
  enterprise = true,
  admin = true,
  bypass = false,
} = {}) => {
  Object.assign(env, {
    cloud,
    enterprise,
    admin,
    store: { dispatch: vi.fn() },
    router: { push: vi.fn() },
    account: ref(
      account === undefined ? { created_at: createdAt, limits } : account
    ),
  });
  const wrapper = mount(UpgradePage, {
    props: { bypassUpgradePage: bypass },
    slots: { default: '<div class="slot">Page</div>' },
    global: { stubs: { NextButton, Icon: true }, mocks: { $t: key => key } },
  });
  await flushPromises();
  return wrapper;
};
const state = wrapper => wrapper.vm.$.setupState;

describe('UpgradePage behaviour', () => {
  it('fetches limits on enterprise builds only', async () => {
    await mountPage();
    expect(env.store.dispatch).toHaveBeenCalledWith('accounts/limits');
    await mountPage({ enterprise: false });
    expect(env.store.dispatch).not.toHaveBeenCalled();
  });

  it('shows the paywall with the billing button for admins', async () => {
    const wrapper = await mountPage();
    expect(wrapper.vm.shouldShowUpgradePage).toBe(true);
    expect(wrapper.text()).toContain(
      'GENERAL_SETTINGS.LIMIT_MESSAGES.CONVERSATION'
    );
    expect(wrapper.find('.slot').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('NON_ADMIN');
    await wrapper.find('button').trigger('click');
    expect(env.router.push).toHaveBeenCalledWith({
      name: 'billing_settings_index',
      params: { accountId: 5 },
    });
  });

  it('tells agents to ask an admin', async () => {
    const wrapper = await mountPage({ admin: false });
    expect(wrapper.find('button').exists()).toBe(false);
    expect(wrapper.text()).toContain(
      'GENERAL_SETTINGS.LIMIT_MESSAGES.NON_ADMIN'
    );
  });

  it('explains inbox and agent limits', async () => {
    const inboxes = await mountPage({
      limits: { conversation: ok, non_web_inboxes: over, agents: ok },
    });
    expect(inboxes.text()).toContain('GENERAL_SETTINGS.LIMIT_MESSAGES.INBOXES');
    const agents = await mountPage({
      limits: { conversation: ok, non_web_inboxes: ok, agents: over },
    });
    expect(agents.text()).toContain('GENERAL_SETTINGS.LIMIT_MESSAGES.AGENTS:2');
  });

  it('stays hidden when bypassed, off cloud, in trial or within limits', async () => {
    const bypassed = await mountPage({ bypass: true });
    expect(bypassed.vm.shouldShowUpgradePage).toBe(false);
    expect(bypassed.vm.isAccountPaywalled).toBe(true);
    expect(bypassed.find('.slot').exists()).toBe(false);

    expect((await mountPage({ cloud: false })).vm.isAccountPaywalled).toBe(
      false
    );
    const trial = await mountPage({ createdAt: new Date().toISOString() });
    expect(trial.vm.isAccountPaywalled).toBe(false);

    const within = await mountPage({
      limits: { conversation: ok, non_web_inboxes: ok, agents: ok },
    });
    expect(within.vm.isAccountPaywalled).toBe(false);
    expect(state(within).limitExceededMessage).toBe('');
  });

  it('treats missing accounts and limits as not paywalled', async () => {
    const noAccount = await mountPage({ account: null });
    expect(noAccount.vm.isAccountPaywalled).toBe(false);
    expect(state(noAccount).limitExceededMessage).toBe('');
    const noLimits = await mountPage({ account: { created_at: oldDate } });
    expect(noLimits.vm.isAccountPaywalled).toBe(false);
    expect(state(noLimits).limitExceededMessage).toBe('');
  });
});
