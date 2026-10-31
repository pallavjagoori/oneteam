/**
 * OneTeam behaviour spec for the public CSAT survey page.
 *
 * Covers loading a survey (logo, custom or default message, display
 * type, locale), load errors (API message and fallback), rating with
 * emoji or stars, sending feedback, blocking repeat ratings while saving
 * or after feedback, previously answered surveys, and save errors.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import { getSurveyDetails, updateSurvey } from 'survey/api/survey';
import Response from '../Response.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('survey/api/survey', () => ({
  getSurveyDetails: vi.fn(),
  updateSurvey: vi.fn(),
}));
vi.mock('shared/composables/useMessageFormatter', () => ({
  useMessageFormatter: () => ({ formatMessage: text => `<p>${text}</p>` }),
}));

const Rating = {
  name: 'Rating',
  props: ['selectedRating', 'isDisabled'],
  emits: ['selectRating'],
  template: '<div class="rating" />',
};
const StarRating = { ...Rating, name: 'StarRating' };
const Feedback = {
  name: 'Feedback',
  props: ['isUpdating', 'isButtonDisabled', 'selectedRating'],
  emits: ['sendFeedback'],
  template: '<div class="feedback" />',
};
const Banner = {
  name: 'Banner',
  props: ['showSuccess', 'showError', 'message'],
  template: '<div class="banner">{{ message }}</div>',
};

const details = data => ({
  data: { inbox_avatar_url: 'logo.png', inbox_name: 'Acme', ...data },
});

const mountPage = async (response = details({})) => {
  window.history.replaceState({}, '', '/survey/responses/abc-123');
  if (response instanceof Error) getSurveyDetails.mockRejectedValue(response);
  else getSurveyDetails.mockResolvedValue(response);
  env.i18n = { locale: '' };
  const wrapper = mount(Response, {
    global: {
      stubs: {
        Rating,
        StarRating,
        Feedback,
        Banner,
        Branding: true,
        Spinner: true,
      },
      directives: {
        dompurifyHtml: (el, binding) => {
          el.innerHTML = binding.value;
        },
      },
      mocks: {
        $t: (key, params) => (params ? `${key}:${params.inboxName}` : key),
        $i18n: env.i18n,
      },
    },
  });
  await flushPromises();
  return wrapper;
};
const rating = wrapper => wrapper.findComponent(Rating);

describe('Response behaviour', () => {
  it('shows a spinner while loading', async () => {
    getSurveyDetails.mockReturnValue(new Promise(() => {}));
    const wrapper = mount(Response, {
      global: {
        stubs: { Spinner: { template: '<i class="spin" />' } },
        mocks: { $t: k => k },
      },
    });
    await flushPromises();
    expect(wrapper.find('.spin').exists()).toBe(true);
  });

  it('loads an unanswered survey with the default message', async () => {
    const wrapper = await mountPage();
    expect(getSurveyDetails).toHaveBeenCalledWith({ uuid: 'abc-123' });
    expect(wrapper.find('img').attributes('src')).toBe('logo.png');
    expect(wrapper.find('.prose').html()).toContain(
      '<p>SURVEY.DESCRIPTION:Acme</p>'
    );
    expect(wrapper.text()).toContain('SURVEY.RATING.LABEL');
    expect(wrapper.find('.banner').exists()).toBe(false);
    expect(rating(wrapper).props()).toEqual({
      selectedRating: undefined,
      isDisabled: false,
    });
    expect(wrapper.findComponent(StarRating).exists()).toBe(false);
    expect(env.i18n.locale).toBe('en');
  });

  it('uses custom content, stars and the survey locale', async () => {
    const wrapper = await mountPage(
      details({
        inbox_avatar_url: '',
        content: 'Rate us',
        display_type: 'star',
        locale: 'fr',
      })
    );
    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.find('.prose').html()).toContain('<p>Rate us</p>');
    expect(wrapper.findComponent(StarRating).exists()).toBe(true);
    expect(rating(wrapper).exists()).toBe(false);
    expect(env.i18n.locale).toBe('fr');
  });

  it('shows load errors from the API or a fallback', async () => {
    const apiError = Object.assign(new Error('x'), {
      response: { data: { message: 'Survey expired' } },
    });
    const wrapper = await mountPage(apiError);
    expect(wrapper.findComponent(Banner).props()).toEqual({
      showSuccess: false,
      showError: true,
      message: 'Survey expired',
    });
    const fallback = await mountPage(new Error('down'));
    expect(fallback.find('.banner').text()).toBe('SURVEY.API.ERROR_MESSAGE');
  });

  it('rates, then sends feedback and locks the rating', async () => {
    updateSurvey.mockResolvedValue();
    const wrapper = await mountPage();
    rating(wrapper).vm.$emit('selectRating', 4);
    await flushPromises();
    expect(updateSurvey).toHaveBeenCalledWith({
      uuid: 'abc-123',
      data: {
        message: {
          submitted_values: {
            csat_survey_response: { rating: 4, feedback_message: '' },
          },
        },
      },
    });
    expect(wrapper.findComponent(Banner).props()).toMatchObject({
      showSuccess: true,
      message: 'SURVEY.RATING.SUCCESS_MESSAGE',
    });
    expect(wrapper.find('.prose').exists()).toBe(false);
    const feedback = wrapper.findComponent(Feedback);
    expect(feedback.props()).toEqual({
      isUpdating: false,
      isButtonDisabled: false,
      selectedRating: 4,
    });

    feedback.vm.$emit('sendFeedback', 'Great help');
    await flushPromises();
    expect(updateSurvey.mock.calls[1][0].data.message.submitted_values).toEqual(
      {
        csat_survey_response: { rating: 4, feedback_message: 'Great help' },
      }
    );
    expect(wrapper.findComponent(Feedback).exists()).toBe(false);
    expect(rating(wrapper).props('isDisabled')).toBe(true);
    rating(wrapper).vm.$emit('selectRating', 1);
    expect(updateSurvey).toHaveBeenCalledTimes(2);
  });

  it('ignores ratings while saving and disables feedback meanwhile', async () => {
    let finish;
    updateSurvey.mockReturnValue(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    const wrapper = await mountPage(
      details({ csat_survey_response: { rating: 3 } })
    );
    expect(wrapper.findComponent(Feedback).props('isButtonDisabled')).toBe(
      false
    );
    rating(wrapper).vm.$emit('selectRating', 5);
    rating(wrapper).vm.$emit('selectRating', 2);
    await flushPromises();
    expect(updateSurvey).toHaveBeenCalledTimes(1);
    expect(wrapper.findComponent(Feedback).props('isButtonDisabled')).toBe(
      true
    );
    finish();
    await flushPromises();
    wrapper.vm.selectedRating = null;
    await flushPromises();
    expect(wrapper.findComponent(Feedback).props('isButtonDisabled')).toBe(
      true
    );
  });

  it('treats a survey with feedback as finished', async () => {
    const wrapper = await mountPage(
      details({
        csat_survey_response: { rating: 5, feedback_message: 'Thanks' },
      })
    );
    expect(wrapper.findComponent(Feedback).exists()).toBe(false);
    expect(rating(wrapper).props()).toEqual({
      selectedRating: 5,
      isDisabled: true,
    });
  });

  it('alerts when saving fails, with the API error or a fallback', async () => {
    const wrapper = await mountPage();
    updateSurvey.mockRejectedValueOnce({
      response: { data: { error: 'Closed' } },
    });
    rating(wrapper).vm.$emit('selectRating', 4);
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('Closed');
    expect(wrapper.find('.banner').text()).toBe('Closed');
    updateSurvey.mockRejectedValueOnce(new Error('down'));
    rating(wrapper).vm.$emit('selectRating', 2);
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('SURVEY.API.ERROR_MESSAGE');
  });
});
