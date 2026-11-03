/**
 * OneTeam behaviour spec for the integrations settings index page.
 *
 * Covers fetching on mount, listing every integration, filtering by the
 * search query and the no-results message.
 */
import { computed } from 'vue';
import { mount } from '@vue/test-utils';
import IntegrationsIndex from '../Index.vue';

const store = vi.hoisted(() => ({ dispatch: vi.fn() }));

const integrations = [
  { id: 'slack', name: 'Slack', description: 'Chat', enabled: true },
  { id: 'linear', name: 'Linear', description: 'Issues', enabled: false },
];

vi.mock('dashboard/composables/store', () => ({
  useStore: () => store,
  useStoreGetters: () => ({
    'integrations/getUIFlags': { isFetching: false },
    'integrations/getAppIntegrations': computed(() => integrations),
  }),
}));

vi.mock('shared/composables/useBranding', () => ({
  useBranding: () => ({ replaceInstallationName: text => text }),
}));

const HeaderStub = {
  name: 'BaseSettingsHeader',
  props: { searchQuery: String },
  emits: ['update:searchQuery'],
  template: '<div />',
};
const ItemStub = {
  name: 'IntegrationItem',
  props: ['id', 'name'],
  template: '<div class="item">{{ name }}</div>',
};

/**
 * Mounts the page.
 *
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountPage = () =>
  mount(IntegrationsIndex, {
    global: {
      mocks: { $t: key => key },
      stubs: {
        SettingsLayout: {
          template: '<div><slot name="header" /><slot name="body" /></div>',
        },
        BaseSettingsHeader: HeaderStub,
        IntegrationItem: ItemStub,
      },
    },
  });

describe('Integrations index behaviour', () => {
  it('fetches and lists all integrations', () => {
    const wrapper = mountPage();
    expect(store.dispatch).toHaveBeenCalledWith('integrations/get');
    expect(wrapper.findAll('.item').map(i => i.text())).toEqual([
      'Slack',
      'Linear',
    ]);
  });

  it('filters by the search query', async () => {
    const wrapper = mountPage();
    wrapper.findComponent(HeaderStub).vm.$emit('update:searchQuery', ' lin ');
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('.item').map(i => i.text())).toEqual(['Linear']);
  });

  it('shows no results for an unmatched query', async () => {
    const wrapper = mountPage();
    wrapper.findComponent(HeaderStub).vm.$emit('update:searchQuery', 'zzzz');
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('INTEGRATION_SETTINGS.NO_RESULTS');
  });
});
