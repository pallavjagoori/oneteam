/**
 * OneTeam behaviour spec for a toolset card in the custom tool catalog.
 *
 * Covers the identity, description, category, counts, the optional
 * install badge, and clicking the card.
 */
import { mount } from '@vue/test-utils';
import ToolsetCatalogCard from '../ToolsetCatalogCard.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: (key, args) => `${key}:${JSON.stringify(args)}` }),
}));

const ToolsetIdentity = {
  name: 'ToolsetIdentity',
  props: ['toolset'],
  template: '<div />',
};
const ToolsetInstallBadge = {
  name: 'ToolsetInstallBadge',
  props: ['status'],
  template: '<span />',
};

const toolset = {
  name: 'Shopify',
  description: 'Orders and products',
  category: 'Commerce',
  tool_count: 4,
  version: '1.2',
};

/**
 * Mounts the card.
 *
 * @param {object} props Extra props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountCard = props =>
  mount(ToolsetCatalogCard, {
    props: { toolset, ...props },
    global: { stubs: { ToolsetIdentity, ToolsetInstallBadge } },
  });

describe('ToolsetCatalogCard behaviour', () => {
  it('shows the toolset with its install status and emits clicks', async () => {
    const wrapper = mountCard({ installStatus: 'installed' });
    expect(wrapper.getComponent(ToolsetIdentity).props('toolset')).toEqual(
      toolset
    );
    expect(wrapper.getComponent(ToolsetInstallBadge).props('status')).toBe(
      'installed'
    );
    expect(wrapper.text()).toContain('Orders and products');
    expect(wrapper.get('[title="Commerce"]').text()).toBe('Commerce');
    expect(wrapper.text()).toContain(
      'CAPTAIN.CUSTOM_TOOLS.CATALOG.TOOL_COUNT:{"n":4}'
    );
    expect(wrapper.text()).toContain(
      'CAPTAIN.CUSTOM_TOOLS.CATALOG.VERSION:{"version":"1.2"}'
    );
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);
  });

  it('hides the badge without an install status', () => {
    expect(mountCard().findComponent(ToolsetInstallBadge).exists()).toBe(false);
  });
});
