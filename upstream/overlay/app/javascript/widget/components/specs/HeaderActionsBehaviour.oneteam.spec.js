/**
 * OneTeam behaviour spec for the widget header's action buttons.
 *
 * Covers hiding the actions outside an iframe or app web view when there
 * is nothing to show, the end-conversation button for open, snoozed and
 * pending conversations (only when the user may end it, the feature is
 * on and the button is wanted), resolving the conversation, the popout
 * button, and closing the window through the iframe or the React Native
 * bridge.
 *
 * Chatwoot quirk: closeWindow checks `RNHelper.isRNWebView` without
 * calling it, so outside an iframe it always messages the React Native
 * bridge; the branch where that check is false cannot be reached.
 */
import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import HeaderActions from '../HeaderActions.vue';

const env = vi.hoisted(() => ({
  iframe: false,
  rn: false,
  iframeSend: vi.fn(),
  rnSend: vi.fn(),
  popout: vi.fn(),
}));

vi.mock('widget/helpers/utils', () => ({
  IFrameHelper: { isIFrame: () => env.iframe, sendMessage: env.iframeSend },
  RNHelper: { isRNWebView: () => env.rn, sendMessage: env.rnSend },
}));
vi.mock('widget/helpers/popoutHelper', () => ({
  popoutChatWindow: env.popout,
}));

const mountActions = ({ status = 'open', canEnd = true, props } = {}) => {
  const dispatch = vi.fn();
  const store = createStore({
    getters: {
      'conversationAttributes/getConversationParams': () => ({ status }),
      'appConfig/getCanUserEndConversation': () => canEnd,
    },
  });
  store.dispatch = dispatch;
  const wrapper = mount(HeaderActions, {
    props,
    global: {
      plugins: [store],
      stubs: { FluentIcon: true },
      mocks: { $i18n: { locale: 'fr' } },
    },
  });
  return { wrapper, dispatch };
};

const endButton = wrapper => wrapper.find('[title="END_CONVERSATION"]');

describe('HeaderActions behaviour', () => {
  beforeEach(() => {
    env.iframe = false;
    env.rn = false;
    vi.clearAllMocks();
    window.chatwootWebChannel = {
      enabledFeatures: ['end_conversation'],
      websiteToken: 'tok',
    };
    window.authToken = 'cookie';
  });

  it('hides the actions when there is nothing to show', () => {
    const { wrapper } = mountActions({ status: 'resolved' });
    expect(wrapper.find('.actions').exists()).toBe(false);
  });

  it('shows the actions inside an iframe or app web view', () => {
    env.iframe = true;
    expect(
      mountActions({ status: 'resolved' }).wrapper.find('.actions').exists()
    ).toBe(true);
    env.iframe = false;
    env.rn = true;
    const { wrapper } = mountActions({ status: 'resolved' });
    expect(wrapper.find('.close-button').classes()).toContain(
      'rn-close-button'
    );
  });

  it('ends open, snoozed and pending conversations', async () => {
    env.iframe = true;
    await Promise.all(
      ['open', 'snoozed', 'pending'].map(async status => {
        const { wrapper, dispatch } = mountActions({ status });
        await endButton(wrapper).trigger('click');
        expect(dispatch).toHaveBeenCalledWith(
          'conversation/resolveConversation'
        );
      })
    );
    expect(
      endButton(mountActions({ status: 'resolved' }).wrapper).exists()
    ).toBe(false);
  });

  it('hides end conversation when not allowed, disabled or unwanted', () => {
    expect(endButton(mountActions({ canEnd: false }).wrapper).exists()).toBe(
      false
    );
    expect(
      endButton(
        mountActions({ props: { showEndConversationButton: false } }).wrapper
      ).exists()
    ).toBe(false);
    window.chatwootWebChannel.enabledFeatures = [];
    expect(endButton(mountActions().wrapper).exists()).toBe(false);
  });

  it('pops the chat out into a new window', async () => {
    env.iframe = true;
    const { wrapper } = mountActions({
      status: 'resolved',
      props: { showPopoutButton: true },
    });
    await wrapper.find('.new-window--button').trigger('click');
    expect(env.iframeSend).toHaveBeenCalledWith({ event: 'closeWindow' });
    expect(env.popout).toHaveBeenCalledWith(
      window.location.origin,
      'tok',
      'fr',
      'cookie'
    );
  });

  it('closes through the iframe or the app bridge', async () => {
    env.iframe = true;
    await mountActions().wrapper.find('.close-button').trigger('click');
    expect(env.iframeSend).toHaveBeenCalledWith({ event: 'closeWindow' });

    env.iframe = false;
    await mountActions().wrapper.find('.close-button').trigger('click');
    expect(env.rnSend).toHaveBeenCalledWith({ type: 'close-widget' });
  });
});
