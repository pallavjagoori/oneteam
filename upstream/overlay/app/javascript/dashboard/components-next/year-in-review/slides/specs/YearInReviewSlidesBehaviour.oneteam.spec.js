/**
 * OneTeam behaviour spec for the Year in Review stat slides.
 *
 * Covers every comparison band on the busiest day and conversations
 * slides, the large number formatting, and each personality with its
 * response time wording.
 */
import { mount } from '@vue/test-utils';
import BusiestDaySlide from '../BusiestDaySlide.vue';
import ConversationsSlide from '../ConversationsSlide.vue';
import PersonalitySlide from '../PersonalitySlide.vue';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key, params) => (params ? `${key}|${params.time}` : key),
  }),
}));

describe('Year in Review slides', () => {
  it.each([
    [5, '0_5'],
    [10, '5_10'],
    [25, '10_25'],
    [50, '25_50'],
    [100, '50_100'],
    [500, '100_500'],
    [501, '500_PLUS'],
  ])('compares a busiest day of %i conversations', (count, band) => {
    const wrapper = mount(BusiestDaySlide, {
      props: { busiestDay: { count, date: 'Mar 3' } },
    });
    expect(wrapper.text()).toContain(
      `YEAR_IN_REVIEW.BUSIEST_DAY.COMPARISON.${band}`
    );
    expect(wrapper.text()).toContain('Mar 3');
  });

  it.each([
    [0, 'YEAR_IN_REVIEW.CONVERSATIONS.FALLBACK'],
    [50, 'YEAR_IN_REVIEW.CONVERSATIONS.COMPARISON.0_50'],
    [100, 'YEAR_IN_REVIEW.CONVERSATIONS.COMPARISON.50_100'],
    [500, 'YEAR_IN_REVIEW.CONVERSATIONS.COMPARISON.100_500'],
    [2000, 'YEAR_IN_REVIEW.CONVERSATIONS.COMPARISON.500_2000'],
    [10000, 'YEAR_IN_REVIEW.CONVERSATIONS.COMPARISON.2000_10000'],
    [100000, 'YEAR_IN_REVIEW.CONVERSATIONS.COMPARISON.10000_PLUS'],
  ])('compares %i conversations', (totalConversations, text) => {
    const wrapper = mount(ConversationsSlide, {
      props: { totalConversations },
    });
    expect(wrapper.text()).toContain(text);
  });

  it('formats conversation counts and widens for large totals', () => {
    const big = mount(ConversationsSlide, {
      props: { totalConversations: 100000 },
    });
    expect(big.text()).toContain('100k+');
    expect(big.find('.max-w-4xl').exists()).toBe(true);
    const small = mount(ConversationsSlide, {
      props: { totalConversations: 42 },
    });
    expect(small.text()).toContain('42');
    expect(small.find('.max-w-3xl').exists()).toBe(true);
  });

  it.each([
    [30, 'Swift Helper', 'SWIFT_HELPER', 'less than a minute'],
    [60, 'Swift Helper', 'SWIFT_HELPER', '1 minute'],
    [180, 'Quick Responder', 'QUICK_RESPONDER', '3 minutes'],
    [600, 'Steady Support', 'STEADY_SUPPORT', '10 minutes'],
    [3600, 'Thoughtful Advisor', 'THOUGHTFUL_ADVISOR', '1 hour'],
    [7200, 'Thoughtful Advisor', 'THOUGHTFUL_ADVISOR', '2 hours'],
    [90000, 'Thoughtful Advisor', 'THOUGHTFUL_ADVISOR', 'more than a day'],
  ])('describes a %i second response time', (seconds, name, key, time) => {
    const wrapper = mount(PersonalitySlide, {
      props: { supportPersonality: { avg_response_time_seconds: seconds } },
    });
    expect(wrapper.text()).toContain(name);
    expect(wrapper.text()).toContain(
      `YEAR_IN_REVIEW.PERSONALITY.MESSAGES.${key}|${time}`
    );
  });
});
