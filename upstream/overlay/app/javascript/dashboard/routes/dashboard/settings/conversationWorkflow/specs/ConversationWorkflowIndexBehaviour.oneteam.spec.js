/**
 * OneTeam behaviour spec for the conversation workflow settings page.
 *
 * Covers showing auto resolve, translation and required attributes
 * according to the account's feature flags and translation plan.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import ConversationWorkflowIndex from '../index.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return {
    useMapGetter: () =>
      computed(() => (accountId, flag) => {
        env.calls.push(accountId);
        return env.flags.includes(flag);
      }),
  };
});
vi.mock('dashboard/composables/useAccount', async () => {
  const { ref: makeRef } = await import('vue');
  return { useAccount: () => ({ accountId: makeRef(4) }) };
});
vi.mock('dashboard/composables/useTranslationPlan', () => ({
  useTranslationPlan: () => env.plan,
}));

/**
 * Mounts the page.
 *
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountPage = () =>
  mount(ConversationWorkflowIndex, {
    global: {
      mocks: { $t: key => key },
      stubs: {
        SettingsLayout: {
          template: '<div><slot name="header" /><slot name="body" /></div>',
        },
        BaseSettingsHeader: true,
        AutoResolve: { template: '<div class="auto" />' },
        Translation: { template: '<div class="translation" />' },
        ConversationRequiredAttributes: {
          name: 'ConversationRequiredAttributes',
          props: { isEnabled: Boolean },
          template: '<div />',
        },
      },
    },
  });

describe('conversation workflow settings', () => {
  beforeEach(() => {
    env.calls = [];
  });

  it('shows every section when the features are on', () => {
    env.flags = [
      'auto_resolve_conversations',
      'conversation_required_attributes',
    ];
    env.plan = { isAvailable: ref(true), needsUpgrade: ref(false) };
    const wrapper = mountPage();
    expect(wrapper.find('.auto').exists()).toBe(true);
    expect(wrapper.find('.translation').exists()).toBe(true);
    expect(
      wrapper
        .findComponent({ name: 'ConversationRequiredAttributes' })
        .props('isEnabled')
    ).toBe(true);
    expect(env.calls).toEqual([4, 4]);
  });

  it('shows translation for an upgrade and hides the rest', () => {
    env.flags = [];
    env.plan = { isAvailable: ref(false), needsUpgrade: ref(true) };
    const wrapper = mountPage();
    expect(wrapper.find('.auto').exists()).toBe(false);
    expect(wrapper.find('.translation').exists()).toBe(true);
    expect(
      wrapper
        .findComponent({ name: 'ConversationRequiredAttributes' })
        .props('isEnabled')
    ).toBe(false);

    env.plan = { isAvailable: ref(false), needsUpgrade: ref(false) };
    expect(mountPage().find('.translation').exists()).toBe(false);
  });
});
