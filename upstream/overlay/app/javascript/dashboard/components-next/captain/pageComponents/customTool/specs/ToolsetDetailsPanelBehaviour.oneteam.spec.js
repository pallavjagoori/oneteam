/**
 * OneTeam behaviour spec for the Captain toolset details side panel.
 *
 * Covers opening the panel with the toolset header and install badge,
 * loading details (spinner, links, tools, configuration inputs and
 * secrets, readme without images), failed and superseded loads, the
 * install, reinstall and update actions, closing, and aborting on close.
 */
import { mount, flushPromises } from '@vue/test-utils';
import { fetchToolsetDetails } from 'dashboard/api/captain/toolsCatalog';
import ToolsetDetailsPanel from '../ToolsetDetailsPanel.vue';

const env = vi.hoisted(() => ({ log: [] }));

vi.mock('dashboard/api/captain/toolsCatalog', () => ({
  fetchToolsetDetails: vi.fn(),
}));
vi.mock('shared/helpers/timeHelper', () => ({
  dynamicTime: value => `time ${value}`,
}));

const SidePanel = {
  name: 'SidePanel',
  emits: ['close'],
  methods: {
    open: () => env.log.push('open'),
    close: () => env.log.push('close'),
  },
  template:
    '<aside><header><slot name="header" /></header><main><slot /></main><footer><slot name="footer" /></footer></aside>',
};
const Button = {
  name: 'Button',
  props: ['label', 'icon'],
  emits: ['click'],
  template:
    '<button :data-icon="icon" @click="$emit(\'click\')">{{ label }}</button>',
};

const toolset = {
  name: 'Shopify',
  description: 'Orders and refunds',
  category: 'Commerce',
  version: '1.2.0',
  updated_at: '2026-01-01T00:00:00Z',
  detail_url: '/catalog/shopify',
};
const details = {
  repository_url: 'https://repo.example.com',
  manifest_url: 'https://repo.example.com/manifest.json',
  tools: [
    { id: 't1', title: 'Find order', description: 'Looks up orders' },
    { id: 't2', title: 'Refund', description: 'Issues refunds' },
  ],
  inputs: [{ id: 'shop', label: 'Shop domain', required: true }],
  secrets: [{ id: 'token', label: 'Access token' }],
  readme: '# Setup\n\n![logo](logo.png) Install the **app**.',
};

const mountPanel = () =>
  mount(ToolsetDetailsPanel, {
    global: {
      stubs: {
        SidePanel,
        Button,
        Spinner: { template: '<div class="spinner" />' },
        Policy: { template: '<div><slot /></div>' },
        ToolsetIdentity: {
          props: ['toolset'],
          template: '<div class="identity">{{ toolset.name }}<slot /></div>',
        },
        ToolsetInstallBadge: {
          props: ['status'],
          template: '<span class="badge">{{ status }}</span>',
        },
      },
      directives: {
        dompurifyHtml: {
          mounted: (el, b) => {
            el.innerHTML = b.value;
          },
        },
      },
    },
  });
const actionButton = wrapper => wrapper.findAll('footer button')[1];

describe('ToolsetDetailsPanel behaviour', () => {
  beforeEach(() => {
    env.log = [];
  });

  it('renders nothing but the footer before opening', () => {
    const wrapper = mountPanel();
    expect(wrapper.find('.identity').exists()).toBe(false);
    expect(wrapper.find('main').text()).toBe('');
  });

  it('opens, shows a spinner and then the details', async () => {
    let finish;
    fetchToolsetDetails.mockImplementationOnce((url, { signal }) => {
      expect(url).toBe('/catalog/shopify');
      expect(signal).toBeInstanceOf(AbortSignal);
      return new Promise(resolve => {
        finish = resolve;
      });
    });
    const wrapper = mountPanel();
    wrapper.vm.open(toolset);
    await flushPromises();
    expect(env.log).toEqual(['open']);
    expect(wrapper.find('.identity').text()).toBe('Shopify');
    expect(wrapper.find('.badge').exists()).toBe(false);
    expect(wrapper.find('.spinner').exists()).toBe(true);
    expect(wrapper.text()).toContain('Orders and refunds');
    expect(wrapper.text()).toContain('Commerce');
    expect(wrapper.text()).toContain('CAPTAIN.CUSTOM_TOOLS.CATALOG.UPDATED');

    finish(details);
    await flushPromises();
    expect(wrapper.find('.spinner').exists()).toBe(false);
    const links = wrapper.findAll('a').map(a => a.attributes('href'));
    expect(links).toEqual([details.repository_url, details.manifest_url]);
    expect(
      wrapper
        .findAll('main section')[0]
        .findAll('li')
        .map(li => li.text())
    ).toEqual(['Find orderLooks up orders', 'RefundIssues refunds']);
    const config = wrapper.findAll('main section')[1].findAll('li');
    expect(config[0].text()).toContain('Shop domain');
    expect(config[0].text()).toContain('CAPTAIN.CUSTOM_TOOLS.CATALOG.REQUIRED');
    expect(config[0].find('i').classes()).toContain(
      'i-lucide-sliders-horizontal'
    );
    expect(config[1].find('i').classes()).toContain('i-lucide-key-round');
    expect(config[1].text()).not.toContain('REQUIRED');
    const readme = wrapper.find('.prose');
    expect(readme.html()).toContain('<strong>app</strong>');
    expect(readme.find('img').exists()).toBe(false);
  });

  it('hides empty configuration and readme sections', async () => {
    fetchToolsetDetails.mockResolvedValueOnce({
      ...details,
      inputs: undefined,
      secrets: undefined,
      readme: '',
    });
    const wrapper = mountPanel();
    wrapper.vm.open(toolset);
    await flushPromises();
    expect(wrapper.findAll('main section')).toHaveLength(1);
  });

  it('shows an error when loading fails and ignores superseded loads', async () => {
    fetchToolsetDetails.mockRejectedValueOnce(new Error('offline'));
    const wrapper = mountPanel();
    wrapper.vm.open(toolset);
    await flushPromises();
    expect(wrapper.text()).toContain(
      'CAPTAIN.CUSTOM_TOOLS.CATALOG.DETAILS_ERROR'
    );

    fetchToolsetDetails.mockImplementationOnce(
      (url, { signal }) =>
        new Promise((resolve, reject) => {
          signal.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError'))
          );
        })
    );
    wrapper.vm.open(toolset);
    await flushPromises();
    expect(wrapper.text()).not.toContain('DETAILS_ERROR');
    await wrapper.findComponent(SidePanel).vm.$emit('close');
    await flushPromises();
    expect(wrapper.find('.spinner').exists()).toBe(false);
    expect(wrapper.find('main section').exists()).toBe(false);
  });

  it('labels the action by install status and installs', async () => {
    fetchToolsetDetails.mockResolvedValue(details);
    const wrapper = mountPanel();
    expect(actionButton(wrapper).attributes('data-icon')).toBe(
      'i-lucide-download'
    );
    wrapper.vm.open(toolset, 'installed');
    await flushPromises();
    expect(wrapper.find('.badge').text()).toBe('installed');
    expect(actionButton(wrapper).text()).toBe(
      'CAPTAIN.CUSTOM_TOOLS.INSTALL_MANIFEST.REINSTALL'
    );
    wrapper.vm.open(toolset, 'update');
    await flushPromises();
    expect(actionButton(wrapper).attributes('data-icon')).toBe(
      'i-lucide-arrow-up-circle'
    );
    expect(actionButton(wrapper).text()).toBe(
      'CAPTAIN.CUSTOM_TOOLS.INSTALL_MANIFEST.UPDATE'
    );
    await actionButton(wrapper).trigger('click');
    expect(wrapper.emitted('install')).toEqual([[toolset]]);
    expect(env.log.at(-1)).toBe('close');
  });

  it('closes from the footer', async () => {
    const wrapper = mountPanel();
    await wrapper.findAll('footer button')[0].trigger('click');
    expect(env.log).toEqual(['close']);
  });
});
