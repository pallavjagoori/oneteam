/**
 * OneTeam behaviour spec for the inbox CSAT settings page.
 *
 * Covers state initialisation from the inbox, WhatsApp template status,
 * the Captain utility analyser, survey label rules and every save path
 * (plain inboxes, WhatsApp Cloud and Twilio template creation, reuse of an
 * existing template and the update confirmation dialog).
 */
import { shallowMount, flushPromises } from '@vue/test-utils';
import CustomerSatisfactionPage from '../CustomerSatisfactionPage.vue';
import FilterSelect from 'dashboard/components-next/filter/inputs/FilterSelect.vue';
import Editor from 'dashboard/components-next/Editor/Editor.vue';
import Input from 'dashboard/components-next/input/Input.vue';
import ComboBox from 'dashboard/components-next/combobox/ComboBox.vue';
import CSATTemplate from 'dashboard/components-next/template-preview/CSATTemplate.vue';
import Icon from 'dashboard/components-next/icon/Icon.vue';
import CSATDisplayTypeSelector from '../components/CSATDisplayTypeSelector.vue';

const env = vi.hoisted(() => ({
  labels: [],
  whatsapp: false,
  twilio: false,
  captain: false,
  responses: {},
  dialogOpen: null,
}));

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return {
    useMapGetter: () => computed(() => env.labels),
    useStore: () => env.store,
  };
});
vi.mock('dashboard/composables/useInbox', async () => {
  const { computed } = await import('vue');
  return {
    useInbox: () => ({
      isAWhatsAppChannel: computed(() => env.whatsapp),
      isATwilioWhatsAppChannel: computed(() => env.twilio),
    }),
  };
});
vi.mock('dashboard/composables/useCaptain', async () => {
  const { computed } = await import('vue');
  return {
    useCaptain: () => ({ captainEnabled: computed(() => env.captain) }),
  };
});

const { useAlert } = await import('dashboard/composables');

const ToggleSection = {
  name: 'SettingsToggleSection',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<section><slot name="editor" /></section>',
};
const NextButton = {
  name: 'NextButton',
  props: ['label', 'isLoading', 'disabled'],
  emits: ['click'],
  template: '<button />',
};
const ConfirmDialog = {
  name: 'ConfirmTemplateUpdateDialog',
  emits: ['confirm'],
  methods: {
    open() {
      env.dialogOpen();
    },
  },
  template: '<div />',
};

// Each store action resolves with env.responses[action]; an Error instance
// rejects instead so failure paths can be exercised.
const makeStore = () => ({
  dispatch: vi.fn(async action => {
    const response = env.responses[action];
    if (response instanceof Error) throw response;
    return typeof response === 'function' ? response() : response;
  }),
});

const mountPage = (inbox = { id: 4, csat_survey_enabled: true }) =>
  shallowMount(CustomerSatisfactionPage, {
    props: { inbox },
    global: {
      mocks: { $t: key => key },
      stubs: {
        SettingsToggleSection: ToggleSection,
        ConfirmTemplateUpdateDialog: ConfirmDialog,
        NextButton,
        WithLabel: { template: '<div><slot /></div>' },
      },
    },
  });

const dispatched = name =>
  env.store.dispatch.mock.calls.filter(c => c[0] === name);
const button = (wrapper, label) =>
  wrapper.findAllComponents(NextButton).find(b => b.props('label') === label);
const statusText = wrapper => wrapper.find('span.font-medium').text();
const apiError = message =>
  Object.assign(new Error('x'), { response: { data: { error: message } } });
const save = async wrapper => {
  await button(wrapper, 'INBOX_MGMT.SETTINGS_POPUP.UPDATE').vm.$emit('click');
  await flushPromises();
};
const updateInboxPayload = () => dispatched('inboxes/updateInbox')[0][1];

beforeEach(() => {
  env.labels = [];
  env.whatsapp = false;
  env.twilio = false;
  env.captain = false;
  env.responses = {};
  env.dialogOpen = vi.fn();
  env.store = makeStore();
  vi.clearAllMocks();
});

describe('CSAT page initial state', () => {
  it('uses defaults for an inbox without CSAT config and loads labels', async () => {
    const wrapper = mountPage({ id: 4 });
    expect(wrapper.findComponent(ToggleSection).props('modelValue')).toBe(
      false
    );
    await wrapper
      .findComponent(ToggleSection)
      .vm.$emit('update:modelValue', true);
    expect(dispatched('labels/get')).toHaveLength(1);
    expect(dispatched('inboxes/getCSATTemplateStatus')).toHaveLength(0);
    expect(
      wrapper.findComponent(CSATDisplayTypeSelector).props('selectedType')
    ).toBe('emoji');
  });

  it('reads an existing config and skips loading known labels', () => {
    env.labels = [{ title: 'vip' }];
    const wrapper = mountPage({
      id: 4,
      csat_survey_enabled: true,
      csat_config: {
        display_type: 'star',
        message: 'Rate us',
        survey_rules: { operator: 'does_not_contain', values: ['vip'] },
      },
    });
    expect(dispatched('labels/get')).toHaveLength(0);
    expect(
      wrapper.findComponent(CSATDisplayTypeSelector).props('selectedType')
    ).toBe('star');
    expect(wrapper.findComponent(Editor).props('modelValue')).toBe('Rate us');
    const [operator, labelSelect] = wrapper.findAllComponents(FilterSelect);
    expect(operator.props('modelValue')).toBe('does_not_contain');
    expect(labelSelect.props('options')).toEqual([]);
    expect(button(wrapper, 'vip').exists()).toBe(true);
  });

  it('falls back for every missing config key', () => {
    const wrapper = mountPage({
      id: 4,
      csat_survey_enabled: true,
      csat_config: { survey_rules: { values: 'vip' } },
    });
    expect(
      wrapper.findComponent(CSATDisplayTypeSelector).props('selectedType')
    ).toBe('emoji');
    expect(wrapper.findAllComponents(FilterSelect)[0].props('modelValue')).toBe(
      'contains'
    );
    expect(button(wrapper, 'vip')).toBeUndefined();
  });

  it('defaults the survey rules when the config has none', () => {
    const wrapper = mountPage({
      id: 4,
      csat_survey_enabled: true,
      csat_config: { message: 'm' },
    });
    expect(wrapper.findAllComponents(FilterSelect)[0].props('modelValue')).toBe(
      'contains'
    );
  });

  it('tolerates a missing inbox', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const wrapper = mountPage(null);
    expect(wrapper.findComponent(ToggleSection).props('modelValue')).toBe(
      false
    );
    warn.mockRestore();
  });

  it('hides the editor while the survey is disabled', async () => {
    const wrapper = mountPage();
    expect(wrapper.findComponent(Editor).exists()).toBe(true);
    await wrapper
      .findComponent(ToggleSection)
      .vm.$emit('update:modelValue', false);
    expect(wrapper.findComponent(Editor).exists()).toBe(false);
  });

  it('re-reads the state when the inbox prop changes', async () => {
    const wrapper = mountPage();
    await wrapper.setProps({
      inbox: {
        id: 4,
        csat_survey_enabled: true,
        csat_config: { message: 'n' },
      },
    });
    expect(wrapper.findComponent(Editor).props('modelValue')).toBe('n');
  });
});

describe('CSAT page form controls', () => {
  it('updates the display type and survey operator', async () => {
    const wrapper = mountPage();
    await wrapper
      .findComponent(CSATDisplayTypeSelector)
      .vm.$emit('update', 'star');
    expect(
      wrapper.findComponent(CSATDisplayTypeSelector).props('selectedType')
    ).toBe('star');
    await wrapper
      .findAllComponents(FilterSelect)[0]
      .vm.$emit('update:modelValue', 'does_not_contain');
    expect(wrapper.findAllComponents(FilterSelect)[0].props('modelValue')).toBe(
      'does_not_contain'
    );
    await wrapper.findComponent(Editor).vm.$emit('update:modelValue', 'Hi');
    expect(wrapper.findComponent(Editor).props('modelValue')).toBe('Hi');
  });

  it('adds labels once, ignores empty picks and removes them again', async () => {
    env.labels = [{ title: 'vip' }, { title: 'new' }];
    const wrapper = mountPage();
    const picker = () => wrapper.findAllComponents(FilterSelect)[1];
    expect(picker().props('options')).toEqual([
      { label: 'vip', value: 'vip' },
      { label: 'new', value: 'new' },
    ]);
    await picker().vm.$emit('update:modelValue', 'vip');
    await picker().vm.$emit('update:modelValue', 'vip');
    await picker().vm.$emit('update:modelValue', '');
    expect(picker().props('options')).toEqual([{ label: 'new', value: 'new' }]);
    expect(
      wrapper
        .findAllComponents(NextButton)
        .filter(b => b.props('label') === 'vip')
    ).toHaveLength(1);

    await button(wrapper, 'vip').vm.$emit('click');
    expect(button(wrapper, 'vip')).toBeUndefined();
  });

  it('shows the plain note for other channels', () => {
    const wrapper = mountPage();
    expect(wrapper.text()).toContain('INBOX_MGMT.CSAT.NOTE');
  });
});

describe('CSAT page WhatsApp template status', () => {
  beforeEach(() => {
    env.whatsapp = true;
  });

  it.each([
    [{ template_exists: false, error: 'Template not found' }, 'NOT_FOUND'],
    [{ template_exists: true, status: 'approved' }, 'APPROVED'],
    [{ template_exists: true, status: 'pending' }, 'PENDING'],
    [{ template_exists: true, status: 'rejected' }, 'REJECTED'],
    [{ template_exists: true, status: 'paused' }, 'PENDING'],
    [{ template_exists: true }, 'DEFAULT'],
    [{ template_exists: false, error: 'other' }, 'DEFAULT'],
  ])('shows status for %o', async (response, label) => {
    env.responses['inboxes/getCSATTemplateStatus'] = response;
    const wrapper = mountPage();
    await flushPromises();
    expect(statusText(wrapper)).toBe(
      `INBOX_MGMT.CSAT.TEMPLATE_STATUS.${label}`
    );
    expect(wrapper.text()).toContain('INBOX_MGMT.CSAT.WHATSAPP_NOTE');
    expect(wrapper.findComponent(CSATDisplayTypeSelector).exists()).toBe(false);
  });

  it('treats an API failure as having no template', async () => {
    env.responses['inboxes/getCSATTemplateStatus'] = new Error('down');
    const wrapper = mountPage();
    await flushPromises();
    expect(statusText(wrapper)).toBe('INBOX_MGMT.CSAT.TEMPLATE_STATUS.DEFAULT');
  });

  it('hides the status while it loads and previews the message', async () => {
    env.responses['inboxes/getCSATTemplateStatus'] = { template_exists: true };
    const wrapper = mountPage();
    expect(wrapper.findComponent(Icon).exists()).toBe(true);
    expect(wrapper.find('.mt-4').exists()).toBe(false);
    await flushPromises();
    expect(wrapper.find('.mt-4').exists()).toBe(true);
    const preview = wrapper.findComponent(CSATTemplate);
    expect(preview.props('message')).toEqual({
      content: 'INBOX_MGMT.CSAT.MESSAGE.PLACEHOLDER',
    });
    await wrapper.findComponent(Editor).vm.$emit('update:modelValue', 'Rate');
    expect(preview.props('message')).toEqual({ content: 'Rate' });
    await wrapper.findComponent(Input).vm.$emit('update:modelValue', 'Go');
    await wrapper.findComponent(ComboBox).vm.$emit('update:modelValue', 'fr');
    expect(preview.props('buttonText')).toBe('Go');
    expect(wrapper.findComponent(ComboBox).props('modelValue')).toBe('fr');
    expect(wrapper.findComponent(ComboBox).props('options')[0]).toEqual({
      label: expect.stringContaining('('),
      value: expect.any(String),
    });
  });

  it('also treats Twilio WhatsApp as a WhatsApp channel', async () => {
    env.whatsapp = false;
    env.twilio = true;
    mountPage();
    expect(dispatched('inboxes/getCSATTemplateStatus')).toHaveLength(1);
  });
});

describe('CSAT page utility analyser', () => {
  const analyze = 'INBOX_MGMT.CSAT.UTILITY_ANALYZER.ACTION';
  const apply = 'INBOX_MGMT.CSAT.UTILITY_ANALYZER.APPLY';
  const mountAnalyzer = async (result, message = 'Rate us') => {
    env.whatsapp = true;
    env.captain = true;
    env.responses['inboxes/getCSATTemplateStatus'] = {};
    env.responses['inboxes/analyzeCSATTemplateUtility'] = result;
    const wrapper = mountPage({
      id: 4,
      csat_survey_enabled: true,
      csat_config: { message },
    });
    await flushPromises();
    return wrapper;
  };

  it('is hidden without Captain', async () => {
    env.whatsapp = true;
    const wrapper = mountPage();
    expect(button(wrapper, analyze)).toBeUndefined();
  });

  it('does nothing for an empty message', async () => {
    const wrapper = await mountAnalyzer({}, '  ');
    expect(button(wrapper, analyze).props('disabled')).toBe(true);
    await button(wrapper, analyze).vm.$emit('click');
    expect(dispatched('inboxes/analyzeCSATTemplateUtility')).toHaveLength(0);
  });

  it.each([
    ['LIKELY_UTILITY', 'bg-n-teal-3'],
    ['LIKELY_MARKETING', 'bg-n-ruby-3'],
    ['OTHER', 'bg-n-amber-3'],
  ])('shows the %s classification', async (classification, cls) => {
    const wrapper = await mountAnalyzer({
      classification,
      optimized_message: 'Better',
    });
    await button(wrapper, analyze).vm.$emit('click');
    await flushPromises();
    expect(dispatched('inboxes/analyzeCSATTemplateUtility')[0][1]).toEqual({
      inboxId: 4,
      template: {
        message: 'Rate us',
        button_text: 'Please rate us',
        language: 'en',
      },
    });
    const badge = wrapper.find('span.rounded-full');
    expect(badge.classes()).toContain(cls);
    const key = classification === 'OTHER' ? 'UNCLEAR' : classification;
    expect(badge.text()).toBe(
      `INBOX_MGMT.CSAT.UTILITY_ANALYZER.CLASSIFICATION.${key}`
    );
    expect(button(wrapper, apply) !== undefined).toBe(
      classification !== 'LIKELY_UTILITY'
    );
  });

  it('applies the suggestion and clears the result', async () => {
    const wrapper = await mountAnalyzer({
      classification: 'LIKELY_MARKETING',
      optimized_message: 'Better',
    });
    await button(wrapper, analyze).vm.$emit('click');
    await flushPromises();
    await button(wrapper, apply).vm.$emit('click');
    expect(wrapper.findComponent(Editor).props('modelValue')).toBe('Better');
    expect(wrapper.find('span.rounded-full').exists()).toBe(false);
  });

  it('hides apply without a suggestion and keeps the result for unchanged fields', async () => {
    const wrapper = await mountAnalyzer({ classification: 'OTHER' });
    await button(wrapper, analyze).vm.$emit('click');
    await flushPromises();
    expect(button(wrapper, apply)).toBeUndefined();
    wrapper
      .findComponent(Input)
      .vm.$emit('update:modelValue', 'Please rate us');
    await flushPromises();
    expect(wrapper.find('span.rounded-full').exists()).toBe(true);
  });

  it('clears the result when the template fields change', async () => {
    const wrapper = await mountAnalyzer({ classification: 'OTHER' });
    await wrapper.findComponent(Input).vm.$emit('update:modelValue', 'Go');
    await button(wrapper, analyze).vm.$emit('click');
    await flushPromises();
    expect(wrapper.find('span.rounded-full').exists()).toBe(true);
    await wrapper.findComponent(ComboBox).vm.$emit('update:modelValue', 'fr');
    await flushPromises();
    expect(wrapper.find('span.rounded-full').exists()).toBe(false);
  });

  it.each([
    [apiError('Quota'), 'Quota'],
    [new Error('x'), 'INBOX_MGMT.CSAT.UTILITY_ANALYZER.ERROR_MESSAGE'],
  ])('alerts when the analysis fails', async (error, message) => {
    const wrapper = await mountAnalyzer(error);
    await button(wrapper, analyze).vm.$emit('click');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(message);
    expect(button(wrapper, analyze).props('isLoading')).toBe(false);
  });
});

describe('CSAT page saving', () => {
  const surveyRules = { operator: 'contains', values: [] };

  it('saves a plain inbox without creating templates', async () => {
    const wrapper = mountPage();
    await save(wrapper);
    expect(updateInboxPayload()).toEqual({
      id: 4,
      formData: false,
      csat_survey_enabled: true,
      csat_config: {
        display_type: 'emoji',
        message: '',
        button_text: 'Please rate us',
        language: 'en',
        survey_rules: surveyRules,
      },
    });
    expect(dispatched('inboxes/createCSATTemplate')).toHaveLength(0);
    expect(useAlert).toHaveBeenCalledWith(
      'INBOX_MGMT.CSAT.API.SUCCESS_MESSAGE'
    );
    expect(dispatched('inboxes/getCSATTemplateStatus')).toHaveLength(0);
  });

  it('alerts when saving fails', async () => {
    env.responses['inboxes/updateInbox'] = new Error('x');
    const wrapper = mountPage();
    await save(wrapper);
    expect(useAlert).toHaveBeenCalledWith('INBOX_MGMT.CSAT.API.ERROR_MESSAGE');
  });

  it('creates a WhatsApp Cloud template when none exists', async () => {
    env.whatsapp = true;
    env.responses['inboxes/getCSATTemplateStatus'] = { template_exists: false };
    env.responses['inboxes/createCSATTemplate'] = {
      template: {
        name: 'csat',
        template_id: 't1',
        language: 'en',
        status: 'PENDING',
      },
    };
    const wrapper = mountPage();
    await flushPromises();
    await save(wrapper);
    expect(dispatched('inboxes/createCSATTemplate')[0][1]).toEqual({
      inboxId: 4,
      template: { message: '', button_text: 'Please rate us', language: 'en' },
    });
    expect(useAlert).toHaveBeenCalledWith(
      'INBOX_MGMT.CSAT.TEMPLATE_CREATION.SUCCESS_MESSAGE'
    );
    expect(updateInboxPayload().csat_config.template).toEqual({
      name: 'csat',
      template_id: 't1',
      language: 'en',
      status: 'PENDING',
      created_at: expect.any(String),
    });
    expect(dispatched('inboxes/getCSATTemplateStatus')).toHaveLength(2);
  });

  it('creates a Twilio template in the Twilio format', async () => {
    env.twilio = true;
    env.responses['inboxes/getCSATTemplateStatus'] = {};
    env.responses['inboxes/createCSATTemplate'] = {
      template: {
        friendly_name: 'csat',
        content_sid: 'HX1',
        language: 'en',
        status: 'approved',
      },
    };
    const wrapper = mountPage();
    await flushPromises();
    await save(wrapper);
    expect(updateInboxPayload().csat_config.template).toEqual({
      friendly_name: 'csat',
      content_sid: 'HX1',
      language: 'en',
      status: 'approved',
      created_at: expect.any(String),
    });
  });

  it('skips the template when the created template comes back empty', async () => {
    env.whatsapp = true;
    env.responses['inboxes/getCSATTemplateStatus'] = {};
    env.responses['inboxes/createCSATTemplate'] = { template: null };
    const wrapper = mountPage();
    await flushPromises();
    await save(wrapper);
    expect(updateInboxPayload().csat_config.template).toBeUndefined();
  });

  it.each([
    [apiError('Rejected'), 'Rejected'],
    [new Error('x'), 'INBOX_MGMT.CSAT.TEMPLATE_CREATION.ERROR_MESSAGE'],
  ])('stops when template creation fails', async (error, message) => {
    env.whatsapp = true;
    env.responses['inboxes/getCSATTemplateStatus'] = {};
    env.responses['inboxes/createCSATTemplate'] = error;
    const wrapper = mountPage();
    await flushPromises();
    await save(wrapper);
    expect(useAlert).toHaveBeenCalledWith(message);
    expect(dispatched('inboxes/updateInbox')).toHaveLength(0);
  });

  describe('with an existing template', () => {
    const cloudStatus = {
      template_exists: true,
      template_name: 'csat',
      template_id: 't1',
      template: { language: 'fr' },
      status: 'APPROVED',
    };
    const inbox = (extra = {}) => ({
      id: 4,
      csat_survey_enabled: true,
      csat_config: { message: 'Rate', ...extra },
    });

    it('reuses an unchanged WhatsApp Cloud template', async () => {
      env.whatsapp = true;
      env.responses['inboxes/getCSATTemplateStatus'] = cloudStatus;
      const wrapper = mountPage(inbox());
      await flushPromises();
      await save(wrapper);
      expect(dispatched('inboxes/createCSATTemplate')).toHaveLength(0);
      expect(updateInboxPayload().csat_config.template).toEqual({
        name: 'csat',
        template_id: 't1',
        language: 'fr',
        status: 'APPROVED',
      });
    });

    it('falls back to the chosen language for a Cloud template', async () => {
      env.whatsapp = true;
      env.responses['inboxes/getCSATTemplateStatus'] = {
        ...cloudStatus,
        template: undefined,
      };
      const wrapper = mountPage(inbox());
      await flushPromises();
      await save(wrapper);
      expect(updateInboxPayload().csat_config.template.language).toBe('en');
    });

    it('keeps the existing Twilio template details', async () => {
      env.twilio = true;
      env.responses['inboxes/getCSATTemplateStatus'] = {
        template_exists: true,
        status: 'approved',
      };
      const wrapper = mountPage(
        inbox({
          template: { friendly_name: 'csat', content_sid: 'HX1' },
        })
      );
      await flushPromises();
      await save(wrapper);
      expect(updateInboxPayload().csat_config.template).toEqual({
        friendly_name: 'csat',
        content_sid: 'HX1',
        language: 'en',
        status: 'approved',
      });
    });

    it('prefers the stored Twilio language and status', async () => {
      env.twilio = true;
      env.responses['inboxes/getCSATTemplateStatus'] = {
        template_exists: true,
      };
      const template = {
        friendly_name: 'csat',
        content_sid: 'HX1',
        language: 'de',
        status: 'pending',
      };
      const wrapper = mountPage(inbox({ template }));
      await flushPromises();
      await save(wrapper);
      expect(updateInboxPayload().csat_config.template).toEqual(template);
    });

    it('drops the template for Twilio without a stored template', async () => {
      env.twilio = true;
      env.responses['inboxes/getCSATTemplateStatus'] = {
        template_exists: true,
      };
      const wrapper = mountPage(inbox());
      await flushPromises();
      await save(wrapper);
      expect(updateInboxPayload().csat_config.template).toBeUndefined();
    });

    it('keeps the template without creating one while the survey is off', async () => {
      env.whatsapp = true;
      env.responses['inboxes/getCSATTemplateStatus'] = cloudStatus;
      const wrapper = mountPage({ ...inbox(), csat_survey_enabled: false });
      await flushPromises();
      await save(wrapper);
      expect(dispatched('inboxes/createCSATTemplate')).toHaveLength(0);
      expect(updateInboxPayload().csat_survey_enabled).toBe(false);
      expect(updateInboxPayload().csat_config.template.name).toBe('csat');
    });

    it.each([
      ['message', Editor, 'Changed'],
      ['button text', Input, 'Go'],
      ['language', ComboBox, 'de'],
    ])(
      'asks before replacing the template when the %s changes',
      async (_, field, value) => {
        env.whatsapp = true;
        env.responses['inboxes/getCSATTemplateStatus'] = cloudStatus;
        env.responses['inboxes/createCSATTemplate'] = {
          template: {
            name: 'csat2',
            template_id: 't2',
            language: 'en',
            status: 'PENDING',
          },
        };
        const wrapper = mountPage(inbox());
        await flushPromises();
        await wrapper.findComponent(field).vm.$emit('update:modelValue', value);
        await save(wrapper);
        expect(env.dialogOpen).toHaveBeenCalled();
        expect(dispatched('inboxes/updateInbox')).toHaveLength(0);

        await wrapper.findComponent(ConfirmDialog).vm.$emit('confirm');
        await flushPromises();
        expect(dispatched('inboxes/createCSATTemplate')).toHaveLength(1);
        expect(updateInboxPayload().csat_config.template.name).toBe('csat2');
      }
    );
  });
});
