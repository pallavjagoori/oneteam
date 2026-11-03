/**
 * Covers the widget image bubble: link, thumbnail, time and the error event.
 */
import { mount } from '@vue/test-utils';
import ImageBubble from '../ImageBubble.vue';

describe('ImageBubble', () => {
  it('renders the image and emits error when it fails', async () => {
    const wrapper = mount(ImageBubble, {
      props: {
        url: 'https://x.test/i.png',
        thumb: 'https://x.test/t.png',
        readableTime: '9:00',
      },
    });
    expect(wrapper.find('a').attributes('href')).toBe('https://x.test/i.png');
    expect(wrapper.find('img').attributes('src')).toBe('https://x.test/t.png');
    expect(wrapper.find('.time').text()).toBe('9:00');
    await wrapper.find('img').trigger('error');
    expect(wrapper.emitted('error')).toHaveLength(1);
  });
});
