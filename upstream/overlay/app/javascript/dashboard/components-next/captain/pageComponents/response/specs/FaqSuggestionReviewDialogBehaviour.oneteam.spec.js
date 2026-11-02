/**
 * OneTeam behaviour spec for the Captain FAQ suggestion review dialog.
 *
 * Covers loading the suggestion's source conversations (skeletons,
 * empty list, an error with retry, an empty response), editing the
 * question and answer with validation, saving, approving and
 * dismissing (success and error alerts, with and without a server
 * message), opening a source conversation, and closing.
 */
import { ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import CaptainFaqSuggestionsAPI from 'dashboard/api/captain/faqSuggestions';
import FaqSuggestionReviewDialog from '../FaqSuggestionReviewDialog.vue';

const uiFlags = ref({});
const dispatch = vi.fn();
const push = vi.fn();
const close = vi.fn();

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch }),
  useMapGetter: () => uiFlags,
}));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => ({ push }),
}));
vi.mock('shared/composables/useExactTimestamp', () => ({
  useExactTimestamp: () => time => `exact-${time}`,
}));
vi.mock('dashboard/api/captain/faqSuggestions', () => ({
  default: { show: vi.fn() },
}));

const Dialog = {
  name: 'Dialog',
  emits: ['close'],
  setup: () => ({ close }),
  template: '<div><slot /><footer><slot name="footer" /></footer></div>',
};
const Button = {
  name: 'Button',
  props: ['label', 'icon', 'disabled', 'isLoading'],
  emits: ['click'],
  template:
    '<button :data-icon="icon" :data-label="label" @click="$emit(\'click\')" />',
};
const Field = name => ({
  name,
  props: ['modelValue', 'label'],
  emits: ['update:modelValue'],
  template: `<div class="${name}" />`,
});
const Input = Field('Input');
const TextArea = Field('TextArea');

const suggestion = {
  id: 4,
  question: 'How to pay?',
  answer: 'With a card.',
  source_count: 8,
  language: 'pt_BR',
  assistant: { name: 'Sky' },
};

const mountDialog = (props = {}) =>
  mount(FaqSuggestionReviewDialog, {
    props: { suggestion: { ...suggestion, ...props } },
    global: {
      stubs: { Dialog, Button, Input, TextArea, Icon: true },
      directives: { tooltip: {} },
    },
  });

const button = (wrapper, label) =>
  wrapper.findAllComponents(Button).find(b => b.props('label') === label);
const SAVE = 'CAPTAIN.FAQ_SUGGESTIONS.SAVE';
const APPROVE = 'CAPTAIN.FAQ_SUGGESTIONS.APPROVE_FAQ';
const DISMISS = 'CAPTAIN.FAQ_SUGGESTIONS.DISMISS';

describe('FaqSuggestionReviewDialog behaviour', () => {
  beforeEach(() => {
    uiFlags.value = {};
    dispatch.mockResolvedValue({ question: 'Saved' });
  });

  it('shows skeletons while loading, then the sources', async () => {
    let resolve;
    CaptainFaqSuggestionsAPI.show.mockReturnValue(
      new Promise(done => {
        resolve = done;
      })
    );
    const wrapper = mountDialog();
    await wrapper.vm.$nextTick();
    expect(CaptainFaqSuggestionsAPI.show).toHaveBeenCalledWith(4, {
      signal: expect.any(AbortSignal),
    });
    expect(wrapper.findAll('.animate-pulse')).toHaveLength(6);
    expect(button(wrapper, SAVE).props('disabled')).toBe(true);
    expect(wrapper.text()).toContain('PT-BR');
    expect(wrapper.text()).toContain('Sky');

    resolve({
      data: {
        observations: [
          {
            id: 1,
            conversation: { display_id: 77 },
            generated_question: 'Pay how?',
            created_at: 1700000000,
          },
        ],
      },
    });
    await flushPromises();
    const source = wrapper.find('button.text-start');
    expect(source.text()).toContain('Pay how?');
    expect(button(wrapper, SAVE).props('disabled')).toBeFalsy();

    await source.trigger('click');
    expect(close).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith({
      name: 'inbox_conversation',
      params: { conversation_id: 77 },
    });
  });

  it('shows the empty state for a missing or empty response', async () => {
    CaptainFaqSuggestionsAPI.show.mockResolvedValue(undefined);
    let wrapper = mountDialog({ language: undefined, assistant: undefined });
    await flushPromises();
    expect(wrapper.text()).toContain(
      'CAPTAIN.FAQ_SUGGESTIONS.DETAILS.NO_SOURCES'
    );

    CaptainFaqSuggestionsAPI.show.mockResolvedValue({ data: {} });
    wrapper = mountDialog();
    await flushPromises();
    expect(wrapper.text()).toContain(
      'CAPTAIN.FAQ_SUGGESTIONS.DETAILS.NO_SOURCES'
    );
  });

  it('alerts on load errors and retries', async () => {
    CaptainFaqSuggestionsAPI.show.mockRejectedValueOnce(new Error('Gone'));
    const wrapper = mountDialog();
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('Gone');
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);

    CaptainFaqSuggestionsAPI.show.mockRejectedValueOnce({});
    await button(wrapper, 'CAPTAIN.FAQ_SUGGESTIONS.DETAILS.RETRY').trigger(
      'click'
    );
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'CAPTAIN.FAQ_SUGGESTIONS.ERRORS.LOAD_DETAILS'
    );

    CaptainFaqSuggestionsAPI.show.mockResolvedValueOnce({ data: {} });
    await button(wrapper, 'CAPTAIN.FAQ_SUGGESTIONS.DETAILS.RETRY').trigger(
      'click'
    );
    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it('validates and saves edits', async () => {
    CaptainFaqSuggestionsAPI.show.mockResolvedValue({ data: {} });
    const wrapper = mountDialog();
    await flushPromises();
    await wrapper.findComponent(Input).vm.$emit('update:modelValue', '  ');
    expect(button(wrapper, SAVE).props('disabled')).toBe(true);
    expect(button(wrapper, APPROVE).props('disabled')).toBe(true);

    await wrapper.findComponent(Input).vm.$emit('update:modelValue', ' Q ');
    await wrapper.findComponent(TextArea).vm.$emit('update:modelValue', ' A ');
    await button(wrapper, SAVE).trigger('click');
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith('captainFaqSuggestions/update', {
      id: 4,
      question: 'Q',
      answer: 'A',
    });
    expect(useAlert).toHaveBeenCalledWith(
      'CAPTAIN.FAQ_SUGGESTIONS.SUCCESS.SAVED'
    );

    dispatch.mockRejectedValueOnce(new Error('Too long'));
    await button(wrapper, SAVE).trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('Too long');
    dispatch.mockRejectedValueOnce(null);
    await button(wrapper, SAVE).trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'CAPTAIN.FAQ_SUGGESTIONS.ERRORS.SAVE'
    );
  });

  it('approves the suggestion', async () => {
    CaptainFaqSuggestionsAPI.show.mockResolvedValue({ data: {} });
    const wrapper = mountDialog();
    await flushPromises();
    dispatch.mockRejectedValueOnce(new Error('Nope'));
    await button(wrapper, APPROVE).trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('Nope');
    dispatch.mockRejectedValueOnce({});
    await button(wrapper, APPROVE).trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'CAPTAIN.FAQ_SUGGESTIONS.ERRORS.APPROVE'
    );

    await button(wrapper, APPROVE).trigger('click');
    await flushPromises();
    expect(dispatch).toHaveBeenLastCalledWith('captainFaqSuggestions/approve', {
      id: 4,
      question: 'How to pay?',
      answer: 'With a card.',
    });
    expect(wrapper.emitted('resolved')[0]).toEqual([
      { id: 4, action: 'approved' },
    ]);
    expect(close).toHaveBeenCalled();
  });

  it('dismisses the suggestion', async () => {
    CaptainFaqSuggestionsAPI.show.mockResolvedValue({ data: {} });
    uiFlags.value = { deletingItem: true };
    const wrapper = mountDialog();
    await flushPromises();
    expect(button(wrapper, DISMISS).props('isLoading')).toBe(true);
    uiFlags.value = {};

    dispatch.mockRejectedValueOnce(new Error('Locked'));
    await button(wrapper, DISMISS).trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('Locked');
    dispatch.mockRejectedValueOnce(undefined);
    await button(wrapper, DISMISS).trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'CAPTAIN.FAQ_SUGGESTIONS.ERRORS.DISMISS'
    );

    await button(wrapper, DISMISS).trigger('click');
    await flushPromises();
    expect(dispatch).toHaveBeenLastCalledWith(
      'captainFaqSuggestions/dismiss',
      4
    );
    expect(wrapper.emitted('resolved')[0]).toEqual([
      { id: 4, action: 'dismissed' },
    ]);
  });

  it('closes from the x button and forwards close', async () => {
    CaptainFaqSuggestionsAPI.show.mockResolvedValue({ data: {} });
    const wrapper = mountDialog();
    expect(wrapper.vm.dialogRef).toBeTruthy();
    await wrapper.find('[data-icon="i-lucide-x"]').trigger('click');
    expect(close).toHaveBeenCalled();
    await wrapper.findComponent(Dialog).vm.$emit('close');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
