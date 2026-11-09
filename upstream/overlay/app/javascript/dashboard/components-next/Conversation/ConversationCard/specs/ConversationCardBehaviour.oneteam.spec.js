/**
 * OneTeam behaviour spec for the next conversation card.
 *
 * Covers opening the conversation, opening it in a new tab with the
 * meta or control key, the last activity time, and switching between
 * the plain and meta message previews.
 */
import { mount } from '@vue/test-utils';
import ConversationCard from '../ConversationCard.vue';

const env = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => ({ push: env.push }),
  useRoute: () => ({ params: { accountId: 1 } }),
}));
vi.mock('shared/composables/useExactTimestamp', () => ({
  useExactTimestamp: () => () => 'exact',
}));
vi.mock('shared/helpers/timeHelper', () => ({
  dynamicTime: () => '5 minutes ago',
  shortTimestamp: value => `short ${value}`,
}));

/**
 * Mounts the card.
 *
 * @param {object} conversation conversation shown
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountCard = conversation =>
  mount(ConversationCard, {
    props: {
      conversation,
      contact: { name: 'Amy', thumbnail: 'a.png' },
      stateInbox: { name: 'Web', channelType: 'Channel::WebWidget' },
      accountLabels: [{ title: 'vip' }],
    },
    global: {
      directives: { tooltip: {} },
      stubs: {
        Avatar: true,
        Icon: true,
        CardPriorityIcon: true,
        CardMessagePreview: { template: '<div class="plain" />' },
        CardMessagePreviewWithMeta: {
          props: ['hasLabels'],
          template: '<div class="meta" />',
        },
      },
    },
  });

describe('ConversationCard behaviour', () => {
  it('opens the conversation and shows the plain preview', async () => {
    const wrapper = mountCard({ id: 7, timestamp: 100, labels: [] });
    expect(wrapper.text()).toContain('short 5 minutes ago');
    expect(wrapper.find('.plain').isVisible()).toBe(true);
    await wrapper.trigger('click');
    expect(env.push).toHaveBeenCalledWith({
      path: '/app/accounts/1/conversations/7',
    });
  });

  it('opens a new tab with a modifier key and shows labels', async () => {
    window.chatwootConfig = { hostURL: 'https://app.test' };
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const wrapper = mountCard({ id: 8, labels: ['vip'] });
    expect(wrapper.find('.meta').isVisible()).toBe(true);
    expect(wrapper.text()).not.toContain('short');
    await wrapper.trigger('click', { metaKey: true });
    await wrapper.trigger('click', { ctrlKey: true });
    expect(openSpy).toHaveBeenCalledTimes(2);
    expect(openSpy).toHaveBeenCalledWith(
      'https://app.test/app/accounts/1/conversations/8',
      '_blank',
      'noopener noreferrer nofollow'
    );
    expect(env.push).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });
});
