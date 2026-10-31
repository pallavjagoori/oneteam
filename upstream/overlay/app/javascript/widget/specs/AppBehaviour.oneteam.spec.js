/**
 * OneTeam behaviour spec for the widget root component (widget/App.vue).
 *
 * Covers mount-time setup inside and outside an iframe or React Native
 * webview, locale selection, every SDK postMessage event, the unread and
 * campaign views, bus events and the watchers. The store, router, i18n and
 * iframe helpers are replaced by plain fakes so each path can be driven.
 */
import { reactive } from 'vue';
import { shallowMount, flushPromises } from '@vue/test-utils';
import App from '../App.vue';
import {
  ON_AGENT_MESSAGE_RECEIVED,
  ON_CAMPAIGN_MESSAGE_CLICK,
  ON_UNREAD_MESSAGE_CLICK,
} from '../constants/widgetBusEvents';
import { SDK_SET_BUBBLE_VISIBILITY } from '../../shared/constants/sharedFrameEvents';

const env = vi.hoisted(() => ({
  iframe: true,
  rn: false,
  handlers: {},
  router: null,
}));

vi.mock('widget/helpers/utils', async importOriginal => ({
  ...(await importOriginal()),
  IFrameHelper: {
    isIFrame: () => env.iframe,
    sendMessage: vi.fn(),
    isAValidEvent: e => e.valid !== false,
    getMessage: e => e.data,
  },
  RNHelper: {
    isRNWebView: () => env.rn,
    sendMessage: vi.fn(),
  },
}));
vi.mock('widget/helpers/axios', () => ({ setHeader: vi.fn() }));
vi.mock('../helpers/urlParamsHelper', () => ({ getLocale: () => 'fr' }));
vi.mock('../helpers/IframeEventHelper', () => ({
  getExtraSpaceToScroll: () => 42,
  loadedEventConfig: () => ({ event: 'loaded' }),
}));
vi.mock('widget/composables/useDarkMode', () => ({
  useDarkMode: () => ({ prefersDarkMode: true }),
}));
vi.mock('widget/composables/useAvailability', () => ({
  useAvailability: () => ({ isInWorkingHours: true }),
}));
vi.mock('vue-router', () => ({ useRouter: () => env.router }));
vi.mock('shared/helpers/mitt', () => ({
  emitter: {
    on: (name, fn) => {
      env.handlers[name] = fn;
    },
    emit: vi.fn((name, payload) => env.handlers[name]?.(payload)),
  },
}));

const { IFrameHelper, RNHelper } = await import('widget/helpers/utils');
const { setHeader } = await import('widget/helpers/axios');
const { emitter } = await import('shared/helpers/mitt');

let messageListeners;
let store;
let route;
let i18n;

// mapActions with a namespace looks the module up in _modulesNamespaceMap and
// dispatches through its local context, so route those back to `dispatch`.
const namespaced = (fake, names) =>
  Object.fromEntries(
    names.map(ns => [
      `${ns}/`,
      {
        context: {
          dispatch: (type, payload) => fake.dispatch(`${ns}/${type}`, payload),
        },
      },
    ])
  );

const makeStore = getters => {
  const fake = {
    getters: reactive({
      'campaign/getActiveCampaign': {},
      'conversation/getConversationSize': 1,
      'appConfig/getHideMessageBubble': false,
      'conversation/getIsFetchingList': false,
      'appConfig/isRightAligned': true,
      'appConfig/getIsWidgetOpen': false,
      'conversation/getMessageCount': 0,
      'conversation/getUnreadMessageCount': 0,
      'appConfig/isWidgetStyleFlat': false,
      'appConfig/getShowUnreadMessagesDialog': true,
      ...getters,
    }),
    dispatch: vi.fn(() => Promise.resolve()),
  };
  // eslint-disable-next-line no-underscore-dangle
  fake._modulesNamespaceMap = namespaced(fake, [
    'appConfig',
    'conversation',
    'campaign',
    'agent',
  ]);
  return fake;
};

const mountApp = ({ getters = {}, routeName = 'home', channel = {} } = {}) => {
  window.chatwootWebChannel = {
    websiteToken: 'tok',
    locale: 'pt_BR',
    widgetColor: '#123456',
    enabledLanguages: [{ iso_639_1_code: 'pt_BR' }, { iso_639_1_code: 'fr' }],
    enabledFeatures: [],
    ...channel,
  };
  window.authToken = 'auth';
  store = makeStore(getters);
  route = reactive({ name: routeName });
  i18n = reactive({ locale: '' });
  return shallowMount(App, {
    global: {
      mocks: { $store: store, $route: route, $i18n: i18n, $t: key => key },
      stubs: { 'router-view': true },
    },
  });
};

const dispatched = name => store.dispatch.mock.calls.filter(c => c[0] === name);
const post = data => messageListeners.forEach(fn => fn({ data }));
const sent = event =>
  IFrameHelper.sendMessage.mock.calls.filter(c => c[0].event === event);

beforeEach(() => {
  env.iframe = true;
  env.rn = false;
  env.handlers = {};
  env.router = { replace: vi.fn(() => Promise.resolve()) };
  messageListeners = [];
  vi.spyOn(window, 'addEventListener').mockImplementation((type, fn) => {
    if (type === 'message') messageListeners.push(fn);
  });
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
  document.documentElement.style.removeProperty('--widget-color');
});

describe('App mount', () => {
  it('sets up an iframe widget and announces it is loaded', () => {
    const wrapper = mountApp();
    expect(i18n.locale).toBe('pt_BR');
    expect(dispatched('appConfig/setWidgetColor')[0][1]).toBe('#123456');
    expect(
      document.documentElement.style.getPropertyValue('--widget-color')
    ).toBe('#123456');
    expect(setHeader).toHaveBeenCalledWith('auth');
    expect(messageListeners).toHaveLength(1);
    expect(sent('loaded')).toHaveLength(1);
    expect(dispatched('conversation/fetchOldConversations')).toHaveLength(0);
    expect(dispatched('conversationAttributes/getAttributes')).toHaveLength(1);
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['is-widget-right', 'dark', 'bg-n-slate-2'])
    );
  });

  it('fetches data directly and uses the URL locale outside an iframe', () => {
    env.iframe = false;
    mountApp({ channel: { widgetColor: null } });
    expect(dispatched('conversation/fetchOldConversations')).toHaveLength(1);
    expect(dispatched('agent/fetchAvailableAgents')[0][1]).toBe('tok');
    expect(i18n.locale).toBe('fr');
    expect(messageListeners).toHaveLength(0);
    expect(
      document.documentElement.style.getPropertyValue('--widget-color')
    ).toBe('');
  });

  it('registers listeners and notifies a React Native webview', () => {
    env.iframe = false;
    env.rn = true;
    mountApp();
    expect(messageListeners).toHaveLength(1);
    expect(RNHelper.sendMessage).toHaveBeenCalledWith({ event: 'loaded' });
  });

  it('shows the spinner while the first conversation list loads', () => {
    const wrapper = mountApp({
      getters: {
        'conversation/getConversationSize': 0,
        'conversation/getIsFetchingList': true,
      },
    });
    expect(wrapper.find('.justify-center').exists()).toBe(true);
  });

  it('drops the background on the unread and campaign views', () => {
    const wrapper = mountApp({
      routeName: 'campaigns',
      getters: {
        'appConfig/getHideMessageBubble': true,
        'appConfig/isWidgetStyleFlat': true,
      },
    });
    expect(wrapper.classes()).not.toContain('bg-n-slate-2');
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['is-bubble-hidden', 'is-flat-design'])
    );
  });
});

describe('App locale', () => {
  it('ignores an empty locale', () => {
    const wrapper = mountApp();
    i18n.locale = 'en';
    wrapper.vm.setLocale('');
    expect(i18n.locale).toBe('en');
  });

  it('falls back to the base language, then leaves unknown locales alone', () => {
    const wrapper = mountApp();
    wrapper.vm.setLocale('fr_CA');
    expect(i18n.locale).toBe('fr');
    wrapper.vm.setLocale('de');
    expect(i18n.locale).toBe('fr');
  });

  it('sets the document direction from the locale', async () => {
    const wrapper = mountApp();
    expect(document.documentElement.dir).toBe('ltr');
    i18n.locale = 'ar';
    await wrapper.vm.$nextTick();
    expect(document.documentElement.dir).toBe('rtl');
    i18n.locale = '';
    await wrapper.vm.$nextTick();
    expect(document.documentElement.dir).toBe('ltr');
  });
});

describe('App SDK events', () => {
  it('ignores invalid events', () => {
    mountApp();
    messageListeners[0]({ valid: false, data: { event: 'set-user' } });
    expect(dispatched('contacts/setUser')).toHaveLength(0);
  });

  it('applies config-set', async () => {
    const wrapper = mountApp();
    const setUnreadView = vi.spyOn(wrapper.vm, 'setUnreadView');
    post({ event: 'config-set', locale: 'fr', campaignsSnoozedTill: '99' });
    await flushPromises();
    expect(i18n.locale).toBe('fr');
    expect(sent('setBubbleLabel')[0][0].label).toBe('BUBBLE.LABEL');
    expect(setUnreadView).toHaveBeenCalled();
    expect(dispatched('agent/fetchAvailableAgents')).toHaveLength(1);
    expect(dispatched('appConfig/setAppConfig')).toHaveLength(1);
    expect(dispatched('contacts/get')).toHaveLength(1);
    expect(wrapper.vm.campaignsSnoozedTill).toBe(99);

    post({ event: 'config-set' });
    expect(wrapper.vm.campaignsSnoozedTill).toBe(99);
  });

  it('scrolls to the bottom when the widget becomes visible', () => {
    const wrapper = mountApp();
    const container = { scrollTop: 0, scrollHeight: 500 };
    vi.spyOn(wrapper.vm.$el, 'querySelector').mockReturnValue(container);
    post({ event: 'widget-visible' });
    expect(container.scrollTop).toBe(500);
  });

  it('starts campaigns for the new page on change-url', () => {
    mountApp();
    post({
      event: 'change-url',
      referrerURL: 'https://shop/x',
      referrerHost: 'shop',
    });
    expect(dispatched('campaign/initCampaigns')[0][1]).toEqual({
      currentURL: 'https://shop/x',
      websiteToken: 'tok',
      isInBusinessHours: true,
    });
    expect(window.referrerURL).toBe('https://shop/x');
    expect(dispatched('appConfig/setReferrerHost')[0][1]).toBe('shop');
  });

  it('tracks the mobile close button', async () => {
    const wrapper = mountApp();
    post({ event: 'toggle-close-button', isMobile: true });
    await wrapper.vm.$nextTick();
    expect(wrapper.classes()).toContain('is-mobile');
  });

  it('creates widget events except triggers on the unread or campaign views', () => {
    mountApp();
    post({ event: 'push-event', eventName: 'signup' });
    post({ event: 'push-event', eventName: 'webwidget.triggered' });
    expect(dispatched('events/create')).toEqual([
      ['events/create', { name: 'signup' }],
      ['events/create', { name: 'webwidget.triggered' }],
    ]);
    route.name = 'unread-messages';
    post({ event: 'push-event', eventName: 'webwidget.triggered' });
    post({ event: 'push-event', eventName: 'other' });
    expect(dispatched('events/create')).toHaveLength(3);
  });

  it.each([
    [{ event: 'set-label', label: 'vip' }, 'conversationLabels/create', 'vip'],
    [
      { event: 'remove-label', label: 'vip' },
      'conversationLabels/destroy',
      'vip',
    ],
    [
      { event: 'set-custom-attributes', customAttributes: { a: 1 } },
      'contacts/setCustomAttributes',
      { a: 1 },
    ],
    [
      { event: 'delete-custom-attribute', customAttribute: 'a' },
      'contacts/deleteCustomAttribute',
      'a',
    ],
    [
      {
        event: 'set-conversation-custom-attributes',
        customAttributes: { b: 2 },
      },
      'conversation/setCustomAttributes',
      { b: 2 },
    ],
    [
      { event: 'delete-conversation-custom-attribute', customAttribute: 'b' },
      'conversation/deleteCustomAttribute',
      'b',
    ],
    [
      { event: 'set-color-scheme', darkMode: 'dark' },
      'appConfig/setColorScheme',
      'dark',
    ],
    [
      { event: SDK_SET_BUBBLE_VISIBILITY, hideMessageBubble: true },
      'appConfig/setBubbleVisibility',
      true,
    ],
  ])('forwards %o to the store', (message, action, payload) => {
    mountApp();
    post(message);
    expect(dispatched(action)[0][1]).toEqual(payload);
  });

  it('forwards set-user with the whole message', () => {
    mountApp();
    const message = { event: 'set-user', identifier: 'u1' };
    post(message);
    expect(dispatched('contacts/setUser')[0][1]).toEqual(message);
  });

  it('updates the locale and bubble label on set-locale', () => {
    mountApp();
    post({ event: 'set-locale', locale: 'fr' });
    expect(i18n.locale).toBe('fr');
    expect(sent('setBubbleLabel')).toHaveLength(1);
  });

  it('ignores unknown events', () => {
    mountApp();
    const before = store.dispatch.mock.calls.length;
    post({ event: 'unknown' });
    expect(store.dispatch.mock.calls.length).toBe(before);
  });
});

describe('App toggle-open', () => {
  it('opens the messages view from home when there are messages', () => {
    mountApp({ getters: { 'conversation/getMessageCount': 2 } });
    post({ event: 'toggle-open', isOpen: true });
    expect(dispatched('appConfig/toggleWidgetOpen')[0][1]).toBe(true);
    expect(env.router.replace).toHaveBeenCalledWith({ name: 'messages' });
    expect(dispatched('campaign/resetCampaign')).toHaveLength(0);
  });

  it('stays on home when opened without messages', () => {
    mountApp();
    post({ event: 'toggle-open', isOpen: true });
    expect(env.router.replace).not.toHaveBeenCalled();
  });

  it('returns to home and resets the unread mode when closed from the unread view', () => {
    mountApp({ routeName: 'unread-messages' });
    post({ event: 'toggle-open', isOpen: false });
    expect(dispatched('conversation/setUserLastSeen')).toHaveLength(1);
    expect(sent('resetUnreadMode')).toHaveLength(1);
    expect(env.router.replace).toHaveBeenCalledWith({ name: 'home' });
    expect(dispatched('campaign/resetCampaign')).toHaveLength(1);
  });

  it('only resets campaigns when closed elsewhere', () => {
    mountApp({ routeName: 'messages' });
    post({ event: 'toggle-open', isOpen: false });
    expect(env.router.replace).not.toHaveBeenCalled();
    expect(dispatched('campaign/resetCampaign')).toHaveLength(1);
  });
});

describe('App unread view', () => {
  it('marks messages seen when an agent replies on the open messages view', async () => {
    mountApp({
      routeName: 'messages',
      getters: { 'appConfig/getIsWidgetOpen': true },
    });
    env.handlers[ON_AGENT_MESSAGE_RECEIVED]();
    expect(dispatched('conversation/setUserLastSeen')).toHaveLength(1);
    expect(env.router.replace).not.toHaveBeenCalled();
  });

  it('marks messages seen outside an iframe and skips the unread view', () => {
    env.iframe = false;
    mountApp({ routeName: 'messages' });
    env.handlers[ON_AGENT_MESSAGE_RECEIVED]();
    expect(dispatched('conversation/setUserLastSeen')).toHaveLength(1);
    expect(sent('setUnreadMode')).toHaveLength(0);
  });

  it('opens the unread view for a closed widget with unread messages', async () => {
    mountApp({ getters: { 'conversation/getUnreadMessageCount': 2 } });
    env.handlers[ON_AGENT_MESSAGE_RECEIVED]();
    expect(dispatched('conversation/setUserLastSeen')).toHaveLength(0);
    expect(env.router.replace).toHaveBeenCalledWith({
      name: 'unread-messages',
    });
    await flushPromises();
    expect(sent('updateIframeHeight')[0][0]).toEqual({
      event: 'updateIframeHeight',
      isFixedHeight: true,
      extraHeight: 42,
    });
    expect(sent('setUnreadMode')).toHaveLength(1);
  });

  it('only resizes when the unread view is already showing', async () => {
    mountApp({ routeName: 'unread-messages' });
    env.handlers[ON_AGENT_MESSAGE_RECEIVED]();
    await flushPromises();
    expect(env.router.replace).not.toHaveBeenCalled();
    expect(sent('updateIframeHeight')).toHaveLength(1);
  });

  it('does nothing when the dialog is disabled, nothing is unread or the widget is open', () => {
    mountApp({ getters: { 'appConfig/getShowUnreadMessagesDialog': false } });
    env.handlers[ON_AGENT_MESSAGE_RECEIVED]();
    mountApp();
    env.handlers[ON_AGENT_MESSAGE_RECEIVED]();
    mountApp({
      getters: {
        'conversation/getUnreadMessageCount': 1,
        'appConfig/getIsWidgetOpen': true,
      },
    });
    env.handlers[ON_AGENT_MESSAGE_RECEIVED]();
    expect(env.router.replace).not.toHaveBeenCalled();
  });

  it('returns to messages when the unread message is clicked', async () => {
    mountApp({ routeName: 'unread-messages' });
    env.handlers[ON_UNREAD_MESSAGE_CLICK]();
    expect(env.router.replace).toHaveBeenCalledWith({ name: 'messages' });
    await flushPromises();
    expect(sent('resetUnreadMode')).toHaveLength(1);
    expect(sent('updateIframeHeight')[0][0].isFixedHeight).toBe(false);
  });

  it('skips the iframe reset outside an iframe', async () => {
    env.iframe = false;
    mountApp();
    env.handlers[ON_UNREAD_MESSAGE_CLICK]();
    await flushPromises();
    expect(IFrameHelper.sendMessage).not.toHaveBeenCalled();
  });

  it('syncs the notification dot with the unread count and bubble', async () => {
    const wrapper = mountApp();
    store.getters['conversation/getUnreadMessageCount'] = 3;
    await wrapper.vm.$nextTick();
    store.getters['appConfig/getHideMessageBubble'] = true;
    await wrapper.vm.$nextTick();
    expect(sent('handleNotificationDot')).toEqual([
      [{ event: 'handleNotificationDot', unreadMessageCount: 3 }],
      [{ event: 'handleNotificationDot', unreadMessageCount: 3 }],
    ]);
  });

  it('does not send the notification dot outside an iframe', async () => {
    env.iframe = false;
    const wrapper = mountApp();
    store.getters['conversation/getUnreadMessageCount'] = 3;
    await wrapper.vm.$nextTick();
    expect(IFrameHelper.sendMessage).not.toHaveBeenCalled();
  });
});

describe('App campaigns', () => {
  const campaign = { id: 11 };

  it('shows a ready campaign in the iframe', async () => {
    const wrapper = mountApp();
    store.getters['campaign/getActiveCampaign'] = campaign;
    await wrapper.vm.$nextTick();
    expect(env.router.replace).toHaveBeenCalledWith({ name: 'campaigns' });
    await flushPromises();
    expect(sent('setUnreadMode')).toHaveLength(1);
    expect(sent('updateIframeHeight')[0][0].isFixedHeight).toBe(true);
  });

  it('holds campaigns back when there are messages, a snooze or no iframe', async () => {
    const withMessages = mountApp({
      getters: { 'conversation/getMessageCount': 1 },
    });
    store.getters['campaign/getActiveCampaign'] = campaign;
    await withMessages.vm.$nextTick();

    const snoozed = mountApp();
    env.handlers['snooze-campaigns']();
    expect(snoozed.vm.campaignsSnoozedTill).toBeGreaterThan(Date.now());
    store.getters['campaign/getActiveCampaign'] = campaign;
    await snoozed.vm.$nextTick();

    env.iframe = false;
    const outside = mountApp();
    store.getters['campaign/getActiveCampaign'] = campaign;
    await outside.vm.$nextTick();

    expect(env.router.replace).not.toHaveBeenCalled();
  });

  it('shows campaigns again once an old snooze has expired', async () => {
    const wrapper = mountApp();
    wrapper.vm.campaignsSnoozedTill = Date.now() - 1000;
    store.getters['campaign/getActiveCampaign'] = campaign;
    await wrapper.vm.$nextTick();
    expect(env.router.replace).toHaveBeenCalledWith({ name: 'campaigns' });
  });

  it('opens the pre-chat form for a clicked campaign when enabled', () => {
    mountApp({
      channel: {
        preChatFormEnabled: true,
        preChatFormOptions: { pre_chat_fields: [{ enabled: true }] },
      },
    });
    env.handlers[ON_CAMPAIGN_MESSAGE_CLICK]();
    expect(env.router.replace).toHaveBeenCalledWith({ name: 'prechat-form' });
    expect(sent('resetUnreadMode')).toHaveLength(1);
  });

  it('executes a clicked campaign without a pre-chat form', () => {
    mountApp({ getters: { 'campaign/getActiveCampaign': campaign } });
    env.handlers[ON_CAMPAIGN_MESSAGE_CLICK]();
    expect(emitter.emit).toHaveBeenCalledWith('execute-campaign', {
      campaignId: 11,
    });
    expect(dispatched('campaign/executeCampaign')[0][1]).toEqual({
      campaignId: 11,
      websiteToken: 'tok',
      customAttributes: undefined,
    });
    expect(env.router.replace).toHaveBeenCalledWith({ name: 'messages' });
  });

  it('passes custom attributes when the SDK executes a campaign', () => {
    mountApp();
    env.handlers['execute-campaign']({
      campaignId: 5,
      customAttributes: { plan: 'pro' },
    });
    expect(dispatched('campaign/executeCampaign')[0][1]).toEqual({
      campaignId: 5,
      websiteToken: 'tok',
      customAttributes: { plan: 'pro' },
    });
  });
});
