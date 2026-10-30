/**
 * OneTeam render smoke tests for the older dashboard/components: every
 * component renders its empty state. See renderHarness.js.
 */
import { defineSmokeSuite, loadStore } from './renderHarness';

defineSmokeSuite({
  title: 'components render smoke',
  modules: import.meta.glob([
    '../../dashboard/components/**/*.vue',
    '!**/*.story.vue',
  ]),
  loadStore,
  needsDedicatedSpec: {
    'components/ChatList.vue': 'needs a conversation route',
    'components/ConversationItem.vue': 'needs a conversation route',
    'ui/DatePicker/components/CalendarMonth.vue': 'needs real dates',
    'ui/DatePicker/components/CalendarWeek.vue': 'needs real dates',
    'ui/DatePicker/components/DatePickerButton.vue': 'needs a date range',
    'ui/Tabs/TabsItem.vue': 'needs its parent Tabs context',
    'widgets/InboxName.vue': 'needs an inbox',
    'widgets/conversation/ConversationHeader.vue': 'needs a conversation',
    'widgets/conversation/MessagePreview.vue': 'needs real message content',
    'widgets/conversation/ShopifyOrderItem.vue': 'needs real dates',
    'widgets/conversation/contextMenu/menuItem.vue': 'needs a menu option',
    'widgets/conversation/contextMenu/menuItemWithSubmenu.vue':
      'needs a menu option',
  },
});
