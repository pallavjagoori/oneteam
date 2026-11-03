/**
 * OneTeam behaviour spec for the stacked changelog card group.
 *
 * Covers stacking at most five posts in layers around the current one,
 * keying posts without slugs, forwarding read more and dismiss, and only
 * opening the image of the front card that is not being dismissed.
 *
 * The fully hidden layer (line 51) is unreachable: the position is taken
 * modulo the stack size, which is at most five, the number of layers.
 */
import { mount } from '@vue/test-utils';
import GroupedStackedChangelogCard from '../GroupedStackedChangelogCard.vue';

const Card = {
  name: 'StackedChangelogCard',
  props: ['card', 'isActive', 'isDismissing'],
  emits: ['readMore', 'dismiss', 'imgClick'],
  template: '<article />',
};
const posts = ['a', 'b', 'c', 'd', 'e', 'f'].map(slug => ({ slug }));

const mountGroup = props =>
  mount(GroupedStackedChangelogCard, {
    props: { posts, ...props },
    global: { stubs: { StackedChangelogCard: Card } },
  });

describe('GroupedStackedChangelogCard behaviour', () => {
  it('stacks five posts around the current one', () => {
    const wrapper = mountGroup({ currentIndex: 1, dismissingSlugs: ['c'] });
    const cards = wrapper.findAllComponents(Card);
    expect(cards).toHaveLength(5);
    expect(cards[1].props('isActive')).toBe(true);
    expect(cards[2].props('isDismissing')).toBe(true);
    expect(cards[1].element.parentElement.className).toContain('z-50');
    expect(cards[0].element.parentElement.className).toContain('z-10');
  });

  it('keys posts without slugs by position', () => {
    const wrapper = mountGroup({ posts: [{}, {}] });
    expect(wrapper.findAllComponents(Card)).toHaveLength(2);
  });

  it('forwards card events', async () => {
    const wrapper = mountGroup({ dismissingSlugs: ['b'] });
    const [front, second] = wrapper.findAllComponents(Card);
    await front.vm.$emit('readMore');
    await front.vm.$emit('dismiss');
    await front.vm.$emit('imgClick');
    await second.vm.$emit('imgClick');
    expect(wrapper.emitted('readMore')).toEqual([['a']]);
    expect(wrapper.emitted('dismiss')).toEqual([['a']]);
    expect(wrapper.emitted('imgClick')).toEqual([[{ slug: 'a', index: 0 }]]);

    const dismissing = mountGroup({ dismissingSlugs: ['a'] });
    await dismissing.findAllComponents(Card)[0].vm.$emit('imgClick');
    expect(dismissing.emitted('imgClick')).toBeUndefined();
  });
});
