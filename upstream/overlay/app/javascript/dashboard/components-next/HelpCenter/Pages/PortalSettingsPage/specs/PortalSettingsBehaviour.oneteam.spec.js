/**
 * OneTeam behaviour spec for the help center portal settings page.
 *
 * Covers the spinner while portals load or switch, nothing for an
 * unknown portal, the four settings tabs for the portal in the address,
 * and passing each section's updates, deletion, SSL refresh and CNAME
 * instructions up to the page.
 */
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import PortalSettings from '../PortalSettings.vue';

const route = { params: { portalSlug: 'docs' } };
const isSwitchingPortal = ref(false);
const isFetchingSSLStatus = ref(true);

vi.mock('vue-router', () => ({ useRoute: () => route }));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/composables/store.js', () => ({
  useMapGetter: name =>
    name === 'portals/isSwitchingPortal'
      ? isSwitchingPortal
      : isFetchingSSLStatus,
}));

const section = (name, emits) => ({
  name,
  props: ['activePortal', 'isFetching', 'isFetchingStatus'],
  emits,
  template: `<div class="${name}" />`,
});
const General = section('PortalGeneralSettings', [
  'updatePortal',
  'deletePortal',
]);
const Configuration = section('PortalConfigurationSettings', [
  'updatePortalConfiguration',
  'refreshStatus',
  'sendCnameInstructions',
]);
const Layout = section('PortalLayoutContentSettings', [
  'updatePortalConfiguration',
]);
const Integrations = section('PortalIntegrationsSettings', [
  'updatePortalConfiguration',
]);
const VerticalTabs = {
  name: 'VerticalTabs',
  props: ['modelValue', 'tabs', 'contentClass'],
  emits: ['update:modelValue'],
  template:
    '<div class="tabs"><slot name="general" /><slot name="domain" /><slot name="appearance" /><slot name="integrations" /></div>',
};

const docs = { slug: 'docs', name: 'Docs' };
const mountSettings = (props = {}) =>
  mount(PortalSettings, {
    props: { portals: [{ slug: 'faq' }, docs], isFetching: false, ...props },
    global: {
      stubs: {
        HelpCenterLayout: {
          props: ['breadcrumbLabel', 'showPaginationFooter'],
          template:
            '<section :data-label="breadcrumbLabel"><slot name="content" /></section>',
        },
        VerticalTabs,
        PortalGeneralSettings: General,
        PortalConfigurationSettings: Configuration,
        PortalLayoutContentSettings: Layout,
        PortalIntegrationsSettings: Integrations,
        Spinner: { template: '<i class="spinner" />' },
      },
    },
  });

describe('PortalSettings behaviour', () => {
  beforeEach(() => {
    route.params.portalSlug = 'docs';
    isSwitchingPortal.value = false;
  });

  it('shows a spinner while loading or switching portals', () => {
    expect(mountSettings({ isFetching: true }).find('.spinner').exists()).toBe(
      true
    );
    isSwitchingPortal.value = true;
    const wrapper = mountSettings();
    expect(wrapper.find('.spinner').exists()).toBe(true);
    expect(wrapper.find('.tabs').exists()).toBe(false);
  });

  it('shows nothing for an unknown portal', () => {
    route.params.portalSlug = 'missing';
    const wrapper = mountSettings();
    expect(wrapper.find('.tabs').exists()).toBe(false);
    expect(wrapper.find('section').attributes('data-label')).toBe(
      'HELP_CENTER.BREADCRUMB.SETTINGS'
    );
  });

  it('shows the settings tabs for the portal in the address', async () => {
    const wrapper = mountSettings();
    const tabs = wrapper.findComponent(VerticalTabs);
    expect(tabs.props('modelValue')).toBe('general');
    await tabs.vm.$emit('update:modelValue', 'domain');
    expect(tabs.props('modelValue')).toBe('domain');
    expect(tabs.props('tabs').map(tab => [tab.id, tab.label])).toEqual([
      ['general', 'HELP_CENTER.PORTAL_SETTINGS.NAV.GENERAL'],
      ['domain', 'HELP_CENTER.PORTAL_SETTINGS.NAV.DOMAIN'],
      ['appearance', 'HELP_CENTER.PORTAL_SETTINGS.NAV.APPEARANCE'],
      ['integrations', 'HELP_CENTER.PORTAL_SETTINGS.NAV.INTEGRATIONS'],
    ]);
    [General, Configuration, Layout, Integrations].forEach(component => {
      expect(wrapper.findComponent(component).props('activePortal')).toEqual(
        docs
      );
    });
    expect(wrapper.findComponent(Configuration).props('isFetchingStatus')).toBe(
      true
    );
  });

  it('passes section changes up to the page', async () => {
    const wrapper = mountSettings();
    const general = wrapper.findComponent(General);
    const configuration = wrapper.findComponent(Configuration);
    await general.vm.$emit('updatePortal', { name: 'New' });
    await general.vm.$emit('deletePortal', docs);
    await configuration.vm.$emit('updatePortalConfiguration', { domain: 'x' });
    await configuration.vm.$emit('refreshStatus');
    await configuration.vm.$emit('sendCnameInstructions', { email: 'a@b.co' });
    await wrapper
      .findComponent(Layout)
      .vm.$emit('updatePortalConfiguration', { color: '#000' });
    await wrapper
      .findComponent(Integrations)
      .vm.$emit('updatePortalConfiguration', { ga: '1' });

    expect(wrapper.emitted('updatePortal')).toEqual([[{ name: 'New' }]]);
    expect(wrapper.emitted('deletePortal')).toEqual([[docs]]);
    expect(wrapper.emitted('updatePortalConfiguration')).toEqual([
      [{ domain: 'x' }],
      [{ color: '#000' }],
      [{ ga: '1' }],
    ]);
    expect(wrapper.emitted('refreshStatus')).toHaveLength(1);
    expect(wrapper.emitted('sendCnameInstructions')).toEqual([
      [{ email: 'a@b.co' }],
    ]);
  });
});
