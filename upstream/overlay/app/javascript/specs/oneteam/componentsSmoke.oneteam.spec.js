/**
 * OneTeam render smoke tests for the older dashboard/components: every
 * component renders its empty state. See renderHarness.js.
 */
import { provide, ref } from 'vue';
import { useStore } from 'vuex';
import types from 'dashboard/store/mutation-types';
import { defineSmokeSuite, loadStore } from './renderHarness';

// The conversation list filters its tabs by the signed-in user's permissions.
const signInAdministrator = () => {
  useStore().commit(types.SET_CURRENT_USER, {
    id: 1,
    name: 'Ada',
    accounts: [
      { id: 1, role: 'administrator', permissions: ['administrator'] },
    ],
  });
};

// A conversation row gets its actions from the parent <ChatList />.
const provideConversationActions = () => {
  [
    'selectConversation',
    'deSelectConversation',
    'assignAgent',
    'assignTeam',
    'assignLabels',
    'removeLabels',
    'updateConversationStatus',
    'toggleContextMenu',
    'markAsUnread',
    'markAsRead',
    'assignPriority',
    'deleteConversation',
  ].forEach(name => provide(name, () => {}));
  provide('isConversationSelected', () => false);
};

// A tab reads the active tab from the parent <Tabs />.
const provideTabs = () => {
  provide('activeIndex', ref(0));
  provide('updateActiveIndex', () => {});
};

const january = () => ({
  startCurrentDate: new Date(2026, 0, 1),
  endCurrentDate: new Date(2026, 0, 31),
});

defineSmokeSuite({
  title: 'components render smoke',
  modules: import.meta.glob([
    '../../dashboard/components/**/*.vue',
    '!**/*.story.vue',
  ]),
  loadStore,
  setupFor: path => {
    if (path.endsWith('components/ChatList.vue')) return signInAdministrator;
    if (path.endsWith('components/ConversationItem.vue'))
      return provideConversationActions;
    if (path.endsWith('ui/Tabs/TabsItem.vue')) return provideTabs;
    return undefined;
  },
  propsFor: {
    'components/ConversationItem.vue': {
      source: {
        id: 1,
        inbox_id: 1,
        messages: [],
        labels: [],
        meta: { sender: { id: 1, name: 'Ada' } },
      },
    },
    'DatePicker/components/CalendarMonth.vue': january,
    'DatePicker/components/CalendarWeek.vue': () => ({
      ...january(),
      currentDate: new Date(2026, 0, 15),
      selectedStartDate: new Date(2026, 0, 5),
      selectedEndDate: new Date(2026, 0, 9),
    }),
    'DatePicker/components/DatePickerButton.vue': () => ({
      selectedStartDate: new Date(2026, 0, 1),
      selectedEndDate: new Date(2026, 0, 7),
      selectedRange: 'last7days',
    }),
    'ui/Tabs/TabsItem.vue': { name: 'Open' },
    'widgets/InboxName.vue': { inbox: { id: 1, name: 'Support' } },
    'conversation/ConversationHeader.vue': {
      chat: {
        id: 1,
        inbox_id: 1,
        additional_attributes: {},
        meta: { sender: { id: 1, name: 'Ada' } },
      },
    },
    'widgets/conversation/MessagePreview.vue': {
      message: { content: 'Hello there', attachments: [] },
    },
    'conversation/ShopifyOrderItem.vue': {
      order: {
        id: 1001,
        admin_url: 'https://shop.example.test/orders/1001',
        created_at: '2026-01-01T10:00:00Z',
        total_price: '25.00',
        currency: 'USD',
        financial_status: 'paid',
        fulfillment_status: 'fulfilled',
      },
    },
    'contextMenu/menuItem.vue': {
      option: { label: 'Open', icon: 'i-lucide-check' },
    },
    'contextMenu/menuItemWithSubmenu.vue': {
      option: { label: 'Assign agent', icon: 'i-lucide-user' },
    },
  },
});
