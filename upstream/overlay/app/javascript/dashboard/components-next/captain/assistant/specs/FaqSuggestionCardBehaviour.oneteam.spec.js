/**
 * OneTeam behaviour spec for a Captain FAQ suggestion card.
 *
 * Covers the source count, language badge (or none), question, answer,
 * assistant name, updated or created time, and the review, dismiss and
 * approve actions including the busy state.
 */
import { mount } from '@vue/test-utils';
import FaqSuggestionCard from '../FaqSuggestionCard.vue';

const times = [];
vi.mock('shared/helpers/timeHelper', () => ({
  dynamicTime: time => {
    times.push(time);
    return 'ago';
  },
}));

const Button = {
  name: 'Button',
  props: ['label', 'disabled', 'isLoading'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};
const suggestion = {
  question: 'How to refund?',
  answer: 'Use the form.',
  source_count: 3,
  language: 'pt_br',
  assistant: { name: 'Ava' },
  created_at: 1,
  updated_at: 2,
};
const mountCard = props =>
  mount(FaqSuggestionCard, {
    props: { suggestion, ...props },
    global: {
      stubs: {
        Button,
        Icon: true,
        CardLayout: { template: '<section><slot /></section>' },
      },
      directives: { tooltip: {} },
    },
  });

describe('FaqSuggestionCard behaviour', () => {
  it('shows the suggestion and emits actions', async () => {
    const wrapper = mountCard();
    expect(wrapper.text()).toContain('CAPTAIN.FAQ_SUGGESTIONS.SOURCE_COUNT');
    expect(wrapper.text()).toContain('PT-BR');
    expect(wrapper.find('h3').text()).toBe('How to refund?');
    expect(wrapper.text()).toContain('Use the form.');
    expect(wrapper.text()).toContain('Ava');
    expect(times).toContain(2);
    const [review, dismiss, approve] = wrapper.findAll('button');
    await review.trigger('click');
    await dismiss.trigger('click');
    await approve.trigger('click');
    expect(wrapper.emitted('review')).toEqual([[suggestion]]);
    expect(wrapper.emitted('dismiss')).toEqual([[suggestion]]);
    expect(wrapper.emitted('approve')).toEqual([[suggestion]]);
  });

  it('copes without language, update time or assistant', () => {
    times.length = 0;
    const wrapper = mountCard({
      isLoading: true,
      suggestion: {
        ...suggestion,
        language: null,
        updated_at: null,
        assistant: null,
      },
    });
    expect(wrapper.text()).not.toContain('PT-BR');
    expect(times).toEqual([1]);
    const approve = wrapper.findAllComponents(Button)[2];
    expect(approve.props()).toMatchObject({ isLoading: true, disabled: true });
  });
});
