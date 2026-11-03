/**
 * OneTeam behaviour spec for the attachment chips under a message.
 *
 * Covers grouping images and videos (images first), audio recordings and
 * files into their own rows, skipping other attachment types, aligning
 * the rows to the right for outgoing messages, keeping the caller's
 * class, and coping with a missing attachments list.
 */
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import AttachmentChips from '../AttachmentChips.vue';

const env = vi.hoisted(() => ({ orientation: null }));

vi.mock('../../provider.js', () => ({
  useMessageContext: () => ({ orientation: env.orientation }),
}));

const chip = name => ({
  name,
  props: ['attachment'],
  template: `<i class="${name}">{{ attachment.id }}</i>`,
});

const mountChips = (attachments, attrs = {}) =>
  mount(AttachmentChips, {
    props: { attachments },
    attrs,
    global: {
      stubs: {
        ImageChip: chip('ImageChip'),
        VideoChip: chip('VideoChip'),
        AudioChip: chip('AudioChip'),
        FileChip: chip('FileChip'),
      },
    },
  });

const ids = (wrapper, name) =>
  wrapper.findAll(`.${name}`).map(chipEl => chipEl.text());

describe('AttachmentChips behaviour', () => {
  beforeEach(() => {
    env.orientation = ref('left');
  });

  it('groups media, recordings and files', () => {
    const wrapper = mountChips(
      [
        { id: 1, fileType: 'video' },
        { id: 2, fileType: 'image' },
        { id: 3, fileType: 'audio' },
        { id: 4, fileType: 'file' },
        { id: 5, fileType: 'location' },
      ],
      { class: 'gap-2' }
    );
    expect(ids(wrapper, 'ImageChip')).toEqual(['2']);
    expect(ids(wrapper, 'VideoChip')).toEqual(['1']);
    expect(wrapper.findAll('i').map(i => i.text())).toEqual([
      '2',
      '1',
      '3',
      '4',
    ]);
    const rows = wrapper.findAll('.flex-wrap');
    expect(rows).toHaveLength(3);
    expect(rows[0].classes()).toContain('gap-2');
    expect(rows[0].classes()).not.toContain('justify-end');
  });

  it('aligns rows right for outgoing messages', () => {
    env.orientation = ref('right');
    const wrapper = mountChips([{ id: 4, fileType: 'file' }]);
    expect(wrapper.find('.flex-wrap').classes()).toContain('justify-end');
  });

  it('renders nothing without usable attachments', () => {
    expect(mountChips(null).findAll('i')).toHaveLength(0);
    expect(mountChips(undefined).findAll('i')).toHaveLength(0);
  });
});
