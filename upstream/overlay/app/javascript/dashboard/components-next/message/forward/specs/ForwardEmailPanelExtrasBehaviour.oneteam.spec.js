/**
 * OneTeam behaviour spec for the forward email panel extras.
 *
 * Covers contact search failures and stale searches, the bcc row
 * search and outside click, signatures, and inserting emoji. The mount
 * harness mirrors the upstream ForwardEmailPanel spec.
 */
import { defineComponent, ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import { withFullI18n } from 'test-i18n';
import { createContactSearcher } from 'dashboard/components-next/NewConversation/helpers/composeConversationHelper';
import Button from 'dashboard/components-next/button/Button.vue';
import ForwardEmailPanel from '../ForwardEmailPanel.vue';
import { provideMessageContext } from '../../provider.js';
import { MESSAGE_TYPES } from '../../constants';

vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({ fetchSignatureFlagFromUISettings: () => false }),
}));

vi.mock(
  'dashboard/components-next/NewConversation/helpers/composeConversationHelper',
  async importOriginal => ({
    ...(await importOriginal()),
    createContactSearcher: vi.fn(),
  })
);

withFullI18n();

Object.defineProperty(HTMLElement.prototype, 'innerText', {
  configurable: true,
  get() {
    return this.textContent;
  },
});

const stub = (name, props, emits = []) => ({
  name,
  props,
  emits,
  template: '<div><slot /></div>',
});

const stubs = {
  ContextMenu: {
    name: 'ContextMenu',
    props: ['x', 'y', 'closeOnFocusOut'],
    template: '<div><slot /></div>',
  },
  InboxSelector: stub('InboxSelector', ['targetInbox', 'removable']),
  RecipientsInput: stub(
    'RecipientsInput',
    ['modelValue', 'contacts', 'showDropdown', 'isLoading'],
    ['update:modelValue', 'input', 'onClickOutside']
  ),
  MessageEditor: stub(
    'MessageEditor',
    { modelValue: String, placeholder: String, compact: Boolean },
    ['update:modelValue']
  ),
  AttachmentPreviews: stub(
    'AttachmentPreviews',
    ['attachments'],
    ['update:attachments']
  ),
  ActionButtons: stub(
    'ActionButtons',
    ['disableSendButton', 'attachedFiles', 'isDropdownActive'],
    [
      'sendMessage',
      'discard',
      'attachFile',
      'insertEmoji',
      'addSignature',
      'removeSignature',
    ]
  ),
};

const contact = { name: 'Jane Doe', email: 'jane@example.com' };
const inbox = {
  id: 9,
  name: 'Support',
  email: 'support@example.com',
  channel_type: 'Channel::Email',
};
const email = {
  from: ['jane@example.com'],
  to: ['support@example.com'],
  date: '2026-09-17T09:39:00Z',
  subject: 'Order #42',
  htmlContent: { full: '<p>Original body</p>' },
  textContent: { full: 'Original body' },
};
const attachment = {
  id: 7,
  thumbUrl: 'https://cdn.example.com/thumb.png',
  dataUrl: 'https://cdn.example.com/files/invoice.pdf',
  fileType: 'file',
};

const mountPanel = ({ message = {}, directUploadsEnabled = false } = {}) => {
  const sendMessage = vi.fn();
  const store = createStore({
    getters: {
      getSelectedChat: () => ({
        meta: { sender: contact },
        additional_attributes: { mail_subject: 'Conversation subject' },
      }),
      getCurrentUser: () => ({
        name: 'Agent Smith',
        avatar_url: 'https://cdn.example.com/agent.png',
      }),
      'globalConfig/get': () => ({ directUploadsEnabled }),
      getMessageSignature: () => '',
      'inboxes/getInbox': () => () => inbox,
      getSelectedChatAttachments: () => [],
    },
    actions: { createPendingMessageAndSend: sendMessage },
  });
  const context = {
    id: 501,
    content: 'Plain fallback',
    contentAttributes: { email },
    attachments: [attachment],
    messageType: MESSAGE_TYPES.INCOMING,
    sender: contact,
    createdAt: 1789000000,
    conversationId: 77,
    inboxId: 9,
    ...message,
  };
  const Host = defineComponent({
    components: { ForwardEmailPanel },
    setup() {
      provideMessageContext(
        Object.fromEntries(
          Object.entries(context).map(([key, value]) => [key, ref(value)])
        )
      );
    },
    template: '<ForwardEmailPanel :x="10" :y="20" @close="$emit(\'close\')" />',
  });
  const wrapper = mount(Host, {
    attachTo: document.body,
    global: { plugins: [store], stubs },
  });

  return { wrapper, sendMessage };
};

const find = (wrapper, name) => wrapper.findComponent({ name });

describe('ForwardEmailPanel extras', () => {
  let searchContacts;

  beforeEach(() => {
    document.execCommand = vi.fn();
    searchContacts = vi.fn().mockResolvedValue([]);
    createContactSearcher.mockReturnValue(searchContacts);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('alerts on search failures and ignores stale searches', async () => {
    vi.useFakeTimers();
    const { wrapper } = mountPanel();
    const recipients = find(wrapper, 'RecipientsInput');
    searchContacts.mockRejectedValueOnce(new Error('down'));
    await recipients.vm.$emit('input', 'ab');
    vi.advanceTimersByTime(400);
    await flushPromises();
    expect(recipients.props('isLoading')).toBe(false);
    searchContacts.mockResolvedValueOnce(null);
    await recipients.vm.$emit('input', 'abc');
    vi.advanceTimersByTime(400);
    await flushPromises();
    expect(recipients.props('isLoading')).toBe(true);
  });

  it('searches from the bcc row and closes its dropdown', async () => {
    vi.useFakeTimers();
    const { wrapper } = mountPanel();
    await wrapper.findComponent(Button).trigger('click');
    const bcc = wrapper.findAllComponents({ name: 'RecipientsInput' })[2];
    await bcc.vm.$emit('input', 'au');
    vi.advanceTimersByTime(400);
    await flushPromises();
    expect(bcc.props('showDropdown')).toBe(true);
    await bcc.vm.$emit('onClickOutside');
    expect(bcc.props('showDropdown')).toBe(false);
  });

  it('adds and removes signatures and inserts emoji', async () => {
    const { wrapper } = mountPanel();
    const actions = find(wrapper, 'ActionButtons');
    const editor = find(wrapper, 'MessageEditor');
    await actions.vm.$emit('insertEmoji', '😀');
    expect(editor.props('modelValue')).toBe('😀');
    await actions.vm.$emit('addSignature', 'Thanks, Agent');
    expect(editor.props('modelValue')).toContain('Thanks, Agent');
    await actions.vm.$emit('removeSignature', 'Thanks, Agent');
    expect(editor.props('modelValue')).not.toContain('Thanks, Agent');
  });
});
