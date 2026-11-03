/**
 * OneTeam behaviour spec for the attachment previews in the new
 * conversation composer.
 *
 * Covers showing images as thumbnails and other files by name (using the
 * resource's content type or browser file type), hiding a section that
 * has nothing to show, and removing an image or a file.
 */
import { mount } from '@vue/test-utils';
import AttachmentPreviews from '../AttachmentPreviews.vue';

const Button = {
  name: 'Button',
  props: ['icon'],
  emits: ['click'],
  template: '<button :class="icon" @click="$emit(\'click\')" />',
};

const image = {
  id: 'a',
  thumb: 'blob:photo',
  resource: { id: 1, content_type: 'image/png', name: 'photo.png' },
};
const pdf = {
  id: 'b',
  resource: { id: 2, type: 'application/pdf', name: 'report.pdf' },
};

const mountPreviews = attachments =>
  mount(AttachmentPreviews, {
    props: { attachments },
    global: { stubs: { Button } },
  });

describe('AttachmentPreviews behaviour', () => {
  it('shows images as thumbnails and files by name', () => {
    const wrapper = mountPreviews([image, pdf]);
    expect(wrapper.find('img').attributes('src')).toBe('blob:photo');
    expect(wrapper.find('span').text()).toBe('report.pdf');
    expect(mountPreviews([image]).find('span').exists()).toBe(false);
    expect(mountPreviews([pdf]).find('img').exists()).toBe(false);
  });

  it('removes an image or a file', async () => {
    const wrapper = mountPreviews([image, pdf]);
    await wrapper.find('button.i-lucide-trash').trigger('click');
    await wrapper.find('button.i-lucide-x').trigger('click');
    expect(wrapper.emitted('update:attachments')).toEqual([[[pdf]], [[image]]]);
  });
});
