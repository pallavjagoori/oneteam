import {
  isAConversationRoute,
  isAInboxViewRoute,
} from 'dashboard/helper/routeHelpers';
import ReconnectService from 'dashboard/helper/ReconnectService';

vi.mock('shared/helpers/mitt', () => ({
  emitter: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
}));
vi.mock('dashboard/helper/routeHelpers', () => ({
  isAConversationRoute: vi.fn(),
  isAInboxViewRoute: vi.fn(),
}));

describe('ReconnectService (OneTeam)', () => {
  it('fetches nothing on other routes', async () => {
    const store = { dispatch: vi.fn(), getters: {} };
    const router = {
      currentRoute: { value: { name: 'settings', params: {} } },
    };
    const service = new ReconnectService(store, router);
    isAConversationRoute.mockReturnValue(false);
    isAInboxViewRoute.mockReturnValue(false);
    await service.handleRouteSpecificFetch();
    expect(store.dispatch).not.toHaveBeenCalled();
  });
});
