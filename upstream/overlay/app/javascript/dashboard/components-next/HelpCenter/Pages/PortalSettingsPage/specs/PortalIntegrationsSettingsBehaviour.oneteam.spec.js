/**
 * OneTeam behaviour spec for the help center portal's integrations tab.
 *
 * Covers listing only website inboxes for the live chat widget, prefilling
 * from the portal, hiding analytics providers from non-admins, flagging
 * badly formatted tracking IDs, keeping Save disabled until something
 * changes (and while fetching or updating), saving trimmed analytics with
 * blanks dropped, and resetting when the portal changes.
 */
import { mount } from '@vue/test-utils';
import PortalIntegrationsSettings from '../PortalIntegrationsSettings.vue';

const env = vi.hoisted(() => ({
  isAdmin: true,
  updating: {},
  inboxes: [],
}));

vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return {
    useStore: () => ({ getters: { 'inboxes/getInboxes': env.inboxes } }),
    useMapGetter: () =>
      computed(() => slug => ({ isUpdating: Boolean(env.updating[slug]) })),
  };
});
vi.mock('dashboard/composables/useAdmin', async () => {
  const { computed } = await import('vue');
  return { useAdmin: () => ({ isAdmin: computed(() => env.isAdmin) }) };
});
vi.mock('shared/composables/useBranding', () => ({
  useBranding: () => ({ replaceInstallationName: text => `[${text}]` }),
}));

const IntegrationCard = {
  name: 'IntegrationCard',
  props: ['title', 'icon'],
  template: '<section :class="icon"><h3>{{ title }}</h3><slot /></section>',
};
const ComboBox = {
  name: 'ComboBox',
  props: ['modelValue', 'options'],
  emits: ['update:modelValue'],
  template: '<div class="combo" />',
};
const Input = {
  name: 'Input',
  props: ['modelValue', 'message', 'messageType'],
  emits: ['update:modelValue'],
  template: '<input :value="modelValue" />',
};
const Button = {
  name: 'Button',
  props: { disabled: Boolean, isLoading: Boolean, label: String },
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};

const portal = (overrides = {}) => ({
  id: 3,
  slug: 'docs',
  inbox: { id: 7 },
  config: { analytics: { ga4_measurement_id: 'G-ABC123' } },
  ...overrides,
});

const mountSettings = props =>
  mount(PortalIntegrationsSettings, {
    props: { activePortal: portal(), ...props },
    global: { stubs: { IntegrationCard, ComboBox, Input, Button } },
  });

const save = wrapper => wrapper.findComponent(Button);
const inputFor = (wrapper, icon) =>
  wrapper.find(`section.${icon}`).findComponent(Input);

describe('PortalIntegrationsSettings behaviour', () => {
  beforeEach(() => {
    env.isAdmin = true;
    env.updating = {};
    env.inboxes = [
      { id: 7, name: 'Website', channel_type: 'Channel::WebWidget' },
      { id: 8, name: 'Email', channel_type: 'Channel::Email' },
    ];
  });

  it('offers website inboxes and prefills from the portal', () => {
    const wrapper = mountSettings();
    const combo = wrapper.findComponent(ComboBox);
    expect(combo.props('options')).toEqual([
      {
        value: '',
        label: 'HELP_CENTER.PORTAL_SETTINGS.INTEGRATIONS.LIVE_CHAT.NONE_OPTION',
      },
      { value: 7, label: 'Website' },
    ]);
    expect(combo.props('modelValue')).toBe(7);
    expect(wrapper.text()).toContain(
      '[HELP_CENTER.PORTAL_SETTINGS.INTEGRATIONS.LIVE_CHAT.TITLE]'
    );
    expect(
      inputFor(wrapper, 'i-logos-google-analytics').props('modelValue')
    ).toBe('G-ABC123');
    expect(wrapper.findAllComponents(Input)).toHaveLength(7);
    expect(save(wrapper).props('disabled')).toBe(true);
  });

  it('hides analytics providers from non-admins', () => {
    env.isAdmin = false;
    const wrapper = mountSettings({
      activePortal: portal({ inbox: null, config: null }),
    });
    expect(wrapper.findAllComponents(Input)).toHaveLength(0);
    expect(wrapper.findComponent(ComboBox).props('modelValue')).toBe('');
  });

  it('flags badly formatted tracking IDs and blocks saving', async () => {
    const wrapper = mountSettings();
    const gtm = inputFor(wrapper, 'i-logos-google-tag-manager');
    await gtm.vm.$emit('update:modelValue', 'bad id');
    expect(gtm.props('messageType')).toBe('error');
    expect(gtm.props('message')).toBe(
      'HELP_CENTER.PORTAL_SETTINGS.INTEGRATIONS.GTM.INVALID'
    );
    expect(save(wrapper).props('disabled')).toBe(true);

    await gtm.vm.$emit('update:modelValue', 'GTM-XYZ9');
    expect(gtm.props('messageType')).toBe('info');
    expect(gtm.props('message')).toBe(
      'HELP_CENTER.PORTAL_SETTINGS.INTEGRATIONS.GTM.HELP'
    );
    expect(save(wrapper).props('disabled')).toBe(false);
  });

  it('saves trimmed analytics and the chosen widget', async () => {
    const wrapper = mountSettings();
    await wrapper.findComponent(ComboBox).vm.$emit('update:modelValue', '');
    expect(save(wrapper).props('disabled')).toBe(false);
    await inputFor(wrapper, 'i-logos-hotjar-icon').vm.$emit(
      'update:modelValue',
      ' 12345 '
    );
    await inputFor(wrapper, 'i-logos-google-analytics').vm.$emit(
      'update:modelValue',
      ''
    );
    await save(wrapper).trigger('click');
    expect(wrapper.emitted('updatePortalConfiguration')).toEqual([
      [
        {
          id: 3,
          slug: 'docs',
          inbox_id: '',
          config: { analytics: { hotjar_site_id: '12345' } },
        },
      ],
    ]);
  });

  it('disables saving while fetching or updating', async () => {
    const fetching = mountSettings({ isFetching: true });
    await fetching.findComponent(ComboBox).vm.$emit('update:modelValue', '');
    expect(save(fetching).props('disabled')).toBe(true);

    env.updating = { docs: true };
    const updating = mountSettings();
    await updating.findComponent(ComboBox).vm.$emit('update:modelValue', '');
    expect(save(updating).props('disabled')).toBe(true);
    expect(save(updating).props('isLoading')).toBe(true);

    const noSlug = mountSettings({ activePortal: portal({ slug: '' }) });
    expect(save(noSlug).props('isLoading')).toBe(false);
  });

  it('resets when the portal changes', async () => {
    const wrapper = mountSettings();
    await inputFor(wrapper, 'i-logos-meta-icon').vm.$emit(
      'update:modelValue',
      '999'
    );
    await wrapper.setProps({
      activePortal: portal({ inbox: null, config: { analytics: {} } }),
    });
    expect(inputFor(wrapper, 'i-logos-meta-icon').props('modelValue')).toBe('');
    expect(save(wrapper).props('disabled')).toBe(true);
  });
});
