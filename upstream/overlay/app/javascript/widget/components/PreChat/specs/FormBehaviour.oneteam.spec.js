/**
 * OneTeam behaviour spec for the widget pre-chat form.
 *
 * FormKit is stubbed so the props the form hands it can be checked: which
 * fields show for the current visitor, their types, options and
 * validation rules, the header message for campaigns, the input classes,
 * and the payload emitted on submit.
 */
import { mount, flushPromises } from '@vue/test-utils';
import PreChatForm from '../Form.vue';

const FormKitStub = {
  name: 'FormKit',
  props: [
    'modelValue',
    'name',
    'type',
    'label',
    'placeholder',
    'validation',
    'options',
    'inputClass',
    'validationMessages',
  ],
  emits: ['update:modelValue', 'submit'],
  template: '<div class="fk" :data-name="name"><slot /></div>',
};

const field = (name, extra = {}) => ({
  name,
  label: `${name} label`,
  placeholder: `${name} placeholder`,
  type: 'text',
  enabled: true,
  required: false,
  field_type: 'standard',
  ...extra,
});

const standardFields = [
  field('emailAddress', { type: 'email', required: true }),
  field('fullName'),
  field('phoneNumber', { type: 'text' }),
];

const mountForm = ({
  fields = standardFields,
  enabled = true,
  campaign = {},
  user = {},
  creating = false,
  routing = false,
  preChatMessage = 'Hi there',
  withOptions = true,
} = {}) => {
  window.chatwootWebChannel = { preChatFormEnabled: enabled };
  return mount(PreChatForm, {
    props: withOptions
      ? { options: { preChatFields: fields, preChatMessage } }
      : {},
    global: {
      mocks: {
        $store: {
          getters: {
            'appConfig/getWidgetColor': '#1f93ff',
            'conversation/getIsCreating': creating,
            'appConfig/getIsUpdatingRoute': routing,
            'campaign/getActiveCampaign': campaign,
            'contacts/getCurrentUser': user,
          },
        },
      },
      directives: {
        dompurifyHtml: (el, { value }) => {
          el.innerHTML = value;
        },
      },
      stubs: {
        FormKit: FormKitStub,
        CustomButton: {
          name: 'CustomButton',
          props: ['disabled', 'bgColor', 'textColor'],
          template:
            '<button class="submit" :disabled="disabled"><slot /></button>',
        },
        Spinner: { template: '<i class="spinner" />' },
      },
    },
  });
};

const inputs = wrapper =>
  wrapper
    .findAllComponents(FormKitStub)
    .filter(c => c.props('type') !== 'form');
const byName = (wrapper, name) =>
  inputs(wrapper).find(c => c.props('name') === name);
const form = wrapper =>
  wrapper.findAllComponents(FormKitStub).find(c => c.props('type') === 'form');

describe('Widget pre-chat form behaviour', () => {
  it('shows the configured fields, the header message and the message box', () => {
    const wrapper = mountForm();
    expect(inputs(wrapper).map(c => c.props('name'))).toEqual([
      'emailAddress',
      'fullName',
      'phoneNumber',
      'message',
    ]);
    expect(wrapper.html()).toContain('Hi there');
    const email = byName(wrapper, 'emailAddress');
    expect(email.props()).toMatchObject({
      type: 'email',
      label: 'emailAddress label',
      placeholder: 'emailAddress placeholder',
      validation: [['required'], ['email']],
    });
    expect(email.props('options')).toBeUndefined();
    // The phone number uses the custom phone input.
    expect(typeof byName(wrapper, 'phoneNumber').props('type')).toBe('object');
    expect(byName(wrapper, 'phoneNumber').props('validation')).toEqual([
      ['optional'],
      ['startsWithPlus'],
      ['isValidPhoneNumber'],
    ]);
    expect(byName(wrapper, 'fullName').props('validation')).toEqual([
      ['optional'],
    ]);
    expect(wrapper.find('.spinner').exists()).toBe(false);
    expect(
      wrapper.findComponent({ name: 'CustomButton' }).props()
    ).toMatchObject({
      disabled: false,
      bgColor: '#1f93ff',
    });
  });

  it('hides header and fields when the pre-chat form is disabled', () => {
    const wrapper = mountForm({ enabled: false });
    expect(inputs(wrapper).map(c => c.props('name'))).toEqual(['message']);
    expect(wrapper.find('.mb-4').exists()).toBe(false);
  });

  it('renders only the message box without options while disabled', () => {
    // The `options` default is `() => {}`, which returns undefined, so the
    // form only survives without options while the pre-chat form is off.
    const wrapper = mountForm({ enabled: false, withOptions: false });
    expect(wrapper.props('options')).toBeUndefined();
    expect(inputs(wrapper).map(c => c.props('name'))).toEqual(['message']);
  });

  it('hides the header when no pre-chat message is set', () => {
    const wrapper = mountForm({ preChatMessage: '' });
    expect(wrapper.find('.mb-4').exists()).toBe(false);
  });

  it('uses the campaign header and drops the message box for campaigns', () => {
    const wrapper = mountForm({ enabled: false, campaign: { id: 4 } });
    expect(wrapper.find('.mb-4').exists()).toBe(true);
    expect(byName(wrapper, 'message')).toBeUndefined();
  });

  it('skips fields the visitor has already given', () => {
    expect(
      inputs(mountForm({ user: { has_email: true } })).map(c => c.props('name'))
    ).toEqual(['phoneNumber', 'message']);
    expect(
      inputs(mountForm({ user: { has_phone_number: true } })).map(c =>
        c.props('name')
      )
    ).toEqual(['emailAddress', 'message']);
    expect(
      inputs(mountForm({ user: { identifier: 'u-1' } })).map(c =>
        c.props('name')
      )
    ).toEqual(['emailAddress', 'phoneNumber', 'message']);
  });

  it('skips disabled fields', () => {
    const wrapper = mountForm({
      fields: [field('fullName', { enabled: false }), field('emailAddress')],
    });
    expect(inputs(wrapper).map(c => c.props('name'))).toEqual([
      'emailAddress',
      'message',
    ]);
  });

  it('maps custom attribute types and validation', () => {
    const wrapper = mountForm({
      fields: [
        field('site', { type: 'link', field_type: 'contact_attribute' }),
        field('plan', {
          type: 'list',
          values: ['Free', 'Pro'],
          field_type: 'conversation_attribute',
          required: true,
        }),
        field('born', { type: 'date', field_type: 'contact_attribute' }),
        field('agree', {
          type: 'checkbox',
          field_type: 'contact_attribute',
          required: true,
        }),
        field('code', {
          type: 'text',
          field_type: 'contact_attribute',
          regex_pattern: '/^[A-Z]+$/gi',
          regex_cue: 'Capitals only',
        }),
        field('seats', { type: 'number', field_type: 'custom' }),
        field('notes', { type: 'text', field_type: 'conversation_attribute' }),
      ],
    });
    expect(byName(wrapper, 'site').props()).toMatchObject({
      type: 'url',
      validation: [['optional'], ['url']],
    });
    const plan = byName(wrapper, 'plan');
    expect(plan.props()).toMatchObject({
      type: 'select',
      options: { 0: 'Free', 1: 'Pro' },
      validation: [['required']],
    });
    expect(byName(wrapper, 'born').props('validation')).toEqual([
      ['optional'],
      ['date'],
    ]);
    expect(byName(wrapper, 'agree').props('validation')).toEqual([
      ['accepted'],
    ]);
    const code = byName(wrapper, 'code');
    const [[, regex]] = code.props('validation').slice(1);
    expect(regex.flags).toBe('i');
    expect(regex.test('ABC')).toBe(true);
    expect(regex.test('ABC')).toBe(true);
    expect(code.props('validationMessages').matches).toBe('Capitals only');
    expect(byName(wrapper, 'seats').props('validation')).toEqual([
      ['optional'],
    ]);
    expect(byName(wrapper, 'notes').props('validation')).toEqual([
      ['optional'],
    ]);
    // Without a cue, the generic regex error is used.
    const genericCue = byName(wrapper, 'notes').props(
      'validationMessages'
    ).matches;
    expect(genericCue).toBeTruthy();
    expect(genericCue).not.toBe('Capitals only');
  });

  it('returns no rules for fields it does not know', () => {
    const wrapper = mountForm({
      fields: [field('nickname', { type: 'weird', field_type: 'standard' })],
    });
    expect(byName(wrapper, 'nickname').props('validation')).toBe('');
  });

  it('builds input classes and tracks phone input errors', async () => {
    const wrapper = mountForm();
    const inputClass = byName(wrapper, 'emailAddress').props('inputClass');
    expect(
      inputClass({ context: { state: {}, family: 'box', type: 'checkbox' } })
    ).toBe('');
    expect(
      inputClass({ context: { state: {}, family: 'text', type: 'text' } })
    ).toBe('mt-1 rounded w-full py-2 px-3');
    inputClass({
      context: { state: { invalid: true }, family: 'text', type: 'phoneInput' },
    });
    await flushPromises();
    expect(wrapper.vm.hasErrorInPhoneInput).toBe(true);
    expect(
      byName(wrapper, 'message').props('inputClass')({
        context: { state: {}, family: 'text', type: 'textarea' },
      })
    ).toBe('mt-1 rounded w-full py-2 px-3');
  });

  it('shows a spinner and disables submit while creating or routing', () => {
    let wrapper = mountForm({ creating: true });
    expect(wrapper.find('.spinner').exists()).toBe(true);
    expect(wrapper.find('.submit').attributes()).toHaveProperty('disabled');
    wrapper = mountForm({ routing: true });
    expect(wrapper.find('.spinner').exists()).toBe(true);
  });

  it('emits the contact details and custom attributes on submit', async () => {
    const wrapper = mountForm({
      campaign: { id: 9 },
      fields: [
        ...standardFields,
        field('plan', {
          type: 'list',
          values: ['Free', 'Pro'],
          field_type: 'conversation_attribute',
        }),
        field('company', { field_type: 'contact_attribute' }),
        field('team', { field_type: 'contact_attribute' }),
      ],
    });
    form(wrapper).vm.$emit('update:modelValue', {
      emailAddress: 'a@b.test',
      fullName: 'Ann',
      phoneNumber: '+15550000',
      message: 'Help',
      plan: '1',
      company: 'Acme',
    });
    await flushPromises();
    form(wrapper).vm.$emit('submit');
    expect(wrapper.emitted('submitPreChat')[0][0]).toEqual({
      fullName: 'Ann',
      phoneNumber: '+15550000',
      emailAddress: 'a@b.test',
      message: 'Help',
      activeCampaignId: 9,
      conversationCustomAttributes: { plan: 'Pro' },
      contactCustomAttributes: { company: 'Acme', team: null },
    });
  });
});
