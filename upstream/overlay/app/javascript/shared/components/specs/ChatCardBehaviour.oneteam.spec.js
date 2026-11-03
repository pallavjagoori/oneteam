/**
 * Covers the chat card message: media, title, description and one button
 * per action.
 */
import { mount } from '@vue/test-utils';
import ChatCard from '../ChatCard.vue';

describe('ChatCard', () => {
  it('renders the card and its actions', () => {
    const wrapper = mount(ChatCard, {
      props: {
        title: 'Plan',
        description: 'Pro plan',
        mediaUrl: 'https://cdn.example.test/p.png',
        actions: [{ id: 1 }, { id: 2 }],
      },
      global: { stubs: { CardButton: { template: '<button />' } } },
    });
    expect(wrapper.find('img').attributes('src')).toBe(
      'https://cdn.example.test/p.png'
    );
    expect(wrapper.find('h4').text()).toBe('Plan');
    expect(wrapper.find('p').text()).toBe('Pro plan');
    expect(wrapper.findAll('button')).toHaveLength(2);
  });
});
