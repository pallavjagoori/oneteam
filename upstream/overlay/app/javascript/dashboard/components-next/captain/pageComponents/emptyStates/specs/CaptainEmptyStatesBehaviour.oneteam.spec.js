/**
 * OneTeam behaviour spec for the Captain empty-state pages.
 *
 * Covers the assistant, document, FAQ (response) and inbox empty states:
 * up to five sample cards, the "add new" action, and the feature
 * spotlight actions that only show on Chatwoot Cloud.
 */
import { mount } from '@vue/test-utils';
import AssistantPageEmptyState from '../AssistantPageEmptyState.vue';
import DocumentPageEmptyState from '../DocumentPageEmptyState.vue';
import ResponsePageEmptyState from '../ResponsePageEmptyState.vue';
import InboxPageEmptyState from '../InboxPageEmptyState.vue';

const env = vi.hoisted(() => ({ cloud: true }));

vi.mock('dashboard/composables/useAccount', async () => {
  const { computed } = await import('vue');
  return {
    useAccount: () => ({ isOnChatwootCloud: computed(() => env.cloud) }),
  };
});
vi.mock('shared/composables/useBranding', () => ({
  useBranding: () => ({ replaceInstallationName: text => `[${text}]` }),
}));

const EmptyStateLayout = {
  name: 'EmptyStateLayout',
  props: ['title'],
  template:
    '<div><slot name="empty-state-item" /><slot name="actions" /></div>',
};
const Button = {
  name: 'NextButton',
  props: ['label'],
  emits: ['click'],
  template: '<button class="add" @click="$emit(\'click\')" />',
};
const FeatureSpotlight = {
  name: 'FeatureSpotlight',
  props: { hideActions: Boolean, title: String },
  template: '<section />',
};
const Card = { props: ['id'], template: '<article class="card" />' };

/**
 * Mounts an empty state with stubbed layout, cards and spotlight.
 *
 * @param {object} component Empty-state component.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountState = component =>
  mount(component, {
    global: {
      stubs: {
        EmptyStateLayout,
        Button,
        FeatureSpotlight,
        AssistantCard: Card,
        DocumentCard: Card,
        ResponseCard: Card,
        InboxCard: Card,
      },
      mocks: { $t: key => key },
    },
  });

describe('Captain empty states behaviour', () => {
  beforeEach(() => {
    env.cloud = true;
  });

  it.each([
    ['assistants', AssistantPageEmptyState],
    ['documents', DocumentPageEmptyState],
    ['responses', ResponsePageEmptyState],
    ['inboxes', InboxPageEmptyState],
  ])('lists sample %s and emits add-new', async (_name, component) => {
    const wrapper = mountState(component);
    const cards = wrapper.findAll('.card');
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.length).toBeLessThanOrEqual(5);
    await wrapper.get('.add').trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);
  });

  it.each([
    AssistantPageEmptyState,
    DocumentPageEmptyState,
    ResponsePageEmptyState,
  ])('hides spotlight actions off Chatwoot Cloud (%#)', component => {
    expect(
      mountState(component).getComponent(FeatureSpotlight).props('hideActions')
    ).toBe(false);
    env.cloud = false;
    expect(
      mountState(component).getComponent(FeatureSpotlight).props('hideActions')
    ).toBe(true);
  });
});
