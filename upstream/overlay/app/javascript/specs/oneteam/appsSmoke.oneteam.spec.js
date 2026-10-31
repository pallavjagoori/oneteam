/**
 * OneTeam render smoke tests for the smaller Vue apps: the website widget,
 * the CSAT survey page, the v3 login pages, the help center portal, super
 * admin pages and shared components. Each app gets its own store, as in
 * production. See renderHarness.js.
 */
import { defineSmokeSuite, loadStore } from './renderHarness';

// A widget message as the API returns it: 0 is the visitor, 1 an agent.
const widgetMessage = messageType => ({
  id: messageType + 1,
  content: 'Hello there',
  message_type: messageType,
  created_at: 1767261600,
  attachments: [],
  content_attributes: {},
  sender: { name: 'Ada', thumbnail: '' },
});

defineSmokeSuite({
  title: 'widget render smoke',
  modules: import.meta.glob(['../../widget/**/*.vue', '!**/*.story.vue']),
  loadStore: () => import('widget/store').then(module => module.default),
  // The widget page defines these globals before the app starts.
  before: () => {
    window.chatwootWebChannel = {
      websiteToken: 'smoke-token',
      locale: 'en',
      enabledLanguages: [{ name: 'English', iso_639_1_code: 'en' }],
      portal: { slug: 'help', config: { allowed_locales: ['en'] } },
    };
    window.chatwootPubsubToken = '';
    window.authToken = '';
  },
  propsFor: {
    'widget/components/AgentMessage.vue': () => ({
      message: widgetMessage(1),
      replyTo: widgetMessage(0),
    }),
    'widget/components/FooterReplyTo.vue': () => ({
      inReplyTo: widgetMessage(0),
    }),
    'widget/components/ReplyToChip.vue': () => ({ replyTo: widgetMessage(1) }),
    'widget/components/UserMessage.vue': () => ({
      message: widgetMessage(0),
      replyTo: widgetMessage(1),
    }),
  },
});

defineSmokeSuite({
  title: 'survey render smoke',
  modules: import.meta.glob(['../../survey/**/*.vue', '!**/*.story.vue']),
  loadStore: () => import('survey/store').then(module => module.default),
});

defineSmokeSuite({
  title: 'v3 render smoke',
  modules: import.meta.glob(['../../v3/**/*.vue', '!**/*.story.vue']),
  loadStore: () => import('v3/store').then(module => module.default),
  // The login page defines the install's sign-in options.
  before: () => {
    window.chatwootConfig = {
      hostURL: 'https://app.example.test',
      allowedLoginMethods: ['email'],
      googleOAuthClientId: '',
    };
  },
});

defineSmokeSuite({
  title: 'shared, portal and super admin render smoke',
  modules: import.meta.glob([
    '../../shared/**/*.vue',
    '../../portal/**/*.vue',
    '../../superadmin_pages/**/*.vue',
    '!**/*.story.vue',
  ]),
  loadStore,
});
