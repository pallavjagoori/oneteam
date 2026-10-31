/**
 * OneTeam specs for opening the widget in its own window.
 */
import { popoutChatWindow } from '../popoutHelper';

describe('popoutChatWindow', () => {
  it('opens a fixed-size window for the conversation and focuses it', () => {
    const popup = { focus: vi.fn() };
    const open = vi.spyOn(window, 'open').mockReturnValue(popup);

    popoutChatWindow('https://app.test', 'web-1', 'fr', 'cookie-1');

    const [url, name, features] = open.mock.calls[0];
    expect(url).toContain('https://app.test/widget');
    expect(url).toContain('website_token=web-1');
    expect(url).toContain('locale=fr');
    expect(url).toContain('cw_conversation=cookie-1');
    expect(name).toBe('webwidget_session_web-1');
    expect(features).toBe('resizable=off,width=400,height=600');
    expect(popup.focus).toHaveBeenCalled();
  });

  it('logs instead of failing when a popup blocker returns no window', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    expect(() =>
      popoutChatWindow('https://app.test', 'web-1', 'en', '')
    ).not.toThrow();
    expect(log).toHaveBeenCalledWith(expect.any(TypeError));
  });
});
