/**
 * OneTeam render smoke tests for dashboard/components-next: every component
 * renders its empty state. See renderHarness.js.
 */
import { ref } from 'vue';
import Message from 'dashboard/components-next/message/Message.vue';
import { provideMessageContext } from 'dashboard/components-next/message/provider.js';
import { provideSidebarContext } from 'dashboard/components-next/sidebar/provider.js';
import { provideDropdownContext } from 'dashboard/components-next/dropdown-menu/base/provider.js';
import { PLATFORMS } from 'dashboard/services/TemplateConstants';
import { defineSmokeSuite, loadStore, propRefs } from './renderHarness';

// One attachment of every kind the bubbles read (file, contact, location).
const attachment = {
  fileType: 'file',
  dataUrl: 'https://example.test/files/report.pdf',
  fallbackTitle: '+1 555 0100',
  coordinatesLat: 12.97,
  coordinatesLong: 77.59,
  meta: { firstName: 'Ada', lastName: 'Lovelace' },
};

// Message bubbles read their message from the parent <Message /> context.
const provideMessage = () =>
  provideMessageContext({
    ...propRefs(Message),
    attachments: ref([attachment]),
    showingOriginal: ref(false),
    contactSide: ref(false),
    isCaptainMessage: ref(false),
    isPrivate: ref(false),
    variant: ref('user'),
    orientation: ref('left'),
    isBotOrAgentMessage: ref(false),
    shouldGroupWithNext: ref(false),
  });

// Sidebar items read expand and resize state from the parent <Sidebar />.
const provideSidebar = () =>
  provideSidebarContext({
    expandedItem: ref(null),
    setExpandedItem: () => {},
    isCollapsed: ref(false),
    isResizing: ref(false),
    sidebarWidth: ref(200),
  });

// Dropdown items close the menu through the parent <DropdownContainer />.
const provideDropdown = () =>
  provideDropdownContext({
    isOpen: ref(true),
    toggle: () => {},
    closeMenu: () => {},
  });

defineSmokeSuite({
  title: 'components-next render smoke',
  modules: import.meta.glob([
    '../../dashboard/components-next/**/*.vue',
    '!**/*.story.vue',
  ]),
  loadStore,
  // The dashboard page always defines the install's URLs (help center links).
  before: () => {
    window.chatwootConfig = { hostURL: 'https://app.example.test' };
  },
  setupFor: path => {
    if (path.includes('/message/')) return provideMessage;
    if (path.includes('/sidebar/')) return provideSidebar;
    if (path.includes('/dropdown-menu/')) return provideDropdown;
    return undefined;
  },
  propsFor: {
    'Calls/CallStatusBadge.vue': { kind: 'missed' },
    'ContactNoteItem.vue': {
      note: { id: 1, content: 'Called about the invoice', createdAt: 0 },
      writtenBy: 'Ada',
    },
    'ConversationCard/MessagePreview.vue': {
      message: { content: 'Hello there', attachments: [], messageType: 0 },
    },
    'Conversation/InboxName.vue': {
      inbox: { id: 1, name: 'Support', channelType: 'Channel::WebWidget' },
    },
    'PortalBaseSettings.vue': {
      activePortal: { id: 1, slug: 'help', name: 'Help', customDomain: '' },
    },
    'Inbox/InboxCard.vue': {
      inboxItem: {
        id: 1,
        notificationType: 'conversation_creation',
        pushMessageBody: 'New conversation',
        lastActivityAt: 0,
        meta: {},
        primaryActor: { meta: { sender: { name: 'Ada', thumbnail: '' } } },
      },
      stateInbox: { id: 1, name: 'Support' },
    },
    'copilot/CopilotAssistantMessage.vue': {
      message: { content: 'Here is a reply you can send.' },
    },
    'ComposeNewConversationForm.vue': {
      contactConversationsUiFlags: { isCreating: false },
      contactsUiFlags: { isFetching: false },
      formState: {
        message: '',
        subject: '',
        ccEmails: '',
        bccEmails: '',
        attachedFiles: [],
      },
    },
    'filter/ConditionRow.vue': {
      attributeKey: 'status',
      filterOperator: 'equal_to',
      values: '',
      filterTypes: [
        {
          attributeKey: 'status',
          inputType: 'plain_text',
          filterOperators: [{ value: 'equal_to', label: 'Equal to' }],
        },
      ],
    },
    'label/LabelItem.vue': {
      label: { id: 1, title: 'billing', color: '#ff0000' },
    },
    'message/chips/Audio.vue': {
      attachment: {
        dataUrl: 'https://example.test/files/note.mp3',
        transcribedText: '',
      },
    },
    'sidebar/SidebarGroup.vue': { name: 'inbox', label: 'Inbox' },
    'sidebar/SidebarGroupLeaf.vue': { label: 'Mentions', to: '/mentions' },
    'sidebar/SidebarSubGroup.vue': {
      name: 'teams',
      label: 'Teams',
      icon: 'i-lucide-users',
      children: [{ name: 'sales', label: 'Sales', to: '/teams/1' }],
    },
    'sidebar/SidebarCollapsedPopover.vue': {
      label: 'Inbox',
      children: [{ name: 'all', label: 'All', to: '/all' }],
    },
    'social-profiles/SocialProfileInput.vue': { network: 'linkedin' },
    'template-preview/TemplatePreview.vue': {
      platform: PLATFORMS.WHATSAPP,
      template: {
        name: 'greeting',
        components: [{ type: 'BODY', text: 'Hi {{1}}' }],
      },
    },
  },
});
