/**
 * OneTeam behaviour spec for the Captain custom tools empty state.
 *
 * Covers the add-new action and the feature spotlight actions that only
 * show on Chatwoot Cloud.
 */
import { mount } from '@vue/test-utils';
import CustomToolsPageEmptyState from '../CustomToolsPageEmptyState.vue';

const env = vi.hoisted(() => ({ cloud: true }));

vi.mock('dashboard/composables/useAccount', async () => {
  const { computed } = await import('vue');
  return {
    useAccount: () => ({ isOnChatwootCloud: computed(() => env.cloud) }),
  };
});

const EmptyStateLayout = {
  name: 'EmptyStateLayout',
  props: ['title', 'actionPerms'],
  template:
    '<div><slot name="empty-state-item" /><slot name="actions" /></div>',
};
const Button = {
  name: 'NextButton',
  props: ['label'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')" />',
};
const FeatureSpotlight = {
  name: 'FeatureSpotlight',
  props: { hideActions: Boolean, learnMoreUrl: String },
  template: '<div />',
};

/**
 * Mounts the empty state.
 *
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountState = () =>
  mount(CustomToolsPageEmptyState, {
    global: {
      stubs: { EmptyStateLayout, Button, FeatureSpotlight },
      mocks: { $t: key => key },
    },
  });

describe('CustomToolsPageEmptyState behaviour', () => {
  it('adds a tool and shows spotlight actions on cloud', async () => {
    env.cloud = true;
    const wrapper = mountState();
    expect(wrapper.getComponent(FeatureSpotlight).props()).toMatchObject({
      hideActions: false,
      learnMoreUrl: 'https://chwt.app/hc/captain-tools',
    });
    expect(wrapper.getComponent(EmptyStateLayout).props('actionPerms')).toEqual(
      ['administrator']
    );
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);
  });

  it('hides spotlight actions off cloud', () => {
    env.cloud = false;
    expect(
      mountState().getComponent(FeatureSpotlight).props('hideActions')
    ).toBe(true);
  });
});
