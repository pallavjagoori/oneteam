/**
 * OneTeam behaviour spec for the Captain assistants page.
 *
 * Covers the loading state, the know more popover on and off Chatwoot
 * Cloud, the paywall and empty state slots, opening the create dialog
 * from the header and the empty state, closing it, and opening the new
 * assistant's responses after creating (or staying when no id returns).
 */
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import AssistantsIndex from '../Index.vue';

const env = vi.hoisted(() => ({ cloud: true, push: vi.fn(), log: [] }));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => ({
    push: env.push,
    currentRoute: { value: { params: { accountId: 4 } } },
  }),
}));
vi.mock('dashboard/composables/store', async () => {
  const { ref } = await import('vue');
  return { useMapGetter: () => ref({ fetchingList: true }) };
});
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({ isOnChatwootCloud: env.cloud }),
}));

const PageLayout = {
  name: 'PageLayout',
  props: ['isFetching'],
  emits: ['click'],
  template:
    '<div><slot name="knowMore" /><slot name="emptyState" /><slot name="paywall" /><slot /></div>',
};
const Dialog = {
  name: 'CreateAssistantDialog',
  props: ['type'],
  emits: ['close', 'created'],
  setup: () => ({ dialogRef: { open: () => env.log.push('open') } }),
  template: '<dialog />',
};
const Spotlight = {
  name: 'FeatureSpotlightPopover',
  props: ['hideActions'],
  template: '<aside />',
};
const EmptyState = {
  name: 'AssistantPageEmptyState',
  emits: ['click'],
  template: '<section />',
};

const mountPage = () =>
  mount(AssistantsIndex, {
    global: {
      stubs: {
        PageLayout,
        CreateAssistantDialog: Dialog,
        FeatureSpotlightPopover: Spotlight,
        AssistantPageEmptyState: EmptyState,
        CaptainPaywall: { template: '<b class="paywall" />' },
      },
    },
  });

describe('Captain assistants page behaviour', () => {
  beforeEach(() => {
    env.cloud = true;
    env.push = vi.fn();
    env.log = [];
  });

  it('renders the layout slots', () => {
    const wrapper = mountPage();
    expect(wrapper.findComponent(PageLayout).props('isFetching')).toBe(true);
    expect(wrapper.findComponent(Spotlight).props('hideActions')).toBe(false);
    expect(wrapper.find('.paywall').exists()).toBe(true);
    env.cloud = false;
    expect(mountPage().findComponent(Spotlight).props('hideActions')).toBe(
      true
    );
  });

  it('creates an assistant and opens it', async () => {
    const wrapper = mountPage();
    expect(wrapper.findComponent(Dialog).exists()).toBe(false);
    await wrapper.findComponent(PageLayout).vm.$emit('click');
    await nextTick();
    expect(env.log).toEqual(['open']);
    const dialog = wrapper.findComponent(Dialog);
    expect(dialog.props('type')).toBe('create');

    await dialog.vm.$emit('created', {});
    expect(env.push).not.toHaveBeenCalled();
    await dialog.vm.$emit('created', { id: 6 });
    expect(env.push).toHaveBeenCalledWith({
      name: 'captain_assistants_responses_index',
      params: { accountId: 4, assistantId: 6 },
    });
    await dialog.vm.$emit('close');
    expect(wrapper.findComponent(Dialog).exists()).toBe(false);

    await wrapper.findComponent(EmptyState).vm.$emit('click');
    await nextTick();
    expect(env.log).toEqual(['open', 'open']);
  });
});
