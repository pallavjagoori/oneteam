/**
 * OneTeam behaviour spec for the Captain FAQ suggestions page.
 *
 * Covers loading from the URL (page and search) and again when the
 * assistant changes, aborted and failed loads, the queue header and
 * empty state, searching and clearing the search, paging, approving
 * and dismissing (refreshing the same or previous page, errors),
 * reviewing a suggestion in the dialog, and resetting the loading flag
 * on unmount.
 */
import { computed, reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import CaptainFaqSuggestionsAPI from 'dashboard/api/captain/faqSuggestions';
import FaqSuggestions from '../FaqSuggestions.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
  useRouter: () => env.router,
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('@chatwoot/utils', async importOriginal => ({
  ...(await importOriginal()),
  debounce: fn => fn,
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => env.store,
  useMapGetter: name => computed(() => env.state[name]),
}));
vi.mock('dashboard/composables/useAbortableRequest', () => ({
  useAbortableRequest: () => ({
    run: fn => env.run(fn),
    abort: () => env.abort(),
  }),
}));
vi.mock('dashboard/api/captain/faqSuggestions', () => ({
  default: { get: vi.fn() },
}));

const Layout = {
  name: 'PageLayout',
  props: [
    'totalCount',
    'currentPage',
    'isFetching',
    'isEmpty',
    'showPaginationFooter',
    'backUrl',
  ],
  emits: ['update:currentPage'],
  template:
    '<div><slot name="search" /><slot name="subHeader" /><slot name="emptyState" /><slot name="paywall" /><slot name="body" /><slot /></div>',
};
const SearchInput = {
  name: 'Input',
  props: ['modelValue'],
  emits: ['update:modelValue', 'input'],
  template: '<input />',
};
const Card = {
  name: 'FaqSuggestionCard',
  props: ['suggestion', 'isLoading'],
  emits: ['approve', 'dismiss', 'review'],
  template: '<div class="card" />',
};
const Review = {
  name: 'FaqSuggestionReviewDialog',
  props: ['suggestion'],
  emits: ['close', 'resolved'],
  data: () => ({ dialogRef: { open: () => env.reviewOpen() } }),
  template: '<div class="review" />',
};
const NextButton = {
  name: 'Button',
  props: ['label'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};
const Empty = {
  name: 'EmptyStateLayout',
  template: '<div><slot name="actions" /></div>',
};

const records = [
  { id: 1, question: 'Q1', answer: 'A1' },
  { id: 2, question: 'Q2', answer: 'A2' },
];

const mountPage = async ({
  query = {},
  list = records,
  meta = { page: 2, totalCount: 12 },
} = {}) => {
  env.route = reactive({ params: { accountId: 1, assistantId: '3' }, query });
  env.router = { replace: vi.fn() };
  env.state = reactive({
    'captainFaqSuggestions/getRecords': list,
    'captainFaqSuggestions/getMeta': meta,
    'captainFaqSuggestions/getUIFlags': {
      fetchingList: false,
      updatingItem: false,
      deletingItem: false,
    },
  });
  env.store = { dispatch: vi.fn().mockResolvedValue() };
  env.run = vi.fn(fn => fn('signal'));
  env.abort = vi.fn();
  env.reviewOpen = vi.fn();
  CaptainFaqSuggestionsAPI.get.mockResolvedValue({
    data: { payload: records, meta: { page: 1 } },
  });
  const wrapper = mount(FaqSuggestions, {
    global: {
      stubs: {
        PageLayout: Layout,
        Input: SearchInput,
        FaqSuggestionCard: Card,
        FaqSuggestionReviewDialog: Review,
        Button: NextButton,
        EmptyStateLayout: Empty,
        CaptainPaywall: true,
      },
      mocks: { $t: key => key },
    },
  });
  await flushPromises();
  return wrapper;
};

const lastGet = () => CaptainFaqSuggestionsAPI.get.mock.calls.at(-1)[0];
const dispatched = name =>
  env.store.dispatch.mock.calls.filter(([n]) => n === name).map(([, p]) => p);

describe('Captain FAQ suggestions behaviour', () => {
  it('loads suggestions from the URL', async () => {
    const wrapper = await mountPage({ query: { page: '2', search: 'refund' } });
    expect(env.router.replace).toHaveBeenCalledWith({
      query: { page: 2, search: 'refund' },
    });
    expect(lastGet()).toEqual({
      page: 2,
      search: 'refund',
      assistantId: 3,
      signal: 'signal',
    });
    expect(dispatched('captainFaqSuggestions/setRecords').at(-1)).toEqual({
      records,
      meta: { page: 1 },
    });
    expect(dispatched('captainFaqSuggestions/setFetchingList')).toEqual([
      true,
      false,
    ]);
    expect(wrapper.findComponent(Layout).props()).toMatchObject({
      totalCount: 12,
      isEmpty: false,
      showPaginationFooter: true,
      backUrl: {
        name: 'captain_assistants_responses_index',
        params: { accountId: 1, assistantId: 3 },
      },
    });
    expect(wrapper.text()).toContain('CAPTAIN.FAQ_SUGGESTIONS.QUEUE_COUNT');
    expect(wrapper.find('button').text()).toBe(
      'CAPTAIN.FAQ_SUGGESTIONS.EMPTY_STATE.CLEAR_SEARCH'
    );
  });

  it('ignores aborted loads and reports failures', async () => {
    const wrapper = await mountPage();
    env.run.mockResolvedValueOnce(undefined);
    wrapper.findComponent(Layout).vm.$emit('update:currentPage', 3);
    await flushPromises();
    expect(dispatched('captainFaqSuggestions/setFetchingList').at(-1)).toBe(
      true
    );
    env.run.mockRejectedValueOnce(new Error('Timeout'));
    wrapper.findComponent(Layout).vm.$emit('update:currentPage', 3);
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('Timeout');
    env.run.mockRejectedValueOnce({});
    wrapper.findComponent(Layout).vm.$emit('update:currentPage', 0);
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'CAPTAIN.FAQ_SUGGESTIONS.ERRORS.LOAD'
    );
    expect(env.router.replace).toHaveBeenLastCalledWith({ query: { page: 1 } });
  });

  it('searches and clears the search from the empty state', async () => {
    const wrapper = await mountPage({ list: [] });
    expect(wrapper.text()).not.toContain('QUEUE_COUNT');
    const input = wrapper.findComponent(SearchInput);
    await input.vm.$emit('update:modelValue', 'ship');
    input.vm.$emit('input');
    await flushPromises();
    expect(env.abort).toHaveBeenCalled();
    expect(lastGet()).toMatchObject({ page: 1, search: 'ship' });
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(lastGet()).toMatchObject({ page: 1, search: '' });
    expect(wrapper.find('button').exists()).toBe(false);
  });

  it('approves a suggestion and refreshes the same page', async () => {
    const wrapper = await mountPage();
    let finish;
    env.store.dispatch.mockImplementation(name =>
      name === 'captainFaqSuggestions/approve'
        ? new Promise(resolve => {
            finish = resolve;
          })
        : Promise.resolve()
    );
    env.state['captainFaqSuggestions/getUIFlags'] = { updatingItem: true };
    wrapper.findAllComponents(Card)[0].vm.$emit('approve', records[0]);
    await flushPromises();
    expect(
      wrapper.findAllComponents(Card).map(c => c.props('isLoading'))
    ).toEqual([true, false]);
    finish();
    await flushPromises();
    expect(dispatched('captainFaqSuggestions/approve')).toEqual([
      { id: 1, question: 'Q1', answer: 'A1' },
    ]);
    expect(useAlert).toHaveBeenLastCalledWith(
      'CAPTAIN.FAQ_SUGGESTIONS.SUCCESS.APPROVED'
    );
    expect(lastGet().page).toBe(2);
    expect(wrapper.findAllComponents(Card)[0].props('isLoading')).toBe(false);
  });

  it('refreshes the previous page after emptying the current one', async () => {
    const wrapper = await mountPage();
    env.store.dispatch.mockImplementation(name => {
      if (name === 'captainFaqSuggestions/dismiss')
        env.state['captainFaqSuggestions/getRecords'] = [];
      return Promise.resolve();
    });
    wrapper.findAllComponents(Card)[1].vm.$emit('dismiss', records[1]);
    await flushPromises();
    expect(dispatched('captainFaqSuggestions/dismiss')).toEqual([2]);
    expect(useAlert).toHaveBeenLastCalledWith(
      'CAPTAIN.FAQ_SUGGESTIONS.SUCCESS.DISMISSED'
    );
    expect(lastGet().page).toBe(1);
  });

  it('stays on page one and reports action errors', async () => {
    const wrapper = await mountPage({ meta: {} });
    env.store.dispatch.mockImplementation(name => {
      if (name === 'captainFaqSuggestions/approve')
        return Promise.reject(new Error('Duplicate'));
      if (name === 'captainFaqSuggestions/dismiss')
        return Promise.reject(new Error(''));
      return Promise.resolve();
    });
    wrapper.findAllComponents(Card)[0].vm.$emit('approve', records[0]);
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('Duplicate');
    wrapper.findAllComponents(Card)[0].vm.$emit('dismiss', records[0]);
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'CAPTAIN.FAQ_SUGGESTIONS.ERRORS.DISMISS'
    );
    env.store.dispatch.mockImplementation(name => {
      if (name === 'captainFaqSuggestions/approve')
        return Promise.reject(new Error(''));
      if (name === 'captainFaqSuggestions/dismiss')
        return Promise.reject(new Error('Gone'));
      return Promise.resolve();
    });
    wrapper.findAllComponents(Card)[0].vm.$emit('approve', records[0]);
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'CAPTAIN.FAQ_SUGGESTIONS.ERRORS.APPROVE'
    );
    wrapper.findAllComponents(Card)[0].vm.$emit('dismiss', records[0]);
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('Gone');

    env.store.dispatch.mockImplementation(name => {
      if (name === 'captainFaqSuggestions/dismiss')
        env.state['captainFaqSuggestions/getRecords'] = [];
      return Promise.resolve();
    });
    wrapper.findAllComponents(Card)[0].vm.$emit('dismiss', records[0]);
    await flushPromises();
    expect(lastGet().page).toBe(1);
  });

  it('reviews a suggestion in the dialog', async () => {
    const wrapper = await mountPage();
    wrapper.findAllComponents(Card)[1].vm.$emit('review', records[1]);
    await flushPromises();
    expect(env.reviewOpen).toHaveBeenCalled();
    expect(wrapper.findComponent(Review).props('suggestion')).toEqual(
      records[1]
    );
    CaptainFaqSuggestionsAPI.get.mockClear();
    wrapper.findComponent(Review).vm.$emit('resolved');
    await flushPromises();
    expect(CaptainFaqSuggestionsAPI.get).toHaveBeenCalled();
    await wrapper.findComponent(Review).vm.$emit('close');
    expect(wrapper.find('.review').exists()).toBe(false);
  });

  it('reloads for a new assistant and resets on unmount', async () => {
    const wrapper = await mountPage();
    env.route.params = { accountId: 1, assistantId: '4' };
    await flushPromises();
    expect(dispatched('captainFaqSuggestions/setRecords')).toContainEqual({
      records: [],
      meta: { page: 1, total_count: 0 },
    });
    expect(lastGet().assistantId).toBe(4);
    env.store.dispatch.mockClear();
    wrapper.unmount();
    expect(env.store.dispatch).toHaveBeenCalledWith(
      'captainFaqSuggestions/setFetchingList',
      false
    );
  });
});
