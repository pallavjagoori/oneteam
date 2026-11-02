/**
 * OneTeam behaviour spec for the help center portal custom domain
 * settings.
 *
 * Covers adding a domain (no domain yet), the live, pending, error and
 * unknown SSL statuses with their colours (shown only on Chatwoot
 * Cloud), the refresh button and its spinner, editing the domain, the
 * DNS instructions dialog after saving a domain (and not after clearing
 * it), closing that dialog and sending the CNAME instructions.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import PortalConfigurationSettings from '../PortalConfigurationSettings.vue';

const env = vi.hoisted(() => ({ cloud: null, log: [] }));

vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({ isOnChatwootCloud: env.cloud }),
}));

const dialog = (name, props, emits) => ({
  name,
  props,
  emits,
  data: () => ({
    dialogRef: {
      open: () => env.log.push(`${name} open`),
      close: () => env.log.push(`${name} close`),
    },
  }),
  template: '<div />',
});
const AddCustomDomainDialog = dialog(
  'AddCustomDomainDialog',
  ['mode', 'customDomain'],
  ['addCustomDomain']
);
const DNSConfigurationDialog = dialog(
  'DNSConfigurationDialog',
  ['customDomain'],
  ['close', 'send']
);
const Button = {
  name: 'Button',
  props: ['label', 'icon'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};

const PREFIX = 'HELP_CENTER.PORTAL_SETTINGS.CONFIGURATION_FORM.CUSTOM_DOMAIN';

const mountSettings = (activePortal, isFetchingStatus = false) =>
  mount(PortalConfigurationSettings, {
    props: { activePortal, isFetchingStatus },
    global: {
      stubs: { AddCustomDomainDialog, DNSConfigurationDialog, Button },
      directives: { tooltip: {} },
    },
  });

const portal = status => ({
  id: 3,
  slug: 'docs',
  custom_domain: 'help.acme.io',
  ssl_settings: { status, verification_errors: 'CNAME missing' },
});

describe('PortalConfigurationSettings behaviour', () => {
  beforeEach(() => {
    env.cloud = ref(true);
    env.log = [];
  });

  it('adds a domain and opens the DNS instructions', async () => {
    const wrapper = mountSettings({ id: 3 });
    const add = wrapper.findComponent(Button);
    expect(add.text()).toBe(`${PREFIX}.ADD_BUTTON`);
    const addDialog = wrapper.findComponent(AddCustomDomainDialog);
    expect(addDialog.props()).toEqual({ mode: 'add', customDomain: '' });
    await add.trigger('click');
    expect(env.log).toEqual(['AddCustomDomainDialog open']);

    await addDialog.vm.$emit('addCustomDomain', 'kb.acme.io');
    expect(wrapper.emitted('updatePortalConfiguration')[0]).toEqual([
      { id: 3, custom_domain: 'kb.acme.io' },
    ]);
    expect(env.log.slice(1)).toEqual([
      'AddCustomDomainDialog close',
      'DNSConfigurationDialog open',
    ]);
    const dns = wrapper.findComponent(DNSConfigurationDialog);
    expect(dns.props('customDomain')).toBe('kb.acme.io');

    await dns.vm.$emit('close');
    expect(env.log.at(-1)).toBe('DNSConfigurationDialog close');
    expect(dns.props('customDomain')).toBe('');
  });

  it('clears a domain without the DNS dialog', async () => {
    const wrapper = mountSettings(null);
    await wrapper
      .findComponent(AddCustomDomainDialog)
      .vm.$emit('addCustomDomain', '');
    expect(wrapper.emitted('updatePortalConfiguration')[0]).toEqual([
      { id: undefined, custom_domain: '' },
    ]);
    expect(env.log).toEqual(['AddCustomDomainDialog close']);
  });

  it.each([
    ['active', 'LIVE', 'text-n-teal-11', false],
    ['pending', 'PENDING', 'text-n-amber-11', true],
    ['expired', 'ERROR', 'text-n-ruby-11', true],
  ])('shows the %s SSL status', (status, label, colour, describes) => {
    const wrapper = mountSettings(portal(status));
    const text = wrapper.find(`.${colour}`);
    expect(text.text()).toBe(`${PREFIX}.STATUS.${label}`);
    expect(wrapper.text().includes(`${PREFIX}.STATUS_DESCRIPTION`)).toBe(
      describes
    );
    expect(wrapper.text()).toContain('help.acme.io');
  });

  it('edits the domain and refreshes the status', async () => {
    const wrapper = mountSettings(portal('active'), true);
    const [edit, refresh] = wrapper.findAllComponents(Button);
    expect(edit.text()).toBe(`${PREFIX}.EDIT_BUTTON`);
    expect(refresh.classes()).toContain('animate-spin');
    await edit.trigger('click');
    expect(env.log).toEqual(['AddCustomDomainDialog open']);
    await refresh.trigger('click');
    expect(wrapper.emitted('refreshStatus')).toHaveLength(1);
    expect(wrapper.findComponent(AddCustomDomainDialog).props('mode')).toBe(
      'edit'
    );

    await wrapper
      .findComponent(DNSConfigurationDialog)
      .vm.$emit('send', 'it@acme.io');
    expect(wrapper.emitted('sendCnameInstructions')[0]).toEqual([
      { portalSlug: 'docs', email: 'it@acme.io' },
    ]);
  });

  it('hides status for unknown states and off Chatwoot Cloud', () => {
    const unknown = mountSettings({ custom_domain: 'help.acme.io' });
    expect(unknown.find('.text-n-amber-11').exists()).toBe(false);
    expect(unknown.findAllComponents(Button)).toHaveLength(2);
    expect(unknown.findAllComponents(Button)[1].classes()).not.toContain(
      'animate-spin'
    );

    env.cloud = ref(false);
    const selfHosted = mountSettings(portal('pending'));
    expect(selfHosted.find('.text-n-amber-11').exists()).toBe(false);
    expect(selfHosted.text()).not.toContain(`${PREFIX}.STATUS_DESCRIPTION`);
    expect(selfHosted.findAllComponents(Button)).toHaveLength(1);
  });
});
