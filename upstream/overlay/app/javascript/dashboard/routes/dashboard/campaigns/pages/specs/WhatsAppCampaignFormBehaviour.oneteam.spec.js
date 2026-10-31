/**
 * OneTeam behaviour spec for the WhatsApp campaign create/edit page.
 *
 * Drives the page through its child components: filling and saving each
 * section in create and edit mode, discarding edits, the messaging tier
 * label, inbox health failures, creating a campaign (payload, tracking,
 * redirect, failure), rescheduling and its failure, the breadcrumb,
 * redirects for running campaigns, resetting when the campaign goes away,
 * and resetting a new form when the cached page is shown again.
 */
import { KeepAlive, h, nextTick, reactive, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert, useTrack } from 'dashboard/composables';
import WhatsAppCampaignFormPage from '../WhatsAppCampaignFormPage.vue';

const env = vi.hoisted(() => ({}));

const stubs = vi.hoisted(() => {
  const make = (name, props, emits = [], slot = false) => ({
    default: {
      name,
      props,
      emits,
      template: slot ? `<div class="${name}"><slot /></div>` : `<div class="${name}" />`,
    },
  });
  return {
    Breadcrumb: make('Breadcrumb', ['items'], ['click']),
    SectionCard: make('SectionCard', ['title', 'isDirty', 'isSaving', 'isSaveDisabled'], ['discard', 'save'], true),
    BasicSettingsFields: make('BasicSettingsFields', ['title', 'inboxId', 'inboxes', 'isInboxDisabled'], ['update:title', 'update:inboxId']),
    AudienceFields: make('AudienceFields', ['modelValue', 'labels', 'messagingTier'], ['update:modelValue']),
    TemplateFields: make('TemplateFields', ['templateId', 'processedParams', 'templates', 'hasInbox'], ['update:templateId', 'update:processedParams']),
    AccountInformationCard: make('AccountInformationCard', ['healthData']),
    MessagePreviewCard: make('MessagePreviewCard', ['template', 'processedParams']),
    SchedulePopover: make('SchedulePopover', ['modelValue', 'buttonLabel', 'isDisabled', 'showActions', 'isLoading'], ['update:modelValue', 'confirm']),
    Button: {
      default: {
        name: 'Button',
        props: { label: String, disabled: Boolean, isLoading: Boolean },
        emits: ['click'],
        template: '<button :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
      },
    },
  };
});

vi.mock('dashboard/components-next/breadcrumb/Breadcrumb.vue', () => stubs.Breadcrumb);
vi.mock('dashboard/components-next/button/Button.vue', () => stubs.Button);
vi.mock('dashboard/components-next/Campaigns/WhatsAppCampaign/SectionCard.vue', () => stubs.SectionCard);
vi.mock('dashboard/components-next/Campaigns/WhatsAppCampaign/BasicSettingsFields.vue', () => stubs.BasicSettingsFields);
vi.mock('dashboard/components-next/Campaigns/WhatsAppCampaign/AudienceFields.vue', () => stubs.AudienceFields);
vi.mock('dashboard/components-next/Campaigns/WhatsAppCampaign/TemplateFields.vue', () => stubs.TemplateFields);
vi.mock('dashboard/components-next/Campaigns/WhatsAppCampaign/AccountInformationCard.vue', () => stubs.AccountInformationCard);
vi.mock('dashboard/components-next/Campaigns/WhatsAppCampaign/MessagePreviewCard.vue', () => stubs.MessagePreviewCard);
vi.mock('dashboard/components-next/Campaigns/WhatsAppCampaign/SchedulePopover.vue', () => stubs.SchedulePopover);
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
  useMapGetter: key => env.getters[key],
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn(), useTrack: vi.fn() }));
vi.mock('dashboard/api/inboxHealth', () => ({
  default: { getHealthStatus: (...args) => env.health(...args) },
}));
vi.mock('vue-router', () => ({
  useRoute: () => env.route,
  useRouter: () => ({ push: env.push, replace: env.replace }),
}));
vi.mock('vue-i18n', async () => {
  const { ref: vueRef } = await import('vue');
  return {
    useI18n: () => ({
      t: (key, args) => (args ? `${key} ${JSON.stringify(args)}` : key),
      te: key => key.endsWith('TIER_1K'),
      locale: vueRef('en-GB'),
    }),
  };
});

const template = {
  id: 'tpl-1',
  name: 'greeting',
  language: 'en',
  category: 'MARKETING',
  namespace: 'ns',
  components: [{ type: 'BODY', text: 'Hello {{1}}' }],
};
const bareTemplate = { name: 'bare', components: [] };
const existing = (overrides = {}) => ({
  id: 1,
  title: 'Spring sale',
  inbox: { id: 1 },
  campaign_status: 'active',
  scheduled_at: 2000000000,
  audience: [{ type: 'Label', id: 2 }, { type: 'Contact', id: 9 }],
  template_params: {
    name: 'greeting',
    language: 'en',
    processed_params: { body: { 1: 'Jamie' } },
  },
  ...overrides,
});

const Host = {
  props: ['visible'],
  render() {
    return h(KeepAlive, null, [this.visible ? h(WhatsAppCampaignFormPage) : h('div')]);
  },
};

const mountPage = async () => {
  const wrapper = mount(Host, {
    props: { visible: true },
    global: { directives: { tooltip: {} } },
  });
  await flushPromises();
  return wrapper;
};
const find = (wrapper, name) => wrapper.findComponent({ name });
const sections = wrapper => wrapper.findAllComponents({ name: 'SectionCard' });
const buttons = wrapper => wrapper.findAllComponents({ name: 'Button' });

const fillNewCampaign = async wrapper => {
  const basic = find(wrapper, 'BasicSettingsFields');
  await basic.vm.$emit('update:title', 'Launch');
  await basic.vm.$emit('update:inboxId', 1);
  await flushPromises();
  await find(wrapper, 'AudienceFields').vm.$emit('update:modelValue', [2, 3]);
  const fields = find(wrapper, 'TemplateFields');
  await fields.vm.$emit('update:templateId', 'tpl-1');
  await fields.vm.$emit('update:processedParams', { body: { 1: 'Sam' } });
  await nextTick();
};

describe('WhatsApp campaign form behaviour', () => {
  beforeEach(() => {
    env.dispatch = vi.fn();
    env.push = vi.fn();
    env.replace = vi.fn();
    env.health = vi.fn().mockResolvedValue({ data: { messaging_limit_tier: 'TIER_1K' } });
    env.route = reactive({ name: 'campaigns_whatsapp_new', params: {} });
    env.campaigns = ref([existing()]);
    env.templates = [template, bareTemplate];
    env.getters = {
      'campaigns/getWhatsAppCampaigns': env.campaigns,
      'labels/getLabels': ref([{ id: 2 }]),
      'inboxes/getWhatsAppInboxes': ref([{ id: 1 }]),
      'inboxes/getFilteredWhatsAppTemplates': ref(() => env.templates),
      'campaigns/getUIFlags': ref({ hasFetched: true, isFetching: false, isUpdating: false }),
    };
  });

  it('creates a campaign from a filled form', async () => {
    const wrapper = await mountPage();
    expect(find(wrapper, 'Breadcrumb').props('items')[1].label).toBe(
      'CAMPAIGN.WHATSAPP.FORM.CREATE_TITLE'
    );
    expect(find(wrapper, 'SchedulePopover').props()).toMatchObject({
      buttonLabel: 'CAMPAIGN.WHATSAPP.FORM.SCHEDULE',
      isDisabled: true,
      showActions: true,
    });
    await fillNewCampaign(wrapper);
    expect(find(wrapper, 'AudienceFields').props('messagingTier')).toBe(
      'INBOX_MGMT.ACCOUNT_HEALTH.VALUES.TIERS.TIER_1K'
    );
    expect(find(wrapper, 'MessagePreviewCard').props('template')).toEqual(template);
    const popover = find(wrapper, 'SchedulePopover');
    expect(popover.props('isDisabled')).toBe(false);
    await popover.vm.$emit('update:modelValue', '2035-01-01T10:00');
    await popover.vm.$emit('confirm');
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('campaigns/create', {
      title: 'Launch',
      inbox_id: 1,
      audience: [
        { id: 2, type: 'Label' },
        { id: 3, type: 'Label' },
      ],
      scheduled_at: new Date('2035-01-01T10:00').toISOString(),
      message: 'Hello Sam',
      template_params: {
        name: 'greeting',
        namespace: 'ns',
        category: 'MARKETING',
        language: 'en',
        processed_params: { body: { 1: 'Sam' } },
      },
    });
    expect(useTrack).toHaveBeenCalled();
    expect(useAlert).toHaveBeenCalledWith('CAMPAIGN.WHATSAPP.FORM.API.CREATE_SUCCESS');
    expect(env.push).toHaveBeenCalledWith({ name: 'campaigns_whatsapp_index' });
    expect(find(wrapper, 'BasicSettingsFields').props('title')).toBe('');
  });

  it('fills template defaults and reports create failures', async () => {
    env.dispatch.mockRejectedValueOnce(new Error('x'));
    const wrapper = await mountPage();
    await fillNewCampaign(wrapper);
    await find(wrapper, 'TemplateFields').vm.$emit('update:templateId', 'bare:undefined');
    await find(wrapper, 'TemplateFields').vm.$emit('update:processedParams', {});
    await find(wrapper, 'SchedulePopover').vm.$emit('update:modelValue', '2035-01-01T10:00');
    await find(wrapper, 'SchedulePopover').vm.$emit('confirm');
    await flushPromises();
    expect(env.dispatch.mock.calls[0][1]).toMatchObject({
      message: '',
      template_params: { name: 'bare', namespace: '', category: 'UTILITY', language: 'en' },
    });
    expect(useAlert).toHaveBeenCalledWith('CAMPAIGN.WHATSAPP.FORM.API.CREATE_ERROR');
    expect(env.push).not.toHaveBeenCalled();
  });

  it('confirms and discards sections locally for a new campaign', async () => {
    const wrapper = await mountPage();
    await fillNewCampaign(wrapper);
    const [basic, audience, templateSection] = sections(wrapper);
    expect(audience.props('isDirty')).toBe(true);
    await audience.vm.$emit('save');
    await flushPromises();
    expect(sections(wrapper)[1].props('isDirty')).toBe(false);
    await find(wrapper, 'AudienceFields').vm.$emit('update:modelValue', [5]);
    await sections(wrapper)[1].vm.$emit('discard');
    expect(find(wrapper, 'AudienceFields').props('modelValue')).toEqual([2, 3]);
    await basic.vm.$emit('save');
    await templateSection.vm.$emit('save');
    await flushPromises();
    expect(env.dispatch).not.toHaveBeenCalled();
    expect(sections(wrapper).map(s => s.props('isDirty'))).toEqual([false, false, false]);
  });

  it('clears the health card when the health check fails or the inbox is cleared', async () => {
    const wrapper = await mountPage();
    env.health.mockRejectedValueOnce(new Error('down'));
    await find(wrapper, 'BasicSettingsFields').vm.$emit('update:inboxId', 1);
    await flushPromises();
    expect(find(wrapper, 'AccountInformationCard').props('healthData')).toBe(null);
    await find(wrapper, 'BasicSettingsFields').vm.$emit('update:inboxId', 2);
    await flushPromises();
    env.health.mockResolvedValueOnce({ data: { messaging_limit_tier: 'UNKNOWN' } });
    await find(wrapper, 'BasicSettingsFields').vm.$emit('update:inboxId', 3);
    await flushPromises();
    expect(find(wrapper, 'AudienceFields').props('messagingTier')).toBe('');
  });

  it('edits each section of an existing campaign', async () => {
    env.route = reactive({ name: 'campaigns_whatsapp_edit', params: { campaignId: '1' } });
    const wrapper = await mountPage();
    expect(find(wrapper, 'Breadcrumb').props('items')[1].label).toBe('Spring sale');
    expect(find(wrapper, 'AudienceFields').props('modelValue')).toEqual([2]);
    expect(find(wrapper, 'BasicSettingsFields').props('isInboxDisabled')).toBe(true);
    expect(find(wrapper, 'SchedulePopover').props('buttonLabel')).toContain(
      'CAMPAIGN.WHATSAPP.FORM.SCHEDULED_FOR'
    );
    await find(wrapper, 'BasicSettingsFields').vm.$emit('update:title', 'Renamed');
    await sections(wrapper)[0].vm.$emit('save');
    await flushPromises();
    expect(env.dispatch).toHaveBeenLastCalledWith('campaigns/update', {
      id: 1,
      title: 'Renamed',
      inbox_id: 1,
    });
    expect(useAlert).toHaveBeenLastCalledWith('CAMPAIGN.WHATSAPP.FORM.API.UPDATE_SUCCESS');
    await find(wrapper, 'AudienceFields').vm.$emit('update:modelValue', [2, 4]);
    await sections(wrapper)[1].vm.$emit('save');
    await flushPromises();
    expect(env.dispatch).toHaveBeenLastCalledWith('campaigns/update', {
      id: 1,
      audience: [
        { id: 2, type: 'Label' },
        { id: 4, type: 'Label' },
      ],
    });
    await find(wrapper, 'TemplateFields').vm.$emit('update:processedParams', { body: { 1: 'Al' } });
    env.dispatch.mockRejectedValueOnce(new Error('x'));
    await sections(wrapper)[2].vm.$emit('save');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('CAMPAIGN.WHATSAPP.FORM.API.UPDATE_ERROR');
    expect(sections(wrapper)[2].props('isDirty')).toBe(true);
    await sections(wrapper)[2].vm.$emit('discard');
    expect(sections(wrapper)[2].props('isDirty')).toBe(false);
  });

  it('reschedules or cancels a schedule change', async () => {
    env.route = reactive({ name: 'campaigns_whatsapp_edit', params: { campaignId: '1' } });
    const wrapper = await mountPage();
    expect(buttons(wrapper)[1].props('disabled')).toBe(true);
    await find(wrapper, 'SchedulePopover').vm.$emit('update:modelValue', '2036-03-04T05:06');
    expect(buttons(wrapper)[2].props('disabled')).toBe(false);
    await buttons(wrapper)[2].trigger('click');
    await flushPromises();
    expect(env.dispatch).toHaveBeenLastCalledWith('campaigns/update', {
      id: 1,
      scheduled_at: new Date('2036-03-04T05:06').toISOString(),
    });
    expect(buttons(wrapper)[1].props('disabled')).toBe(true);
    await find(wrapper, 'SchedulePopover').vm.$emit('update:modelValue', '2037-01-01T00:00');
    env.dispatch.mockRejectedValueOnce(new Error('x'));
    await buttons(wrapper)[2].trigger('click');
    await flushPromises();
    expect(buttons(wrapper)[1].props('disabled')).toBe(false);
    await buttons(wrapper)[1].trigger('click');
    expect(find(wrapper, 'SchedulePopover').props('modelValue')).toBe('2036-03-04T05:06');
    await find(wrapper, 'SchedulePopover').vm.$emit('update:modelValue', '2001-01-01T00:00');
    expect(buttons(wrapper)[2].props('disabled')).toBe(true);
  });

  it('navigates from the breadcrumb', async () => {
    const wrapper = await mountPage();
    await find(wrapper, 'Breadcrumb').vm.$emit('click', { routeName: 'campaigns_whatsapp_index' });
    expect(env.push).toHaveBeenCalledWith({ name: 'campaigns_whatsapp_index' });
  });

  it('leaves running campaigns and resets when the campaign disappears', async () => {
    env.campaigns.value = [existing({ campaign_status: 'processing' })];
    env.route = reactive({ name: 'campaigns_whatsapp_edit', params: { campaignId: '1' } });
    await mountPage();
    expect(env.replace).toHaveBeenCalledWith({ name: 'campaigns_whatsapp_index' });
    env.replace.mockClear();
    env.campaigns.value = [existing({ template_params: null, audience: null })];
    const wrapper = await mountPage();
    expect(find(wrapper, 'TemplateFields').props('templateId')).toBe(null);
    expect(find(wrapper, 'AudienceFields').props('modelValue')).toEqual([]);
    env.campaigns.value = [];
    await flushPromises();
    expect(find(wrapper, 'BasicSettingsFields').props('title')).toBe('');
    expect(env.replace).toHaveBeenCalledWith({ name: 'campaigns_whatsapp_index' });
  });

  it('resets a new form when the cached page is shown again', async () => {
    const wrapper = await mountPage();
    await find(wrapper, 'BasicSettingsFields').vm.$emit('update:title', 'Draft');
    await wrapper.setProps({ visible: false });
    await wrapper.setProps({ visible: true });
    await flushPromises();
    expect(find(wrapper, 'BasicSettingsFields').props('title')).toBe('');
  });
});
