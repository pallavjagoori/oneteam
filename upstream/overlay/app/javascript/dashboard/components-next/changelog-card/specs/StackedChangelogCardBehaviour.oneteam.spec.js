/**
 * OneTeam behaviour spec for a single stacked changelog card.
 *
 * Covers the title and description, the preview image with and without
 * a feature image, the active and dismissing styles, and the read more,
 * dismiss and image click events without bubbling to the parent.
 */
import { mount } from '@vue/test-utils';
import StackedChangelogCard from '../StackedChangelogCard.vue';

const Button = {
  name: 'NextButton',
  props: ['label'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\', $event)">{{ label }}</button>',
};

/**
 * Mounts the card inside a parent with a click listener.
 *
 * @param {object} props Card props.
 * @param {Function} parentClick Parent click listener.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountCard = (props, parentClick = () => {}) =>
  mount(
    {
      components: { StackedChangelogCard },
      props: ['cardProps'],
      methods: { parentClick },
      template:
        '<div @click="parentClick"><StackedChangelogCard v-bind="cardProps" /></div>',
    },
    { props: { cardProps: props }, global: { stubs: { Button } } }
  );

const card = {
  title: 'Release',
  meta_title: 'New inbox',
  meta_description: 'Faster replies',
  feature_image: 'https://x.test/a.png',
};

describe('StackedChangelogCard behaviour', () => {
  it('shows the post and emits its actions without bubbling', async () => {
    const parentClick = vi.fn();
    const wrapper = mountCard({ card, isActive: true }, parentClick);
    const inner = wrapper.getComponent(StackedChangelogCard);
    expect(wrapper.get('h5').text()).toBe('New inbox');
    expect(wrapper.get('p').attributes('title')).toBe('Faster replies');
    expect(inner.classes()).toContain('hover:shadow');
    const img = wrapper.get('img');
    expect(img.attributes()).toMatchObject({
      src: 'https://x.test/a.png',
      alt: 'Release preview image',
    });
    await img.trigger('click');
    const [readMore, dismiss] = wrapper.findAll('button');
    await readMore.trigger('click');
    await dismiss.trigger('click');
    expect(Object.keys(inner.emitted())).toEqual(
      expect.arrayContaining(['imgClick', 'readMore', 'dismiss'])
    );
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('still renders an image slot without a feature image', async () => {
    const wrapper = mountCard({
      card: { ...card, feature_image: '' },
      isDismissing: true,
    });
    const inner = wrapper.getComponent(StackedChangelogCard);
    expect(inner.classes()).toContain('animate-fade-out');
    await wrapper.get('img').trigger('click');
    expect(inner.emitted('imgClick')).toHaveLength(1);
  });
});
