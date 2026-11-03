/**
 * OneTeam behaviour spec for the signup testimonials panel.
 *
 * Covers showing a fetched testimonial, and reporting whether one is shown
 * after an empty list or a failed request.
 */
import { mount, flushPromises } from '@vue/test-utils';
import Testimonials from '../Index.vue';
import { getTestimonialContent } from '../../../../../../api/testimonials';

vi.mock('../../../../../../api/testimonials', () => ({
  getTestimonialContent: vi.fn(),
}));

const Card = {
  name: 'TestimonialCard',
  props: ['authorName', 'reviewContent'],
  template: '<blockquote>{{ authorName }}</blockquote>',
};

const mountPanel = async () => {
  const wrapper = mount(Testimonials, {
    global: { stubs: { TestimonialCard: Card } },
  });
  await flushPromises();
  return wrapper;
};

describe('Testimonials behaviour', () => {
  it('shows a fetched testimonial', async () => {
    getTestimonialContent.mockResolvedValue({
      data: [{ authorName: 'Ann', authorReview: 'Great' }],
    });
    const wrapper = await mountPanel();
    expect(wrapper.find('blockquote').text()).toBe('Ann');
    expect(wrapper.emitted('resizeContainers')).toEqual([[true]]);
  });

  it('reports no testimonial for an empty list or an error', async () => {
    getTestimonialContent.mockResolvedValue({ data: [] });
    const empty = await mountPanel();
    expect(empty.find('blockquote').exists()).toBe(false);
    expect(empty.emitted('resizeContainers')).toEqual([[false]]);

    getTestimonialContent.mockRejectedValue(new Error('offline'));
    const failed = await mountPanel();
    expect(failed.emitted('resizeContainers')).toEqual([[false]]);
  });
});
