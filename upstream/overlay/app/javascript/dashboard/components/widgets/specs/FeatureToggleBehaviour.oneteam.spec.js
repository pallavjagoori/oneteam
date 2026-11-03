/**
 * OneTeam behaviour spec for the feature flag gate.
 *
 * Covers showing content only when the account has the feature.
 */
import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import FeatureToggle from '../FeatureToggle.vue';

/**
 * Mounts the gate for an account with the given features.
 *
 * @param {string[]} enabled Enabled feature keys.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountGate = enabled => {
  const store = createStore({
    getters: {
      getCurrentAccountId: () => 3,
      'accounts/isFeatureEnabledonAccount': () => (accountId, key) =>
        accountId === 3 && enabled.includes(key),
    },
  });
  return mount(FeatureToggle, {
    props: { featureKey: 'macros' },
    slots: { default: '<p class="content">Macros</p>' },
    global: { plugins: [store] },
  });
};

describe('FeatureToggle behaviour', () => {
  it('shows content for enabled features only', () => {
    expect(mountGate(['macros']).find('.content').exists()).toBe(true);
    expect(mountGate([]).find('.content').exists()).toBe(false);
  });
});
