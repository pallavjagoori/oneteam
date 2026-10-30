/**
 * OneTeam render smoke tests for dashboard/components-next: every component
 * renders its empty state. See renderHarness.js.
 */
import { ref } from 'vue';
import Message from 'dashboard/components-next/message/Message.vue';
import { provideMessageContext } from 'dashboard/components-next/message/provider.js';
import { defineSmokeSuite, loadStore, propRefs } from './renderHarness';

// Message bubbles read their message from the parent <Message /> context.
const provideMessage = () =>
  provideMessageContext({
    ...propRefs(Message),
    showingOriginal: ref(false),
    contactSide: ref(false),
    isCaptainMessage: ref(false),
    isPrivate: ref(false),
    variant: ref('user'),
    orientation: ref('left'),
    isBotOrAgentMessage: ref(false),
    shouldGroupWithNext: ref(false),
  });

defineSmokeSuite({
  title: 'components-next render smoke',
  modules: import.meta.glob([
    '../../dashboard/components-next/**/*.vue',
    '!**/*.story.vue',
  ]),
  loadStore,
  setupFor: path => (path.includes('/message/') ? provideMessage : undefined),
  needsDedicatedSpec: {
    'Calls/CallStatusBadge.vue': 'needs a valid call kind',
    'Contacts/ContactsSidebar/components/ContactNoteItem.vue':
      'needs real note content',
    'Conversation/ConversationCard/MessagePreview.vue':
      'needs real message content',
    'Conversation/InboxName.vue': 'needs an inbox',
    'HelpCenter/Pages/PortalSettingsPage/PortalBaseSettings.vue':
      'needs a portal with a base URL',
    'Inbox/InboxCard.vue': 'needs an inbox',
    'NewConversation/components/ComposeNewConversationForm.vue':
      'needs contact and inbox records',
    'captain/pageComponents/document/DocumentDetails.vue':
      'opens a drawer ref on mount',
    'captain/pageComponents/overview/v2/OverviewDrilldownDrawer.vue':
      'opens a drawer ref on mount',
    'copilot/CopilotAssistantMessage.vue': 'needs real message content',
    'copilot/CopilotLauncher.vue': 'needs a conversation route',
    'dropdown-menu/base/DropdownItem.vue':
      'needs its parent DropdownContainer context',
    'filter/ConditionRow.vue': 'needs real filter types',
    'label/LabelItem.vue': 'needs a label',
    'message/bubbles/Contact.vue': 'needs a contact attachment',
    'message/bubbles/File.vue': 'needs a file attachment',
    'message/bubbles/Location.vue': 'needs a location attachment',
    'message/chips/Audio.vue': 'needs an audio attachment',
    'sidebar/SidebarCollapsedPopover.vue': 'needs its parent Sidebar context',
    'sidebar/SidebarGroup.vue': 'needs its parent Sidebar context',
    'sidebar/SidebarGroupLeaf.vue': 'needs its parent Sidebar context',
    'sidebar/SidebarSubGroup.vue': 'needs its parent Sidebar context',
    'social-profiles/SocialProfileInput.vue': 'needs a valid network',
    'template-preview/TemplatePreview.vue': 'needs a valid platform',
  },
});
