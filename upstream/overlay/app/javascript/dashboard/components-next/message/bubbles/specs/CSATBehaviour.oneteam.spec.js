/**
 * OneTeam behaviour spec for the CSAT survey message bubble.
 *
 * Covers the survey text (or the default heading), showing a
 * translation unless the original is toggled on, the submitted emoji
 * rating label or star rating, the feedback message, and nothing below
 * the text before a rating is submitted.
 */
import { computed, ref } from 'vue';
import { mount } from '@vue/test-utils';
import CSATBubble from '../CSAT.vue';

const env = vi.hoisted(() => ({}));

vi.mock('../../provider.js', () => ({
  useMessageContext: () => env.context,
}));
vi.mock('dashboard/composables/useTranslations', () => ({
  useTranslations: () => ({
    hasTranslations: computed(() => env.translated),
    translationContent: computed(() => 'Bonjour'),
  }),
}));

const FormattedContent = {
  name: 'FormattedContent',
  props: ['content'],
  template: '<p class="content">{{ content }}</p>',
};
const TranslationToggle = {
  name: 'TranslationToggle',
  props: { showingOriginal: Boolean },
  emits: ['toggle'],
  template: '<button @click="$emit(\'toggle\')" />',
};

const mountBubble = ({
  content = 'Rate us',
  attrs = {},
  translated = false,
}) => {
  env.translated = translated;
  env.context = {
    content: ref(content),
    contentAttributes: ref(attrs),
    contactSide: ref(false),
    showingOriginal: ref(false),
  };
  return mount(CSATBubble, {
    global: {
      stubs: {
        BaseBubble: { template: '<div><slot /></div>' },
        FormattedContent,
        TranslationToggle,
      },
    },
  });
};

const submitted = (rating, extra = {}) => ({
  submittedValues: { csatSurveyResponse: { rating, ...extra } },
});

describe('CSAT bubble behaviour', () => {
  it('shows the survey text or the default heading', () => {
    const wrapper = mountBubble({});
    expect(wrapper.find('.content').text()).toBe('Rate us');
    expect(wrapper.find('dl').exists()).toBe(false);

    const empty = mountBubble({ content: '', attrs: null });
    expect(empty.find('h4').text()).toBe('CONVERSATION.CSAT_REPLY_MESSAGE');
  });

  it('switches between the translation and the original', async () => {
    const wrapper = mountBubble({ translated: true });
    expect(wrapper.find('.content').text()).toBe('Bonjour');
    await wrapper.find('button').trigger('click');
    expect(env.context.showingOriginal.value).toBe(true);
    expect(wrapper.find('.content').text()).toBe('Rate us');
  });

  it('shows the emoji rating label and feedback', () => {
    const wrapper = mountBubble({
      attrs: submitted(1, { feedbackMessage: 'Slow reply' }),
    });
    const dd = wrapper.findAll('dd').map(d => d.text());
    expect(dd).toEqual(['CSAT.RATINGS.POOR', 'Slow reply']);
    expect(wrapper.findAll('dt').map(d => d.text())).toEqual([
      'CONVERSATION.RATING_TITLE',
      'CONVERSATION.FEEDBACK_TITLE',
    ]);
  });

  it('shows filled stars for a star rating', () => {
    const wrapper = mountBubble({
      attrs: { displayType: 'star', ...submitted(3) },
    });
    expect(wrapper.findAll('.i-ri-star-fill')).toHaveLength(3);
    expect(wrapper.findAll('.i-ri-star-line')).toHaveLength(2);
    expect(wrapper.findAll('dt')).toHaveLength(1);
  });

  it('counts no stars without a rating value', () => {
    const wrapper = mountBubble({ attrs: { displayType: 'star' } });
    expect(wrapper.vm.starRatingValue).toBe(0);
    expect(wrapper.vm.rating).toBe(null);
  });
});
