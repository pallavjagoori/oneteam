/**
 * OneTeam behaviour spec for the conversation card message preview.
 *
 * Covers the private, outgoing and activity icons in single and multi
 * line layouts, stickers, email subjects, attachments with and without
 * a known icon, and the empty message fallbacks.
 */
import { mount } from '@vue/test-utils';
import MessagePreview from '../MessagePreview.vue';

/**
 * Mounts the preview.
 *
 * @param {object} message message shown
 * @param {object} props extra props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountPreview = (message, props = {}) =>
  mount(MessagePreview, {
    props: { message, ...props },
    global: {
      mocks: { $t: key => key },
      stubs: { Icon: { props: ['icon'], template: '<i :data-icon="icon" />' } },
    },
  });

/**
 * Lists the icons rendered.
 *
 * @param {import('@vue/test-utils').VueWrapper} wrapper mounted preview
 * @returns {string[]}
 */
const icons = wrapper =>
  wrapper.findAll('i').map(icon => icon.attributes('data-icon'));

describe('MessagePreview behaviour', () => {
  it.each([
    [{ private: true, message_type: 1 }, 'i-lucide-lock-keyhole'],
    [{ message_type: 1 }, 'i-lucide-undo-2'],
    [{ message_type: 2 }, 'i-lucide-info'],
  ])('shows the type icon in both layouts', (extra, icon) => {
    const message = { content: 'Hi', attachments: [], ...extra };
    expect(icons(mountPreview(message))).toEqual([icon]);
    const multi = mountPreview(message, { multiLine: true });
    expect(icons(multi)).toEqual([icon]);
    expect(multi.find('span').classes()).toContain('line-clamp-2');
  });

  it('shows no type icon for incoming messages or when hidden', () => {
    const message = { content: 'Hi', message_type: 0, attachments: [] };
    expect(icons(mountPreview(message))).toEqual([]);
    expect(icons(mountPreview(message, { multiLine: true }))).toEqual([]);
    expect(
      icons(
        mountPreview({ ...message, private: true }, { showMessageType: false })
      )
    ).toEqual([]);
  });

  it('labels stickers as images and prefers the email subject', () => {
    const sticker = mountPreview({
      content: 'x',
      content_type: 'sticker',
      message_type: 0,
      attachments: [],
    });
    expect(sticker.text()).toContain('CHAT_LIST.ATTACHMENTS.image.CONTENT');
    expect(icons(sticker)).toEqual(['i-lucide-image']);

    const email = mountPreview({
      content: 'Body',
      content_attributes: { email: { subject: 'Subject line' } },
      attachments: [],
    });
    expect(email.text()).toBe('Subject line');
    expect(
      mountPreview({
        content: 'Body',
        content_attributes: {},
        attachments: [],
      }).text()
    ).toBe('Body');
  });

  it('describes attachments with or without an icon', () => {
    const audio = mountPreview({ attachments: [{ file_type: 'audio' }] });
    expect(icons(audio)).toEqual(['i-lucide-headphones']);
    expect(audio.text()).toBe('CHAT_LIST.ATTACHMENTS.audio.CONTENT');

    const unknown = mountPreview({ attachments: [{ file_type: 'other' }] });
    expect(icons(unknown)).toEqual([]);
    const hidden = mountPreview(
      { attachments: [{ file_type: 'image' }] },
      { showMessageType: false }
    );
    expect(icons(hidden)).toEqual([]);
    expect(mountPreview({ attachments: [] }).text()).toBe(
      'CHAT_LIST.ATTACHMENTS.undefined.CONTENT'
    );
  });

  it('falls back to the empty message text', () => {
    expect(mountPreview({}, { defaultEmptyMessage: 'Nothing' }).text()).toBe(
      'Nothing'
    );
    expect(mountPreview({}).text()).toBe('CHAT_LIST.NO_CONTENT');
  });
});
