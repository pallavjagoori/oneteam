/**
 * OneTeam behaviour spec for the CSAT survey bubble in the widget.
 *
 * Covers the title (custom message, default and submitted), emoji and
 * star ratings submitting straight away, sending written feedback with
 * the button and Enter, locking ratings while saving or once feedback
 * was sent, restoring a submitted response, ignoring update errors and
 * the widget colour styling.
 */
import { nextTick } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import CustomerSatisfaction from '../CustomerSatisfaction.vue';

vi.mock('shared/composables/useMessageFormatter', () => ({
  useMessageFormatter: () => ({ formatMessage: text => `<p>${text}</p>` }),
}));

const StarRating = {
  name: 'StarRating',
  props: ['selectedRating', 'isDisabled'],
  emits: ['selectRating'],
  template: '<div class="stars" />',
};

const mountSurvey = (props = {}, dispatch = vi.fn().mockResolvedValue()) => {
  const store = createStore({
    getters: { 'appConfig/getWidgetColor': () => '#000000' },
  });
  store.dispatch = dispatch;
  const wrapper = mount(CustomerSatisfaction, {
    props: { messageId: 5, ...props },
    global: {
      plugins: [store],
      stubs: { StarRating, Spinner: true, FluentIcon: true },
      directives: {
        dompurifyHtml: (el, binding) => {
          el.innerHTML = binding.value;
        },
      },
      mocks: { $t: key => key },
    },
  });
  return { wrapper, dispatch };
};

const payload = (rating, feedback) => ({
  submittedValues: {
    csat_survey_response: { rating, feedback_message: feedback },
  },
  messageId: 5,
});

describe('CustomerSatisfaction behaviour', () => {
  it('shows the custom or default title and colours the button', () => {
    let { wrapper } = mountSurvey({ message: 'Rate us' });
    expect(wrapper.find('h6').html()).toContain('<p>Rate us</p>');
    const submit = wrapper.find('form button');
    expect(submit.attributes('style')).toContain('color: rgb(255, 255, 255)');
    expect(submit.attributes('disabled')).toBeDefined();

    ({ wrapper } = mountSurvey());
    expect(wrapper.find('h6').text()).toBe('CSAT.TITLE');
  });

  it('submits an emoji rating and then feedback', async () => {
    let resolve;
    const dispatch = vi.fn(
      () =>
        new Promise(done => {
          resolve = done;
        })
    );
    const { wrapper } = mountSurvey({}, dispatch);
    const emojis = wrapper.findAll('.emoji-button');
    expect(emojis).toHaveLength(5);
    await emojis[2].trigger('click');
    expect(dispatch).toHaveBeenCalledWith('message/update', payload(3, ''));
    expect(emojis[2].classes()).toContain('selected');
    expect(emojis[0].classes()).toContain('disabled');

    await emojis[0].trigger('click');
    expect(dispatch).toHaveBeenCalledTimes(1);
    resolve();
    await flushPromises();
    expect(emojis[0].classes()).not.toContain('disabled');

    await wrapper.find('input').setValue('Great');
    expect(wrapper.find('form button').attributes('disabled')).toBeUndefined();
    await wrapper.find('form').trigger('submit');
    expect(dispatch).toHaveBeenLastCalledWith(
      'message/update',
      payload(3, 'Great')
    );
    expect(wrapper.findComponent({ name: 'Spinner' }).exists()).toBe(true);
    expect(wrapper.find('form button').attributes('disabled')).toBeDefined();

    await wrapper.find('input').trigger('keydown.enter');
    expect(dispatch).toHaveBeenCalledTimes(2);
    resolve();
    await flushPromises();
  });

  it('submits star ratings and ignores update errors', async () => {
    const dispatch = vi.fn().mockRejectedValue(new Error('down'));
    const { wrapper } = mountSurvey({ displayType: 'star' }, dispatch);
    expect(wrapper.find('.ratings').exists()).toBe(false);
    const stars = wrapper.findComponent(StarRating);
    await stars.vm.$emit('selectRating', 4);
    expect(stars.props('isDisabled')).toBe(true);
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith('message/update', payload(4, ''));
    expect(stars.props('selectedRating')).toBe(4);
    expect(stars.props('isDisabled')).toBe(false);
  });

  it('shows neither ratings nor stars for an unknown display type', () => {
    const { wrapper } = mountSurvey({ displayType: 'other' });
    expect(wrapper.find('.ratings').exists()).toBe(false);
    expect(wrapper.findComponent(StarRating).exists()).toBe(false);
  });

  it('restores a submitted response and locks the ratings', async () => {
    const attrs = {
      csat_survey_response: { rating: 2, feedback_message: 'Meh' },
    };
    const { wrapper, dispatch } = mountSurvey({
      messageContentAttributes: attrs,
    });
    await nextTick();
    expect(wrapper.find('h6').text()).toBe('CSAT.SUBMITTED_TITLE');
    expect(wrapper.find('form').exists()).toBe(false);
    const emojis = wrapper.findAll('.emoji-button');
    expect(emojis[1].classes()).toContain('selected');
    expect(emojis[1].classes()).toContain('hover');
    await emojis[3].trigger('click');
    expect(dispatch).not.toHaveBeenCalled();

    const star = mountSurvey({
      messageContentAttributes: attrs,
      displayType: 'star',
    });
    await star.wrapper.findComponent(StarRating).vm.$emit('selectRating', 5);
    expect(star.dispatch).not.toHaveBeenCalled();
  });

  it('keeps the form after a rating without feedback', async () => {
    const { wrapper } = mountSurvey({
      messageContentAttributes: { csat_survey_response: { rating: 1 } },
    });
    await nextTick();
    expect(wrapper.find('form').exists()).toBe(true);
    expect(wrapper.find('input').element.value).toBe('');
  });
});
