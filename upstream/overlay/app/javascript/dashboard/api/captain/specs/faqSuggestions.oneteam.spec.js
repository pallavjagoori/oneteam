import faqSuggestionsAPI from '../faqSuggestions';
import { useAxiosMock } from '../../specs/oneteamAxiosMock';

describe('CaptainFaqSuggestions API (OneTeam)', () => {
  const axios = useAxiosMock();
  const url = '/api/v1/accounts/1/captain/faq_suggestions';

  it('shows a suggestion, with or without a signal', () => {
    const signal = new AbortController().signal;
    faqSuggestionsAPI.show(3, { signal });
    expect(axios.get).toHaveBeenCalledWith(`${url}/3`, { signal });
    faqSuggestionsAPI.show(3);
    expect(axios.get).toHaveBeenLastCalledWith(`${url}/3`, {
      signal: undefined,
    });
  });

  it('lists open suggestions on page 1 by default', () => {
    faqSuggestionsAPI.get();
    expect(axios.get).toHaveBeenCalledWith(url, {
      params: {
        page: 1,
        search: undefined,
        assistant_id: undefined,
        status: 'open',
      },
      signal: undefined,
    });
  });

  it('updates, approves and dismisses a suggestion', () => {
    faqSuggestionsAPI.update(3, { answer: 'a' });
    expect(axios.patch).toHaveBeenCalledWith(`${url}/3`, {
      faq_suggestion: { answer: 'a' },
    });
    faqSuggestionsAPI.approve(3, { answer: 'a' });
    expect(axios.post).toHaveBeenCalledWith(`${url}/3/approve`, {
      faq_suggestion: { answer: 'a' },
    });
    faqSuggestionsAPI.dismiss(3);
    expect(axios.post).toHaveBeenCalledWith(`${url}/3/dismiss`);
  });
});
