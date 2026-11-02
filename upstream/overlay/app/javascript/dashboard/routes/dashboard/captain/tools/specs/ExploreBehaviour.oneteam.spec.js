/**
 * OneTeam behaviour spec for the Captain toolset catalog (Explore) page.
 *
 * Covers loading the catalog once access resolves (with Chatwoot's own
 * toolsets first), the loading, error and empty states, the category
 * pills, install badges from the assistant's installed toolsets (update,
 * installed or none, with case-folded owner and repository), reloading
 * badges when the assistant changes, opening a toolset's details,
 * installing it and returning to the tools list afterwards.
 */
import { reactive, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import ToolsManifestAPI from 'dashboard/api/captain/toolsManifest';
import { fetchToolsCatalog } from 'dashboard/api/captain/toolsCatalog';
import Explore from '../Explore.vue';

const env = vi.hoisted(() => ({
  route: null,
  push: vi.fn(),
  paywall: null,
  log: [],
}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
  useRouter: () => ({ push: env.push }),
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => ref({ captainToolsCatalogURL: 'https://catalog' }),
}));
vi.mock('dashboard/composables/usePolicy', () => ({
  usePolicy: () => ({ shouldShowPaywall: () => env.paywall.value }),
}));
vi.mock('dashboard/api/captain/toolsManifest', () => ({
  default: { installed: vi.fn() },
}));
vi.mock('dashboard/api/captain/toolsCatalog', async importOriginal => ({
  ...(await importOriginal()),
  fetchToolsCatalog: vi.fn(),
}));

const PageLayout = {
  name: 'PageLayout',
  props: ['headerTitle', 'backUrl', 'featureFlag'],
  template:
    '<div><div class="paywall"><slot name="paywall" /></div><slot name="body" /></div>',
};
const Button = {
  name: 'Button',
  props: ['label', 'variant', 'color'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};
const ToolsetCatalogCard = {
  name: 'ToolsetCatalogCard',
  props: ['toolset', 'installStatus'],
  emits: ['click'],
  template: '<div class="card">{{ toolset.name }}</div>',
};
const ToolsetDetailsPanel = {
  name: 'ToolsetDetailsPanel',
  emits: ['install'],
  methods: { open: (...args) => env.log.push(['details', ...args]) },
  template: '<div />',
};
const InstallManifestDialog = {
  name: 'InstallManifestDialog',
  props: ['assistantId'],
  emits: ['installed'],
  methods: { open: source => env.log.push(['install', source]) },
  template: '<div />',
};

const toolsets = [
  {
    name: 'Shop',
    source: 'Acme/Tools/Shop',
    category: 'Commerce',
    author: 'acme',
    version: '1.2.0',
  },
  {
    name: 'Helpdesk',
    source: 'chatwoot/toolsets/Help/Desk',
    category: 'Support',
    author: 'Chatwoot',
    version: '2.0.0',
  },
  {
    name: 'Crm',
    source: 'acme/tools/Crm',
    category: 'Commerce',
    author: null,
    version: '1.0.0',
  },
];

const mountPage = () =>
  mount(Explore, {
    global: {
      stubs: {
        PageLayout,
        Button,
        ToolsetCatalogCard,
        ToolsetDetailsPanel,
        InstallManifestDialog,
        CaptainPaywall: { template: '<b class="locked" />' },
        Spinner: { template: '<i class="spinner" />' },
      },
    },
  });

const cards = wrapper => wrapper.findAllComponents(ToolsetCatalogCard);

describe('Captain tools Explore behaviour', () => {
  beforeEach(() => {
    env.route = reactive({ params: { accountId: 1, assistantId: 7 } });
    env.paywall = ref(false);
    env.log = [];
    env.push.mockClear();
    fetchToolsCatalog.mockReset();
    fetchToolsCatalog.mockResolvedValue({ toolsets });
    ToolsManifestAPI.installed.mockReset();
    ToolsManifestAPI.installed.mockResolvedValue({
      data: [
        { repository: 'acme/tools', path: 'Shop', version: '1.0.0' },
        {
          repository: 'chatwoot/toolsets',
          path: 'Help/Desk',
          version: '3.0.0',
        },
      ],
    });
  });

  it('lists toolsets with Chatwoot first and install badges', async () => {
    const wrapper = mountPage();
    expect(wrapper.find('.spinner').exists()).toBe(true);
    await flushPromises();
    expect(fetchToolsCatalog).toHaveBeenCalledWith('https://catalog', {
      signal: expect.any(AbortSignal),
    });
    expect(ToolsManifestAPI.installed).toHaveBeenCalledWith(
      { assistantId: 7 },
      { signal: expect.any(AbortSignal) }
    );
    expect(cards(wrapper).map(c => c.text())).toEqual([
      'Helpdesk',
      'Shop',
      'Crm',
    ]);
    expect(cards(wrapper).map(c => c.props('installStatus'))).toEqual([
      'installed',
      'update',
      null,
    ]);
    expect(wrapper.findComponent(PageLayout).props('backUrl')).toEqual({
      name: 'captain_tools_index',
      params: { accountId: 1, assistantId: 7 },
    });
  });

  it('filters by category pill', async () => {
    const wrapper = mountPage();
    await flushPromises();
    const pills = () => wrapper.findAllComponents(Button);
    expect(pills().map(p => p.text())).toEqual([
      'CAPTAIN.CUSTOM_TOOLS.CATALOG.ALL',
      'Support',
      'Commerce',
    ]);
    expect(pills()[0].props('variant')).toBe('solid');
    await pills()[2].trigger('click');
    expect(pills()[2].props()).toMatchObject({
      variant: 'solid',
      color: 'blue',
    });
    expect(pills()[0].props('color')).toBe('slate');
    expect(cards(wrapper).map(c => c.text())).toEqual(['Shop', 'Crm']);
    await pills()[0].trigger('click');
    expect(cards(wrapper)).toHaveLength(3);
  });

  it('opens details, installs and returns to the tools list', async () => {
    const wrapper = mountPage();
    await flushPromises();
    await cards(wrapper)[1].vm.$emit('click');
    expect(env.log).toEqual([['details', toolsets[0], 'update']]);
    await wrapper
      .findComponent(ToolsetDetailsPanel)
      .vm.$emit('install', toolsets[0]);
    expect(env.log[1]).toEqual(['install', 'Acme/Tools/Shop']);
    const dialog = wrapper.findComponent(InstallManifestDialog);
    expect(dialog.props('assistantId')).toBe(7);
    await dialog.vm.$emit('installed');
    expect(env.push).toHaveBeenCalledWith({
      name: 'captain_tools_index',
      params: { accountId: 1, assistantId: 7 },
    });
  });

  it('shows the error and empty states', async () => {
    fetchToolsCatalog.mockRejectedValueOnce(new Error('down'));
    const failed = mountPage();
    await flushPromises();
    expect(failed.text()).toContain('CAPTAIN.CUSTOM_TOOLS.CATALOG.LOAD_ERROR');

    fetchToolsCatalog.mockResolvedValueOnce({ toolsets: [] });
    ToolsManifestAPI.installed.mockResolvedValueOnce(undefined);
    const empty = mountPage();
    await flushPromises();
    expect(empty.text()).toContain('CAPTAIN.CUSTOM_TOOLS.CATALOG.EMPTY');
    expect(empty.findAllComponents(Button)).toHaveLength(1);
  });

  it('ignores an empty catalog response', async () => {
    fetchToolsCatalog.mockResolvedValueOnce(undefined);
    const wrapper = mountPage();
    await flushPromises();
    expect(cards(wrapper)).toHaveLength(0);
    expect(wrapper.text()).toContain('CAPTAIN.CUSTOM_TOOLS.CATALOG.EMPTY');
  });

  it('waits for access and reloads badges per assistant', async () => {
    env.paywall.value = true;
    const wrapper = mountPage();
    await flushPromises();
    expect(fetchToolsCatalog).not.toHaveBeenCalled();
    expect(ToolsManifestAPI.installed).not.toHaveBeenCalled();
    expect(wrapper.find('.locked').exists()).toBe(true);

    env.paywall.value = false;
    await flushPromises();
    expect(fetchToolsCatalog).toHaveBeenCalledTimes(1);
    expect(ToolsManifestAPI.installed).toHaveBeenCalledTimes(1);

    ToolsManifestAPI.installed.mockResolvedValueOnce({ data: [] });
    env.route.params.assistantId = 8;
    await flushPromises();
    expect(ToolsManifestAPI.installed).toHaveBeenLastCalledWith(
      { assistantId: 8 },
      { signal: expect.any(AbortSignal) }
    );
    expect(cards(wrapper).map(c => c.props('installStatus'))).toEqual([
      null,
      null,
      null,
    ]);
  });
});
