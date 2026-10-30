/**
 * OneTeam render smoke tests for the smaller Vue apps: the website widget,
 * the CSAT survey page, the v3 login pages, the help center portal, super
 * admin pages and shared components. Each app gets its own store, as in
 * production. See renderHarness.js.
 */
import { defineSmokeSuite, loadStore } from './renderHarness';

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
    };
    window.chatwootPubsubToken = '';
    window.authToken = '';
  },
  needsDedicatedSpec: {
    'widget/components/AgentMessage.vue': 'needs a message',
    'widget/components/FooterReplyTo.vue': 'needs the message being replied to',
    'widget/components/ReplyToChip.vue': 'needs the message being replied to',
    'widget/components/UserMessage.vue': 'needs a message',
    'Home/Article/ArticleContainer.vue': 'needs a help center portal',
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
  needsDedicatedSpec: {
    'signup/components/Signup/Form.vue': 'needs the global login config',
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
