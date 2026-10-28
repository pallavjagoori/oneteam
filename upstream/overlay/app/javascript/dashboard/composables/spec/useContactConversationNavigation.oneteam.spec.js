import { useAlert } from 'dashboard/composables';
import { useContactConversationNavigation } from '../useContactConversationNavigation';

/*
 * OneTeam coverage for contact history navigation edge cases: a route with
 * no name, conversations created at the same moment (ordered by id), and a
 * failed contact filter.
 */
const ctx = vi.hoisted(() => ({
  dispatch: vi.fn(() => Promise.resolve()),
  route: {},
}));

vi.mock('dashboard/composables/store', async () => {
  const { ref: vueRef } = await import('vue');
  const chat = vueRef({
    id: 2,
    status: 'resolved',
    meta: { sender: { id: 9, name: 'Jane' } },
  });
  return {
    useStore: () => ({ dispatch: ctx.dispatch }),
    useMapGetter: getter =>
      ({
        getSelectedChat: chat,
        getAppliedContactFilter: vueRef({ id: 9 }),
        getConversationById: vueRef(() => ({ id: 2 })),
        getFilteredConversations: vueRef([]),
        'contactConversations/getConversationNeighbours': vueRef(() => [
          { id: 3, created_at: 10 },
          { id: 2, created_at: 10 },
          { id: 1, created_at: 5 },
        ]),
      })[getter],
  };
});
vi.mock('vue-router', () => ({
  useRoute: () => ctx.route,
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('../useConversationRoutePath', () => ({
  useConversationRoutePath: () => ({ buildConversationPath: id => `/c/${id}` }),
}));

describe('useContactConversationNavigation (OneTeam)', () => {
  it('orders same-time conversations by id on an unnamed route', () => {
    const nav = useContactConversationNavigation();
    expect(nav.olderConversation.value.id).toBe(1);
    expect(nav.newerConversation.value.id).toBe(3);
    expect(nav.isReadingHistory.value).toBe(true);
    expect(nav.hasHistory.value).toBe(true);
  });

  it('alerts when the contact filter fails', async () => {
    ctx.dispatch.mockImplementation(action =>
      action === 'applyConversationFilters'
        ? Promise.reject(new Error('5xx'))
        : Promise.resolve()
    );
    await useContactConversationNavigation().viewContactHistory({
      conversationId: 2,
    });
    expect(useAlert).toHaveBeenCalledWith('CHAT_LIST.FETCH_ERROR');
  });
});
