/**
 * OneTeam render smoke tests for the dashboard pages under dashboard/routes
 * and dashboard/modules: every page renders its empty state. See
 * renderHarness.js.
 */
import { vi } from 'vitest';
import { provide, ref } from 'vue';
import { useStore } from 'vuex';
import types from 'dashboard/store/mutation-types';
import { defineSmokeSuite, loadStore } from './renderHarness';

// The command bar registers the <ninja-keys> web component, which jsdom
// cannot load; the page renders the element as unknown markup instead.
vi.mock('@chatwoot/ninja-keys', () => ({}));

// The conversation sidebar acts on the conversation open in the store.
const openConversation = () => {
  const store = useStore();
  const conversation = {
    id: 1,
    inbox_id: 1,
    status: 'open',
    messages: [],
    labels: [],
    meta: { sender: { id: 1, name: 'Ada' }, assignee: null, team: null },
  };
  store.commit(types.ADD_CONVERSATION, conversation);
  store.commit(types.SET_CURRENT_CHAT_WINDOW, conversation);
};

// Integration pages read their integration from the store.
const loadSlackIntegration = () => {
  useStore().commit(`integrations/${types.SET_INTEGRATIONS}`, [
    {
      id: 'slack',
      name: 'Slack',
      hook_type: 'account',
      allow_multiple_hooks: true,
      hooks: [],
    },
  ]);
};

// A macro step reads the available action types from the macro editor.
const provideMacroActions = () => {
  provide(
    'macroActionTypes',
    ref([
      { key: 'assign_team', label: 'Assign team', inputType: 'search_select' },
    ])
  );
};

defineSmokeSuite({
  title: 'routes render smoke',
  modules: import.meta.glob([
    '../../dashboard/routes/**/*.vue',
    '../../dashboard/modules/**/*.vue',
    '!**/*.story.vue',
    // Dead code that cannot compile; see UNREACHABLE.md.
    '!**/settings/integrations/ShowIntegration.vue',
  ]),
  loadStore,
  // The server-rendered dashboard page defines these before the app boots.
  before: () => {
    window.chatwootConfig = {
      hostURL: 'https://app.example.test',
      googleOAuthClientId: '',
    };
    window.globalConfig = { APP_VERSION: '4.19.1', GIT_SHA: 'abcdef1234567' };
  },
  setupFor: path => {
    if (path.endsWith('conversation/ConversationAction.vue'))
      return openConversation;
    if (path.includes('/integrations/')) return loadSlackIntegration;
    if (path.endsWith('macros/MacroNode.vue')) return provideMacroActions;
    return undefined;
  },
  propsFor: {
    'inbox-setup/InboxChannelForm.vue': { channel: { type: 'telegram' } },
    'data/components/ImportSummaryTiles.vue': {
      dataImport: {
        id: 1,
        data_type: 'contacts',
        status: 'completed',
        created_at: '2026-01-01T10:00:00Z',
        completed_at: '2026-01-01T10:05:00Z',
        updated_at: '2026-01-01T10:05:00Z',
      },
    },
    'inbox/PreChatForm/Settings.vue': {
      inbox: {
        id: 1,
        pre_chat_form_enabled: true,
        pre_chat_form_options: {
          pre_chat_message: 'Tell us about you',
          pre_chat_fields: [],
        },
      },
    },
    'integrations/MultipleIntegrationHooks.vue': { integrationId: 'slack' },
    'integrations/SingleIntegrationHooks.vue': { integrationId: 'slack' },
    'macros/MacroNode.vue': {
      modelValue: { action_name: 'assign_team', action_params: [] },
    },
    'reports/components/ReportDrilldownCard.vue': {
      record: {
        record_type: 'message',
        message: { id: 1, content: 'Hello there' },
        conversation: { id: 1 },
        occurred_at: 1767261600,
      },
    },
    'reports/components/SummaryReports.vue': {
      type: 'label',
      actionKey: 'summaryReports/fetchLabelSummaryReports',
      getterKey: 'labels/getLabels',
      fetchItemsKey: 'labels/get',
      summaryKey: 'summaryReports/getLabelSummaryReports',
    },
    'templates/TemplateCard.vue': {
      template: {
        name: 'order_update',
        status: 'APPROVED',
        language: 'en_US',
        inboxes: [{ id: 1, name: 'WhatsApp' }],
        inboxNames: 'WhatsApp',
      },
    },
  },
});
