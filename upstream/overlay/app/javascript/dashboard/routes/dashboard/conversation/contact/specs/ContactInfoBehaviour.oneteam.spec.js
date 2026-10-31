/**
 * OneTeam behaviour spec for the conversation sidebar contact card.
 *
 * Covers what the card shows (name, rows, location flag, WhatsApp and
 * social profiles, company link with the companies feature), inline name
 * editing, field updates with their success and error alerts, and the
 * action buttons (edit, merge, delete for admins).
 */
import { mount, flushPromises } from '@vue/test-utils';
import ContactInfo from '../ContactInfo.vue';
import {
  DuplicateContactException,
  ExceptionWithMessage,
} from 'shared/helpers/CustomErrors';

const env = vi.hoisted(() => ({ isAdmin: true }));

vi.mock('dashboard/composables', () => ({
  useAlert: (...args) => env.alert(...args),
}));
vi.mock('dashboard/composables/useAdmin', async () => {
  const { ref } = await import('vue');
  return { useAdmin: () => ({ isAdmin: ref(env.isAdmin) }) };
});
vi.mock('shared/composables/useExactTimestamp', () => ({
  useExactTimestamp: () => ts => `exact:${ts}`,
}));

const named = (
  name,
  props = [],
  template = '<div><slot name="trigger" /></div>'
) => ({
  name,
  props,
  emits: [
    'update',
    'deleted',
    'cancel',
    'click',
    'enterPress',
    'escapePress',
    'blur',
    'update:modelValue',
  ],
  template,
});

const stubs = {
  Avatar: named('Avatar', ['name', 'src']),
  ContactInfoRow: named(
    'ContactInfoRow',
    ['value', 'href', 'title', 'editable'],
    '<div class="row" />'
  ),
  SocialProfileLinks: named('SocialProfileLinks', ['profiles']),
  ComposeConversation: named('ComposeConversation', ['contactId']),
  ViewAllConversations: named('ViewAllConversations'),
  VoiceCallButton: named('VoiceCallButton', [
    'phone',
    'contactId',
    'conversationId',
  ]),
  ContactMergeModal: named('ContactMergeModal', ['primaryContact']),
  ContactDeleteModal: named('ContactDeleteModal', ['contact']),
  EditContact: named('EditContact', ['show', 'contact']),
  NextButton: named(
    'NextButton',
    ['icon', 'disabled'],
    '<button :data-icon="icon" :disabled="disabled" @click="$emit(\'click\')" />'
  ),
  InlineInput: {
    name: 'InlineInput',
    props: ['modelValue'],
    emits: ['update:modelValue', 'enterPress', 'escapePress', 'blur'],
    methods: { focus: () => env.focus() },
    template: '<input class="inline" />',
  },
};

const baseContact = (extra = {}) => ({
  id: 4,
  name: 'Ann',
  email: 'ann@x.test',
  phone_number: '+15550001',
  created_at: 100,
  additional_attributes: {},
  ...extra,
});

const mountInfo = (
  props = {},
  { companies = false, chat = { id: 8 } } = {}
) => {
  env.store = {
    dispatch: vi.fn((...args) => env.dispatch(...args)),
    getters: {
      'contacts/getUIFlags': { isMerging: true, isDeleting: false },
      getSelectedChat: chat,
      'accounts/isFeatureEnabledonAccount': vi.fn(() => companies),
    },
  };
  return mount(ContactInfo, {
    props: { contact: baseContact(), ...props },
    global: {
      stubs,
      directives: { tooltip: {} },
      mocks: { $store: env.store, $route: { params: { accountId: '1' } } },
    },
  });
};

const rows = wrapper => wrapper.findAllComponents({ name: 'ContactInfoRow' });
const row = (wrapper, title) =>
  rows(wrapper).find(r => r.props('title') === title);
const button = (wrapper, icon) => wrapper.find(`[data-icon="${icon}"]`);

describe('ContactInfo behaviour', () => {
  beforeEach(() => {
    env.isAdmin = true;
    env.alert = vi.fn();
    env.focus = vi.fn();
    env.dispatch = vi.fn(() => Promise.resolve());
  });

  it('shows the contact and fetches its contactable inboxes', () => {
    const wrapper = mountInfo();
    expect(env.store.dispatch).toHaveBeenCalledWith(
      'contacts/fetchContactableInbox',
      4
    );
    expect(wrapper.find('h3').text()).toBe('Ann');
    expect(wrapper.find('a').attributes('href')).toBe(
      '/app/accounts/1/contacts/4'
    );
    expect(wrapper.find('.i-lucide-info').exists()).toBe(true);
    expect(row(wrapper, 'CONTACT_PANEL.EMAIL_ADDRESS').props('href')).toBe(
      'mailto:ann@x.test'
    );
    expect(row(wrapper, 'CONTACT_PANEL.PHONE_NUMBER').props('href')).toBe(
      'tel:+15550001'
    );
    expect(row(wrapper, 'CONTACT_PANEL.COMPANY').props()).toMatchObject({
      href: '',
      editable: true,
    });
    expect(row(wrapper, 'CONTACT_PANEL.LOCATION')).toBeUndefined();
    expect(row(wrapper, 'CONTACT_PANEL.IDENTIFIER')).toBeUndefined();
    expect(row(wrapper, 'CONTACT_PANEL.WHATSAPP_USERNAME')).toBeUndefined();
    expect(
      wrapper.findComponent({ name: 'SocialProfileLinks' }).props('profiles')
    ).toEqual({ twitter: '', telegram: '' });
    expect(
      wrapper.findComponent({ name: 'VoiceCallButton' }).props()
    ).toMatchObject({ phone: '+15550001', contactId: 4, conversationId: 8 });
    expect(
      wrapper.findComponent({ name: 'ComposeConversation' }).props('contactId')
    ).toBe('4');
    expect(button(wrapper, 'i-ph-arrows-merge').element.disabled).toBe(true);
    expect(button(wrapper, 'i-ph-trash').element.disabled).toBe(false);
  });

  it('hides the header without an avatar and handles a bare contact', () => {
    const wrapper = mountInfo(
      {
        showAvatar: false,
        contact: { id: 5, additional_attributes: { location: 'Somewhere' } },
      },
      { chat: null }
    );
    expect(wrapper.findComponent({ name: 'Avatar' }).exists()).toBe(false);
    expect(wrapper.find('h3').exists()).toBe(false);
    expect(row(wrapper, 'CONTACT_PANEL.EMAIL_ADDRESS').props('href')).toBe('');
    expect(row(wrapper, 'CONTACT_PANEL.PHONE_NUMBER').props('href')).toBe('');
    expect(row(wrapper, 'CONTACT_PANEL.LOCATION').props('value')).toBe(
      'Somewhere'
    );
    expect(
      wrapper.findComponent({ name: 'VoiceCallButton' }).props('conversationId')
    ).toBeUndefined();
  });

  it('uses an empty contact by default', () => {
    const wrapper = mount(ContactInfo, {
      global: {
        stubs,
        directives: { tooltip: {} },
        mocks: {
          $store: {
            dispatch: vi.fn(),
            getters: {
              'contacts/getUIFlags': {},
              getSelectedChat: null,
              'accounts/isFeatureEnabledonAccount': () => false,
            },
          },
          $route: { params: { accountId: '1' } },
        },
      },
    });
    expect(wrapper.find('.i-lucide-info').exists()).toBe(false);
  });

  it.each([
    [
      { city: 'Pune', country: 'India', country_code: 'IN' },
      'Pune, India <span class="fi fi-in size-3.5"></span>',
    ],
    [{ country: 'India' }, 'India 🌎'],
    [{ city: 'Pune', country_code: 5, location: 'Fallback' }, 'Fallback'],
  ])('shows the location for %o', (attrs, expected) => {
    const wrapper = mountInfo({
      contact: baseContact({ additional_attributes: attrs }),
    });
    expect(row(wrapper, 'CONTACT_PANEL.LOCATION').props('value')).toBe(
      expected
    );
  });

  it('shows the description, identifier, WhatsApp and social profiles', () => {
    const wrapper = mountInfo({
      contact: baseContact({
        identifier: 'u-1',
        additional_attributes: {
          description: 'VIP',
          social_profiles: {
            whatsapp: '@@ann',
            github: 'ann',
            twitter: 'tw',
            telegram: 'tg',
          },
        },
      }),
    });
    expect(wrapper.find('p').text()).toBe('VIP');
    expect(row(wrapper, 'CONTACT_PANEL.IDENTIFIER').props('value')).toBe('u-1');
    expect(row(wrapper, 'CONTACT_PANEL.WHATSAPP_USERNAME').props('value')).toBe(
      '@ann'
    );
    expect(
      wrapper.findComponent({ name: 'SocialProfileLinks' }).props('profiles')
    ).toEqual({
      whatsapp: '@@ann',
      github: 'ann',
      twitter: 'tw',
      telegram: 'tg',
    });
  });

  it('falls back to the legacy social fields', () => {
    const wrapper = mountInfo({
      contact: baseContact({
        additional_attributes: {
          screen_name: 'tw2',
          social_telegram_user_name: 'tg2',
          social_whatsapp_user_name: 12345,
        },
      }),
    });
    expect(
      wrapper.findComponent({ name: 'SocialProfileLinks' }).props('profiles')
    ).toEqual({ twitter: 'tw2', telegram: 'tg2' });
    expect(row(wrapper, 'CONTACT_PANEL.WHATSAPP_USERNAME').props('value')).toBe(
      '@12345'
    );
  });

  it('links the company when the companies feature is on', () => {
    const wrapper = mountInfo(
      {
        contact: baseContact({
          company_id: 3,
          additional_attributes: { company_name: 'Acme' },
        }),
      },
      { companies: true }
    );
    expect(row(wrapper, 'CONTACT_PANEL.COMPANY').props()).toMatchObject({
      href: '/app/accounts/1/companies/3',
      value: 'Acme',
      editable: false,
    });
    expect(
      env.store.getters['accounts/isFeatureEnabledonAccount']
    ).toHaveBeenCalledWith(1, 'companies');
    const noCompany = mountInfo({}, { companies: true });
    expect(row(noCompany, 'CONTACT_PANEL.COMPANY').props('href')).toBe('');
  });

  it('fetches inboxes again when the contact changes', async () => {
    const wrapper = mountInfo();
    await wrapper.setProps({ contact: baseContact({ id: 9 }) });
    expect(env.store.dispatch).toHaveBeenLastCalledWith(
      'contacts/fetchContactableInbox',
      9
    );
  });

  it('edits the name inline and saves a changed, trimmed name', async () => {
    const wrapper = mountInfo();
    await wrapper.find('h3').trigger('click');
    await flushPromises();
    expect(env.focus).toHaveBeenCalled();
    const input = wrapper.findComponent({ name: 'InlineInput' });
    expect(input.props('modelValue')).toBe('Ann');
    expect(button(wrapper, 'i-lucide-pencil').classes()).toContain('invisible');

    input.vm.$emit('update:modelValue', '  Ann B  ');
    input.vm.$emit('enterPress');
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenCalledWith('contacts/update', {
      id: 4,
      name: 'Ann B',
    });
    expect(env.alert).toHaveBeenCalledWith('CONTACT_FORM.SUCCESS_MESSAGE');
    expect(wrapper.find('h3').exists()).toBe(true);
  });

  it('does not save an unchanged or blank name, and cancels with Escape', async () => {
    const wrapper = mountInfo({ contact: baseContact({ name: undefined }) });
    await button(wrapper, 'i-lucide-pencil').trigger('click');
    let input = wrapper.findComponent({ name: 'InlineInput' });
    expect(input.props('modelValue')).toBe('');
    input.vm.$emit('blur');
    await flushPromises();
    expect(env.store.dispatch).not.toHaveBeenCalledWith(
      'contacts/update',
      expect.anything()
    );
    // A second blur after closing is ignored.
    wrapper.vm.saveNameEdit();

    await wrapper.setProps({ contact: baseContact() });
    await wrapper.find('h3').trigger('click');
    input = wrapper.findComponent({ name: 'InlineInput' });
    input.vm.$emit('enterPress');
    await flushPromises();
    expect(env.store.dispatch).not.toHaveBeenCalledWith(
      'contacts/update',
      expect.anything()
    );

    await wrapper.find('h3').trigger('click');
    wrapper
      .findComponent({ name: 'InlineInput' })
      .vm.$emit('update:modelValue', 'X');
    wrapper.findComponent({ name: 'InlineInput' }).vm.$emit('escapePress');
    await flushPromises();
    expect(wrapper.find('h3').text()).toBe('Ann');
  });

  it('updates email, phone and company from the rows', async () => {
    const wrapper = mountInfo({
      contact: baseContact({ additional_attributes: { city: 'Pune' } }),
    });
    row(wrapper, 'CONTACT_PANEL.EMAIL_ADDRESS').vm.$emit('update', 'b@x.test');
    row(wrapper, 'CONTACT_PANEL.PHONE_NUMBER').vm.$emit('update', '+1');
    row(wrapper, 'CONTACT_PANEL.COMPANY').vm.$emit('update', 'Acme');
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenCalledWith('contacts/update', {
      id: 4,
      email: 'b@x.test',
    });
    expect(env.store.dispatch).toHaveBeenCalledWith('contacts/update', {
      id: 4,
      phone_number: '+1',
    });
    expect(env.store.dispatch).toHaveBeenCalledWith('contacts/update', {
      id: 4,
      additional_attributes: { city: 'Pune', company_name: 'Acme' },
    });
  });

  const duplicate = (data, message) => {
    const error = new DuplicateContactException(data);
    if (message) error.message = message;
    return error;
  };

  it.each([
    [duplicate(['email'], 'Taken by Bob'), 'Taken by Bob'],
    [duplicate(['email']), 'CONTACT_FORM.FORM.EMAIL_ADDRESS.DUPLICATE'],
    [duplicate(['phone_number']), 'CONTACT_FORM.FORM.PHONE_NUMBER.DUPLICATE'],
    [duplicate({}), 'CONTACT_FORM.ERROR_MESSAGE'],
    [new ExceptionWithMessage('Bad'), 'Bad'],
    [new Error('Boom'), 'Boom'],
    [new Error(''), 'CONTACT_FORM.ERROR_MESSAGE'],
  ])('alerts on a failed update (%#)', async (error, message) => {
    const wrapper = mountInfo();
    env.dispatch = vi.fn(() => Promise.reject(error));
    row(wrapper, 'CONTACT_PANEL.EMAIL_ADDRESS').vm.$emit('update', 'x');
    await flushPromises();
    expect(env.alert).toHaveBeenCalledWith(message);
  });

  it('opens and closes the edit modal and closes the panel on delete', async () => {
    const wrapper = mountInfo();
    const edit = wrapper.findComponent({ name: 'EditContact' });
    await button(wrapper, 'i-ph-pencil-simple').trigger('click');
    expect(edit.props('show')).toBe(true);
    edit.vm.$emit('cancel');
    await flushPromises();
    expect(edit.props('show')).toBe(false);
    wrapper.findComponent({ name: 'ContactDeleteModal' }).vm.$emit('deleted');
    expect(wrapper.emitted('panelClose')).toHaveLength(1);
  });

  it('hides delete for agents', () => {
    env.isAdmin = false;
    const wrapper = mountInfo();
    expect(wrapper.findComponent({ name: 'ContactDeleteModal' }).exists()).toBe(
      false
    );
  });
});
