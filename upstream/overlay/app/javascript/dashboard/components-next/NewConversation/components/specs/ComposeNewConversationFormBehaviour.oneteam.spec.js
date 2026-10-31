/**
 * OneTeam behaviour spec for the compose-new-conversation form.
 *
 * Child components are stubbed so the wiring can be checked: contact and
 * inbox selection (with signature and formatting clean-up), email
 * options, validation, sending plain, WhatsApp and Twilio messages,
 * attachments, emoji and signatures, and the Copilot reply panel.
 */
import { reactive, ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import ComposeForm from '../ComposeNewConversationForm.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/helper/editorHelper', () => ({
  appendSignature: (message, signature, type) =>
    `${message}|+${signature}@${type}`,
  removeSignature: (message, signature, type) =>
    `${message}|-${signature}@${type}`,
  getEffectiveChannelType: (type, medium) =>
    medium ? `${type}:${medium}` : type,
  stripUnsupportedMarkdown: (message, type) => `${message}|strip@${type}`,
}));
vi.mock(
  'dashboard/components-next/NewConversation/helpers/composeConversationHelper.js',
  () => ({
    buildContactableInboxesList: inboxes =>
      (inboxes || []).map(i => ({ id: i.id })),
    prepareNewMessagePayload: args => ({ kind: 'new', ...args }),
    prepareWhatsAppMessagePayload: args => ({ kind: 'whatsapp', ...args }),
  })
);
vi.mock('dashboard/composables/useCopilotReply', () => ({
  useCopilotReply: () => env.copilot,
}));
vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: events => {
    env.keys = events;
  },
}));

const names = [
  'ContactSelector',
  'InboxSelector',
  'EmailOptions',
  'MessageEditor',
  'ActionButtons',
  'InboxEmptyState',
  'AttachmentPreviews',
  'CopilotReplyBottomPanel',
];
const loose = name => ({
  name,
  inheritAttrs: false,
  setup: (_, { attrs }) => {
    env.attrs[name] = attrs;
    return () => null;
  },
});
const child = (wrapper, name) => wrapper.findComponent({ name });
const fire = (wrapper, name, event, ...args) =>
  env.attrs[name][`on${event[0].toUpperCase()}${event.slice(1)}`](...args);

const contact = {
  id: 4,
  name: 'Ann',
  contactInboxes: [{ id: 1 }, { id: 2 }],
};
const inbox = (channelType, extra = {}) => ({ id: 9, channelType, ...extra });

const mountForm = (props = {}) => {
  env.attrs = {};
  env.state = reactive({
    message: '',
    subject: '',
    ccEmails: '',
    bccEmails: '',
    attachedFiles: [],
  });
  return mount(ComposeForm, {
    props: {
      formState: env.state,
      contactConversationsUiFlags: { isCreating: false },
      contactsUiFlags: { isFetchingInboxes: false },
      currentUser: { id: 1 },
      ...props,
    },
    global: {
      stubs: Object.fromEntries(names.map(n => [n, loose(n)])),
    },
  });
};

describe('ComposeNewConversationForm behaviour', () => {
  beforeEach(() => {
    env.copilot = {
      reset: vi.fn(),
      accept: vi.fn(() => 'Copilot text'),
      isActive: ref(false),
      isButtonDisabled: ref(false),
    };
  });

  it('starts with the contact and inbox pickers and the message editor', () => {
    const wrapper = mountForm();
    expect(child(wrapper, 'InboxSelector').exists()).toBe(true);
    expect(child(wrapper, 'InboxEmptyState').exists()).toBe(false);
    expect(child(wrapper, 'EmailOptions').exists()).toBe(false);
    expect(child(wrapper, 'MessageEditor').exists()).toBe(true);
    expect(env.attrs.ActionButtons).toMatchObject({
      'has-selected-inbox': false,
      'is-whatsapp-inbox': false,
      'channel-type': '',
      'message-templates': [],
      'is-dropdown-active': false,
      'is-loading': false,
    });
    expect(env.attrs.MessageEditor.medium).toBe('');
    expect(env.attrs.ContactSelector['contactable-inboxes-list']).toEqual([]);
  });

  it('warns when the selected contact has no inbox to reach them', () => {
    const wrapper = mountForm({
      selectedContact: { id: 4, contactInboxes: [] },
    });
    expect(child(wrapper, 'InboxEmptyState').exists()).toBe(true);
    expect(child(wrapper, 'MessageEditor').exists()).toBe(false);
    expect(env.attrs.ActionButtons['has-no-inbox']).toBe(true);
  });

  it.each([
    [{ isFetchingInboxes: true }, {}],
    [{}, { contactsUiFlags: { isFetchingInboxes: true } }],
  ])('does not warn while inboxes load', (props, extra) => {
    const wrapper = mountForm({
      selectedContact: { id: 4, contactInboxes: [] },
      ...props,
      ...extra,
    });
    expect(child(wrapper, 'InboxEmptyState').exists()).toBe(false);
  });

  it('searches contacts and tracks the dropdowns', async () => {
    const wrapper = mountForm();
    fire(wrapper, 'ContactSelector', 'searchContacts', 'a');
    await flushPromises();
    expect(env.attrs.ContactSelector['show-contacts-dropdown']).toBe(false);
    fire(wrapper, 'ContactSelector', 'searchContacts', ' an ');
    await flushPromises();
    expect(env.attrs.ContactSelector['show-contacts-dropdown']).toBe(true);
    expect(env.attrs.ActionButtons['is-dropdown-active']).toBe(true);
    expect(wrapper.emitted('searchContacts')).toEqual([['a'], [' an ']]);

    fire(wrapper, 'ContactSelector', 'updateDropdown', 'contacts', false);
    await flushPromises();
    expect(env.attrs.ActionButtons['is-dropdown-active']).toBe(false);

    fire(wrapper, 'InboxSelector', 'toggleDropdown', true);
    await flushPromises();
    expect(env.attrs.InboxSelector['show-inboxes-dropdown']).toBe(true);
  });

  it('selects a contact and opens the inbox picker', async () => {
    const wrapper = mountForm();
    fire(wrapper, 'ContactSelector', 'setSelectedContact', {
      value: 4,
      action: 'contact',
      name: 'Ann',
    });
    await flushPromises();
    expect(wrapper.emitted('updateSelectedContact')).toEqual([
      [{ value: 4, action: 'contact', name: 'Ann' }],
    ]);
    expect(env.attrs.InboxSelector['show-inboxes-dropdown']).toBe(true);
    expect(env.attrs.ContactSelector['show-contacts-dropdown']).toBe(false);
  });

  it('clears the contact, stripping the signature from the message', async () => {
    const wrapper = mountForm({
      selectedContact: contact,
      targetInbox: inbox('Channel::Api'),
      messageSignature: 'Sig',
    });
    env.state.message = 'Hello';
    env.state.attachedFiles = ['f'];
    fire(wrapper, 'ContactSelector', 'clearSelectedContact');
    expect(env.copilot.reset).toHaveBeenCalledWith(false);
    expect(wrapper.emitted('clearSelectedContact')).toHaveLength(1);
    expect(env.state.message).toBe('');
    expect(env.state.attachedFiles).toEqual([]);
  });

  it('picks an inbox, re-formatting the message for its channel', async () => {
    const wrapper = mountForm({ selectedContact: contact });
    env.state.message = '**Hi**';
    env.state.attachedFiles = ['f'];
    fire(wrapper, 'InboxSelector', 'handleInboxAction', {
      value: 9,
      action: 'inbox',
      channelType: 'Channel::TwilioSms',
      medium: 'sms',
      id: 9,
    });
    expect(env.state.message).toBe('**Hi**|strip@Channel::TwilioSms:sms');
    expect(wrapper.emitted('updateTargetInbox')).toEqual([
      [{ id: 9, channelType: 'Channel::TwilioSms', medium: 'sms' }],
    ]);
    expect(env.state.attachedFiles).toEqual([]);

    // Without a channel type or a message there is nothing to strip.
    env.state.message = 'plain';
    fire(wrapper, 'InboxSelector', 'handleInboxAction', { id: 3 });
    expect(env.state.message).toBe('plain');
    env.state.message = '';
    fire(wrapper, 'InboxSelector', 'handleInboxAction', {
      channelType: 'Channel::Email',
    });
    expect(env.state.message).toBe('');
  });

  it('removes the inbox, dropping the signature and formatting', async () => {
    const wrapper = mountForm({
      selectedContact: contact,
      targetInbox: inbox('Channel::Twilio', { medium: 'whatsapp' }),
      messageSignature: 'Sig',
    });
    env.state.message = 'Hi';
    fire(wrapper, 'InboxSelector', 'updateInbox', null);
    expect(env.state.message).toBe(
      'Hi|-Sig@Channel::Twilio:whatsapp|strip@Context::Default'
    );
    expect(wrapper.emitted('updateTargetInbox')).toEqual([[null]]);

    const noSig = mountForm({ targetInbox: inbox('Channel::Api') });
    env.state.message = 'Yo';
    fire(noSig, 'InboxSelector', 'updateInbox', null);
    expect(env.state.message).toBe('Yo|strip@Context::Default');
  });

  it('shows email options and searches cc and bcc', async () => {
    const wrapper = mountForm({
      selectedContact: contact,
      targetInbox: inbox('Channel::Email'),
    });
    expect(child(wrapper, 'EmailOptions').exists()).toBe(true);
    expect(env.attrs.ActionButtons['is-email-or-web-widget-inbox']).toBe(true);

    fire(wrapper, 'EmailOptions', 'searchCcEmails', 'ab');
    await flushPromises();
    expect(env.attrs.EmailOptions['show-cc-emails-dropdown']).toBe(true);
    fire(wrapper, 'EmailOptions', 'searchBccEmails', 'x');
    await flushPromises();
    expect(env.attrs.EmailOptions['show-cc-emails-dropdown']).toBe(false);
    expect(env.attrs.EmailOptions['show-bcc-emails-dropdown']).toBe(false);
    fire(wrapper, 'EmailOptions', 'searchBccEmails', 'xy');
    await flushPromises();
    expect(env.attrs.EmailOptions['show-bcc-emails-dropdown']).toBe(true);
    fire(wrapper, 'EmailOptions', 'searchCcEmails', 'a');
    await flushPromises();
    expect(env.attrs.EmailOptions['show-bcc-emails-dropdown']).toBe(false);
    expect(wrapper.emitted('resetContactSearch')).toHaveLength(4);

    fire(wrapper, 'EmailOptions', 'updateDropdown', 'cc', true);
    fire(wrapper, 'EmailOptions', 'updateDropdown', 'bcc', true);
    await flushPromises();
    expect(env.attrs.EmailOptions['show-cc-emails-dropdown']).toBe(true);
    expect(env.attrs.EmailOptions['show-bcc-emails-dropdown']).toBe(true);

    fire(wrapper, 'EmailOptions', 'update:ccEmails', 'c@x.test');
    fire(wrapper, 'EmailOptions', 'update:bccEmails', 'b@x.test');
    fire(wrapper, 'EmailOptions', 'update:subject', 'Hello');
    expect(env.state).toMatchObject({
      ccEmails: 'c@x.test',
      bccEmails: 'b@x.test',
      subject: 'Hello',
    });
  });

  it('validates before sending, then emits the new message payload', async () => {
    const wrapper = mountForm({ targetInbox: inbox('Channel::Email') });
    fire(wrapper, 'ActionButtons', 'sendMessage');
    await flushPromises();
    expect(wrapper.emitted('createConversation')).toBeUndefined();
    expect(env.attrs.ContactSelector['has-errors']).toBe(true);
    expect(env.attrs.InboxSelector['has-errors']).toBe(false);
    expect(env.attrs.EmailOptions['has-errors']).toBe(true);
    expect(env.attrs.MessageEditor['has-errors']).toBe(true);

    await wrapper.setProps({
      selectedContact: contact,
      isDirectUploadsEnabled: true,
    });
    env.attrs.MessageEditor['onUpdate:modelValue']('Hello');
    Object.assign(env.state, { subject: 'Hi', ccEmails: 'c', bccEmails: 'b' });
    fire(wrapper, 'ActionButtons', 'sendMessage');
    await flushPromises();
    expect(wrapper.emitted('createConversation')[0][0]).toEqual({
      isFromWhatsApp: false,
      payload: {
        kind: 'new',
        targetInbox: inbox('Channel::Email'),
        selectedContact: contact,
        message: 'Hello',
        subject: 'Hi',
        ccEmails: 'c',
        bccEmails: 'b',
        currentUser: { id: 1 },
        attachedFiles: [],
        directUploadsEnabled: true,
      },
    });
    // The parent clears the shared form state itself.
    expect(env.state.message).toBe('Hello');
  });

  it('needs no message for WhatsApp, and sends templates', async () => {
    const templates = { 1: { name: 'hi' } };
    const wrapper = mountForm({
      selectedContact: contact,
      targetInbox: inbox('Channel::Whatsapp', { messageTemplates: templates }),
    });
    expect(child(wrapper, 'MessageEditor').exists()).toBe(false);
    expect(env.attrs.ActionButtons['message-templates']).toEqual(templates);
    fire(wrapper, 'ActionButtons', 'sendWhatsappMessage', {
      message: 'Hi',
      templateParams: { name: 'hi' },
    });
    await flushPromises();
    expect(wrapper.emitted('createConversation')[0][0]).toEqual({
      isFromWhatsApp: true,
      payload: {
        kind: 'whatsapp',
        targetInbox: inbox('Channel::Whatsapp', {
          messageTemplates: templates,
        }),
        selectedContact: contact,
        message: 'Hi',
        templateParams: { name: 'hi' },
        currentUser: { id: 1 },
      },
    });
  });

  it('sends Twilio WhatsApp templates and hides the editor', async () => {
    const wrapper = mountForm({
      selectedContact: contact,
      targetInbox: inbox('Channel::TwilioSms', { medium: 'whatsapp' }),
    });
    expect(child(wrapper, 'MessageEditor').exists()).toBe(false);
    expect(env.attrs.ActionButtons['is-twilio-whats-app-inbox']).toBe(true);
    expect(env.attrs.ActionButtons['is-twilio-sms-inbox']).toBe(false);
    fire(wrapper, 'ActionButtons', 'sendTwilioMessage', {
      message: 'Yo',
      templateParams: {},
    });
    await flushPromises();
    expect(wrapper.emitted('createConversation')[0][0].payload.kind).toBe(
      'whatsapp'
    );
  });

  it('flags Twilio SMS and web widget inboxes', () => {
    mountForm({ targetInbox: inbox('Channel::TwilioSms', { medium: 'sms' }) });
    expect(env.attrs.ActionButtons['is-twilio-sms-inbox']).toBe(true);
    expect(env.attrs.MessageEditor.medium).toBe('sms');
    mountForm({ targetInbox: inbox('Channel::WebWidget') });
    expect(env.attrs.ActionButtons['is-email-or-web-widget-inbox']).toBe(true);
  });

  it('handles emoji, signatures, attachments and discard', async () => {
    const wrapper = mountForm({ targetInbox: inbox('Channel::Api') });
    env.state.message = 'Hi';
    fire(wrapper, 'ActionButtons', 'insertEmoji', '👋');
    expect(env.state.message).toBe('Hi👋');
    fire(wrapper, 'ActionButtons', 'addSignature', 'Sig');
    expect(env.state.message).toBe('Hi👋|+Sig@Channel::Api');
    fire(wrapper, 'ActionButtons', 'removeSignature', 'Sig');
    expect(env.state.message).toBe('Hi👋|+Sig@Channel::Api|-Sig@Channel::Api');

    fire(wrapper, 'ActionButtons', 'attachFile', ['a', 'b']);
    await flushPromises();
    expect(env.attrs.AttachmentPreviews.attachments).toEqual(['a', 'b']);
    fire(wrapper, 'AttachmentPreviews', 'update:attachments', ['a']);
    expect(env.state.attachedFiles).toEqual(['a']);

    fire(wrapper, 'ActionButtons', 'discard');
    expect(wrapper.emitted('discard')).toHaveLength(1);
  });

  it('shows the Copilot panel and accepts with the keyboard shortcut', async () => {
    env.copilot.isActive.value = true;
    const wrapper = mountForm();
    expect(child(wrapper, 'ActionButtons').exists()).toBe(false);
    expect(env.attrs.CopilotReplyBottomPanel['is-generating-content']).toBe(
      false
    );

    env.copilot.isButtonDisabled.value = true;
    env.keys['$mod+Enter'].action();
    expect(env.copilot.accept).not.toHaveBeenCalled();

    env.copilot.isButtonDisabled.value = false;
    env.keys['$mod+Enter'].action();
    expect(env.state.message).toBe('Copilot text');

    env.state.message = '';
    fire(wrapper, 'CopilotReplyBottomPanel', 'submit');
    expect(env.state.message).toBe('Copilot text');
    fire(wrapper, 'CopilotReplyBottomPanel', 'cancel');
    expect(env.copilot.reset).toHaveBeenCalled();

    env.copilot.isActive.value = false;
    env.copilot.accept.mockClear();
    env.keys['$mod+Enter'].action();
    expect(env.copilot.accept).not.toHaveBeenCalled();
  });

  it('treats a copilot without an active flag as inactive', () => {
    env.copilot.isActive = undefined;
    const wrapper = mountForm();
    expect(child(wrapper, 'ActionButtons').exists()).toBe(true);
  });
});
