/**
 * OneTeam specs for the website SDK's chat bubble: building the bubble icon,
 * opening and closing the widget, and the unread badge.
 */
import {
  addUnreadClass,
  bubbleHolder,
  chatBubble,
  closeBubble,
  createBubbleHolder,
  createBubbleIcon,
  onBubbleClick,
  onClickChatBubble,
  removeUnreadClass,
  setBubbleText,
  widgetHolder,
} from '../bubbleHelpers';
import { IFrameHelper } from '../IFrameHelper';

describe('SDK chat bubble', () => {
  beforeEach(() => {
    window.$chatwoot = { type: 'standard', position: 'right', isOpen: false };
    vi.spyOn(IFrameHelper.events, 'onBubbleToggle').mockImplementation(
      () => {}
    );
  });

  it('builds a standard bubble icon on the configured side', () => {
    const target = document.createElement('button');

    createBubbleIcon({ className: 'woot-widget-bubble', path: 'M0 0', target });

    expect(target.className).toBe('woot-widget-bubble woot-elements--right');
    expect(target.title).toBe('Open chat window');
    expect(target.querySelector('path').getAttribute('d')).toBe('M0 0');
  });

  it('adds a text label to the expanded bubble and updates it', () => {
    window.$chatwoot.type = 'expanded_bubble';
    const target = document.createElement('button');
    document.body.appendChild(target);

    createBubbleIcon({ className: 'woot-widget-bubble', path: 'M0 0', target });
    setBubbleText('Chat with us');

    expect(target.className).toContain('woot-widget--expanded');
    expect(
      document.getElementById('woot-widget--expanded__text').innerText
    ).toBe('Chat with us');
    target.remove();
  });

  it('ignores bubble text for the standard bubble', () => {
    expect(() => setBubbleText('Chat with us')).not.toThrow();
  });

  it('adds the bubble holder, hidden when the site hides the bubble', () => {
    createBubbleHolder(true);

    expect(document.getElementById('cw-bubble-holder')).toBe(bubbleHolder);
    expect(bubbleHolder.classList).toContain('woot-hidden');
    expect(bubbleHolder.classList).toContain('woot--bubble-holder');
  });

  it('shows the bubble holder when the site keeps the bubble', () => {
    bubbleHolder.className = '';

    createBubbleHolder(false);

    expect(bubbleHolder.classList).not.toContain('woot-hidden');
  });

  it('opens and closes the widget and announces each change', () => {
    const events = [];
    const listener = event => events.push(event.type);
    window.addEventListener('chatwoot:opened', listener);
    window.addEventListener('chatwoot:closed', listener);
    const focus = vi.spyOn(chatBubble, 'focus');

    onBubbleClick();
    expect(window.$chatwoot.isOpen).toBe(true);
    expect(widgetHolder.classList).toContain('woot--hide');
    expect(closeBubble.classList).toContain('woot--hide');

    onBubbleClick({ toggleValue: false });
    expect(window.$chatwoot.isOpen).toBe(false);
    expect(focus).toHaveBeenCalled();

    expect(events).toEqual(['chatwoot:opened', 'chatwoot:closed']);
    expect(IFrameHelper.events.onBubbleToggle).toHaveBeenCalledWith(true);
    expect(IFrameHelper.events.onBubbleToggle).toHaveBeenCalledWith(false);
    window.removeEventListener('chatwoot:opened', listener);
    window.removeEventListener('chatwoot:closed', listener);
  });

  it('does nothing when asked for the state the widget is already in', () => {
    onBubbleClick({ toggleValue: false });

    expect(IFrameHelper.events.onBubbleToggle).not.toHaveBeenCalled();
  });

  it('toggles the widget when the bubble holder is clicked', () => {
    onClickChatBubble();
    bubbleHolder.click();

    expect(window.$chatwoot.isOpen).toBe(true);
  });

  it('marks and unmarks the widget holder as having unread messages', () => {
    const holder = document.createElement('div');
    holder.className = 'woot-widget-holder';
    document.body.appendChild(holder);

    addUnreadClass();
    expect(holder.classList).toContain('has-unread-view');
    removeUnreadClass();
    expect(holder.classList).not.toContain('has-unread-view');
    holder.remove();
  });
});
