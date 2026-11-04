/**
 * OneTeam behaviour spec for the message template preview drawer.
 *
 * Covers the empty drawer, WhatsApp templates with and without a Meta
 * management link, Twilio templates, the unsubmitted status label, and
 * opening and closing the side panel.
 */
import { mount } from '@vue/test-utils';
import TemplatePreviewDrawer from '../TemplatePreviewDrawer.vue';

const env = vi.hoisted(() => ({ open: vi.fn(), close: vi.fn() }));

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/components-next/template-preview', () => ({
  TemplateNormalizer: {
    normalize: (template, platform) =>
      template.withVariables ? { variables: { 1: platform } } : {},
  },
  TemplatePreview: {
    name: 'TemplatePreview',
    props: ['variables', 'platform'],
    template: '<div class="preview" />',
  },
}));
vi.mock('../templateUtils', () => ({
  formatTemplateLabel: value => `label:${value}`,
  formatTemplateLanguage: value => `lang:${value}`,
  templateStatusClasses: () => 'status',
  templateTypeKey: () => 'TEXT',
}));

/**
 * Mounts the drawer.
 *
 * @param {object|null} template template to preview
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountDrawer = template =>
  mount(TemplatePreviewDrawer, {
    props: { template },
    global: {
      mocks: { $t: key => key },
      stubs: {
        Button: { props: ['label'], template: '<button>{{ label }}</button>' },
        SidePanel: {
          name: 'SidePanel',
          props: ['title'],
          methods: { open: () => env.open(), close: () => env.close() },
          template: '<aside><slot /><slot name="footer" /></aside>',
        },
      },
    },
  });

describe('TemplatePreviewDrawer behaviour', () => {
  it('renders an empty drawer and opens and closes the panel', () => {
    const wrapper = mountDrawer(null);
    expect(wrapper.find('.preview').exists()).toBe(false);
    expect(wrapper.find('a').exists()).toBe(false);
    expect(wrapper.vm.$.setupState.variables).toEqual({});
    wrapper.vm.open();
    wrapper.vm.close();
    expect(env.open).toHaveBeenCalled();
    expect(env.close).toHaveBeenCalled();
  });

  it('links WhatsApp Cloud templates to Meta', () => {
    const wrapper = mountDrawer({
      name: 'welcome',
      status: 'APPROVED',
      category: 'MARKETING',
      language: 'en',
      inboxNames: 'Support',
      withVariables: true,
      inboxes: [{ provider: 'whatsapp_cloud' }],
    });
    const preview = wrapper.findComponent({ name: 'TemplatePreview' });
    expect(preview.props()).toEqual({
      variables: { 1: 'whatsapp' },
      platform: 'whatsapp',
    });
    expect(wrapper.text()).toContain('label:APPROVED');
    expect(wrapper.text()).toContain('lang:en');
    expect(wrapper.find('a').attributes('href')).toContain(
      'business.facebook.com'
    );
    expect(wrapper.find('button').text()).toBe(
      'WHATSAPP_TEMPLATE_MGMT.MANAGE_IN_META'
    );
  });

  it('omits the link for other WhatsApp providers', () => {
    const wrapper = mountDrawer({ name: 'x', status: 'unsubmitted' });
    expect(wrapper.find('a').exists()).toBe(false);
    expect(wrapper.text()).toContain(
      'WHATSAPP_TEMPLATE_MGMT.STATUSES.UNSUBMITTED'
    );
    expect(
      wrapper.findComponent({ name: 'TemplatePreview' }).props('variables')
    ).toEqual({});
  });

  it('links Twilio templates to the Twilio console', () => {
    const wrapper = mountDrawer({ name: 't', platform: 'twilio' });
    expect(wrapper.find('a').attributes('href')).toContain(
      'console.twilio.com'
    );
    expect(wrapper.find('button').text()).toBe(
      'WHATSAPP_TEMPLATE_MGMT.MANAGE_IN_TWILIO'
    );
    expect(wrapper.text()).toContain('label:undefined');
  });
});
