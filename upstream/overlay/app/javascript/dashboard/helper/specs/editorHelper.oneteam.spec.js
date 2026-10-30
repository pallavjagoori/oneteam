import * as Sentry from '@sentry/vue';
import {
  EditorState,
  EditorView,
  messageSchema,
} from '@chatwoot/prosemirror-schema';
import { FORMATTING } from 'dashboard/constants/editor';
import {
  calculateMenuPosition,
  cleanSignature,
  extractTextFromMarkdown,
  getContentNode,
  getEffectiveChannelType,
  getFormattingForEditor,
  getMenuAnchor,
  insertAtCursor,
  removeSignature,
  scrollCursorIntoView,
  stripUnsupportedFormatting,
  stripUnsupportedMarkdown,
} from '../editorHelper';

vi.mock('@sentry/vue', () => ({ captureException: vi.fn() }));

describe('editorHelper (OneTeam)', () => {
  it('returns empty text for empty markdown', () => {
    expect(extractTextFromMarkdown('')).toBe('');
  });

  it('strips all formatting for an unknown channel', () => {
    expect(stripUnsupportedMarkdown('**bold**', 'Channel::Unknown')).toBe(
      'bold'
    );
  });

  it('returns the signature as it is when it cannot be parsed', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(cleanSignature(null)).toBeNull();
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it('formats Twilio WhatsApp like WhatsApp', () => {
    expect(getEffectiveChannelType('Channel::TwilioSms', 'whatsapp')).toBe(
      'Channel::Whatsapp'
    );
    expect(getEffectiveChannelType('Channel::TwilioSms', 'sms')).toBe(
      'Channel::TwilioSms'
    );
    expect(getEffectiveChannelType('Channel::Email')).toBe('Channel::Email');
  });

  it('removes a signature in its channel-stripped form', () => {
    expect(
      removeSignature('Hello\n\n--\n\nBest', '**Best**', 'Channel::Sms')
    ).toBe('Hello\n\n');
  });

  it('scrolls the cursor node into view when it can', () => {
    const scrollIntoView = vi.fn();
    const view = node => ({
      state: { selection: { head: 1 } },
      domAtPos: () => ({ node }),
    });
    scrollCursorIntoView(view({ scrollIntoView }));
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });
    scrollCursorIntoView(view({}));
    scrollCursorIntoView(view(null));
  });

  it('inserts the inline content of a single-paragraph document', () => {
    const state = EditorState.create({
      schema: messageSchema,
      doc: messageSchema.node('doc', null, [
        messageSchema.node('paragraph', null, [messageSchema.text('Hi ')]),
      ]),
    });
    const editorView = new EditorView(document.createElement('div'), { state });
    const node = messageSchema.node('doc', null, [
      messageSchema.node('paragraph', null, [messageSchema.text('there')]),
    ]);
    const result = insertAtCursor(editorView, node, 4);
    expect(result.doc.textContent).toBe('Hi there');
    editorView.destroy();
  });

  it('leaves content alone for schemas without nodes', () => {
    expect(stripUnsupportedFormatting('**a**', { marks: { strong: {} } })).toBe(
      '**a**'
    );
  });

  it('creates tool nodes', () => {
    const create = vi.fn(() => 'tool-node');
    const editorView = { state: { schema: { nodes: { tools: { create } } } } };
    expect(
      getContentNode(
        editorView,
        'tool',
        { id: 1, title: 'Search' },
        { from: 1, to: 2 }
      )
    ).toEqual({ node: 'tool-node', from: 1, to: 2 });
    expect(create).toHaveBeenCalledWith({ id: 1, name: 'Search' });
  });

  it('can keep the Captain menu item', () => {
    expect(getFormattingForEditor('Channel::WebWidget', true).menu).toEqual(
      FORMATTING['Channel::WebWidget'].menu
    );
  });

  describe('menu positioning', () => {
    const rect = { top: 100, left: 0, right: 500, bottom: 400, width: 500 };
    const coords = (startTop, onTop = true) => ({
      start: { top: startTop, left: 20, right: 80, bottom: startTop + 20 },
      end: { top: 200, left: 40, right: 120, bottom: 220 },
      selTop: startTop,
      onTop,
    });

    it('sticks to the container edge when the selection start is hidden', () => {
      expect(getMenuAnchor(coords(50), rect, false)).toBe(10);
      expect(getMenuAnchor(coords(50), rect, true)).toBe(490);
    });

    it('aligns right-to-left menus to the selection end', () => {
      expect(getMenuAnchor(coords(150), rect, true)).toBe(80);
      expect(calculateMenuPosition(coords(150), rect, true)).toEqual({
        left: 0,
        top: -6,
        width: 300,
      });
    });
  });
});
