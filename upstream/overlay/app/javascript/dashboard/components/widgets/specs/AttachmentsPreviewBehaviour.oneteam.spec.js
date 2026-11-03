/**
 * OneTeam behaviour spec for the reply box attachments preview.
 *
 * Covers image thumbnails and file icons for uploaded and stored files,
 * names and sizes from either shape, hiding recorded voice messages, and
 * removing one attachment while keeping the voice recordings.
 */
import { mount } from '@vue/test-utils';
import AttachmentsPreview from '../AttachmentsPreview.vue';

const Button = {
  name: 'Button',
  emits: ['click'],
  template: '<button @click="$emit(\'click\')" />',
};

const attachments = [
  {
    id: 1,
    thumb: 'blob:a',
    resource: { name: 'photo.png', type: 'image/png', size: 2048 },
  },
  {
    id: 2,
    resource: {
      filename: 'notes.pdf',
      content_type: 'application/pdf',
      byte_size: 1024,
    },
  },
  { id: 3, isVoiceMessage: true, resource: { name: 'v.mp3', type: 'audio' } },
];

describe('AttachmentsPreview behaviour', () => {
  it('lists files and removes one', async () => {
    const wrapper = mount(AttachmentsPreview, {
      props: { attachments },
      global: { stubs: { Button } },
    });
    const rows = wrapper.findAll('.rounded-md');
    expect(rows).toHaveLength(2);
    expect(rows[0].find('img').attributes('src')).toBe('blob:a');
    expect(rows[0].text()).toContain('photo.png');
    expect(rows[0].text()).toContain('2 KB');
    expect(rows[1].find('img').exists()).toBe(false);
    expect(rows[1].text()).toContain('notes.pdf');
    expect(rows[1].text()).toContain('1 KB');

    await rows[0].find('button').trigger('click');
    expect(wrapper.emitted('removeAttachment')[0][0].map(a => a.id)).toEqual([
      2, 3,
    ]);
  });

  it('defaults to no attachments', () => {
    expect(mount(AttachmentsPreview).findAll('.rounded-md')).toHaveLength(0);
  });
});
