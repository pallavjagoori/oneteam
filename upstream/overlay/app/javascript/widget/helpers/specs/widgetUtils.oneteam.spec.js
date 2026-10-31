/**
 * OneTeam spec for the widget's postMessage helpers: messages to the host
 * page and to a React Native WebView carry the chatwoot-widget: prefix.
 */
import { sendMessage, RNHelper } from '../utils';

describe('widget postMessage helpers', () => {
  it('posts a prefixed JSON message to the parent page', () => {
    const postMessage = vi.spyOn(window.parent, 'postMessage');
    sendMessage({ event: 'loaded', config: { a: 1 } });
    expect(postMessage).toHaveBeenCalledWith(
      'chatwoot-widget:{"event":"loaded","config":{"a":1}}',
      '*'
    );
    postMessage.mockRestore();
  });

  it('posts a prefixed JSON message to a React Native WebView', () => {
    window.ReactNativeWebView = { postMessage: vi.fn() };
    expect(RNHelper.isRNWebView()).toBe(window.ReactNativeWebView);
    RNHelper.sendMessage({ event: 'toggleBubble' });
    expect(window.ReactNativeWebView.postMessage).toHaveBeenCalledWith(
      'chatwoot-widget:{"event":"toggleBubble"}'
    );
    delete window.ReactNativeWebView;
  });
});
