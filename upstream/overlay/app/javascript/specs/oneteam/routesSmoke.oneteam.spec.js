/**
 * OneTeam render smoke tests for the dashboard pages under dashboard/routes
 * and dashboard/modules: every page renders its empty state. See
 * renderHarness.js.
 */
import { defineSmokeSuite, loadStore } from './renderHarness';

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
  needsDedicatedSpec: {
    'commands/commandbar.vue': 'loads a web component jsdom cannot import',
    'conversation/ConversationAction.vue': 'needs a conversation route',
    'onboarding/inbox-setup/InboxChannelForm.vue': 'needs a channel definition',
    'account/components/BuildInfo.vue': 'needs build info from the server',
    'data/components/ImportSummaryTiles.vue': 'needs real dates',
    'inbox/PreChatForm/Settings.vue': 'needs an inbox with pre-chat fields',
    'inbox/channels/Email.vue': 'needs the global OAuth config',
    'integrations/MultipleIntegrationHooks.vue': 'needs an integration',
    'integrations/SingleIntegrationHooks.vue': 'needs an integration',
    'macros/MacroNode.vue': 'needs a macro action',
    'reports/components/ReportDrilldownCard.vue': 'needs real message content',
    'reports/components/SummaryReports.vue': 'needs report rows',
    'reports/monitors/MonitorDrilldown.vue': 'opens a drawer ref on mount',
    'templates/TemplateCard.vue': 'needs a real template locale',
  },
});
