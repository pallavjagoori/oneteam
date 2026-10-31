/**
 * OneTeam specs for the widget's iframe events: the "loaded" message, the
 * extra height the unread view needs, and which message updates the site
 * is told about.
 */
import {
  getExtraSpaceToScroll,
  loadedEventConfig,
  shouldTriggerMessageUpdateEvent,
} from '../IframeEventHelper';

describe('widget iframe events', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('describes the loaded widget with its auth token and channel config', () => {
    window.authToken = 'auth-1';
    window.chatwootWebChannel = { websiteToken: 'web-1' };

    expect(loadedEventConfig()).toEqual({
      event: 'loaded',
      config: { authToken: 'auth-1', channelConfig: { websiteToken: 'web-1' } },
    });
  });

  it('adds up the unread view heights', () => {
    expect(getExtraSpaceToScroll()).toBe(0);

    document.body.innerHTML =
      '<div class="unread-messages"></div><div class="close-unread-wrap"></div><div class="open-read-view-wrap"></div>';
    const heights = {
      'unread-messages': 100,
      'close-unread-wrap': 20,
      'open-read-view-wrap': 30,
    };
    Object.entries(heights).forEach(([className, height]) => {
      Object.defineProperty(
        document.querySelector(`.${className}`),
        'scrollHeight',
        {
          value: height,
        }
      );
    });
    expect(getExtraSpaceToScroll()).toBe(48 + 100 + 20 + 30);

    document.querySelector('.close-unread-wrap').remove();
    document.querySelector('.open-read-view-wrap').remove();
    expect(getExtraSpaceToScroll()).toBe(148);
  });

  it('only reports message updates that submit form values', () => {
    expect(shouldTriggerMessageUpdateEvent({})).toBe(false);
    expect(
      shouldTriggerMessageUpdateEvent({
        previous_changes: { content: ['a', 'b'] },
      })
    ).toBe(false);
    expect(
      shouldTriggerMessageUpdateEvent({
        previous_changes: { content_attributes: [{}, null] },
      })
    ).toBe(false);
    expect(
      shouldTriggerMessageUpdateEvent({
        previous_changes: {
          content_attributes: [{}, { submitted_values: [] }],
        },
      })
    ).toBe(true);
  });
});
