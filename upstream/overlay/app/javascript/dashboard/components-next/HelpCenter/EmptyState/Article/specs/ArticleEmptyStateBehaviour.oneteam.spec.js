/**
 * OneTeam behaviour spec for the help center articles empty state.
 *
 * Covers the title and subtitle, five sample article cards, and the
 * optional create button.
 */
import { mount } from '@vue/test-utils';
import ArticleEmptyState from '../ArticleEmptyState.vue';
import articleContent from '../../Portal/portalEmptyStateContent.js';

const EmptyStateLayout = {
  name: 'EmptyStateLayout',
  props: ['title', 'subtitle'],
  template:
    '<div><slot name="empty-state-item" /><slot name="actions" /></div>',
};
const ArticleCard = {
  name: 'ArticleCard',
  props: ['id', 'title', 'views'],
  template: '<div />',
};
const Button = {
  name: 'NextButton',
  props: ['label'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};

/**
 * Mounts the empty state.
 *
 * @param {object} props Empty state props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountState = props =>
  mount(ArticleEmptyState, {
    props,
    global: { stubs: { EmptyStateLayout, ArticleCard, Button } },
  });

describe('ArticleEmptyState behaviour', () => {
  it('shows sample articles and the create button', async () => {
    const wrapper = mountState({
      title: 'No articles',
      subtitle: 'Write one',
      buttonLabel: 'New article',
    });
    expect(wrapper.getComponent(EmptyStateLayout).props()).toEqual({
      title: 'No articles',
      subtitle: 'Write one',
    });
    const cards = wrapper.findAllComponents(ArticleCard);
    expect(cards).toHaveLength(Math.min(5, articleContent.length));
    expect(cards[0].props('title')).toBe(articleContent[0].title);
    await wrapper.get('button').trigger('click');
    expect(wrapper.get('button').text()).toBe('New article');
    expect(wrapper.emitted('click')).toHaveLength(1);
  });

  it('hides the button', () => {
    expect(mountState({ showButton: false }).find('button').exists()).toBe(
      false
    );
  });
});
