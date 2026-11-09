/**
 * OneTeam spec for the widget router.
 *
 * Covers lazy loading every route view and flagging route transitions
 * in the app config store around navigation.
 */
import router from '../router';
import store from '../store';

vi.mock('../store', () => ({ default: { dispatch: vi.fn() } }));
vi.mock('../components/layouts/ViewWithHeader.vue', () => ({
  default: { template: '<router-view />' },
}));
vi.mock('../views/UnreadMessages.vue', () => ({ default: { name: 'Unread' } }));
vi.mock('../views/Campaigns.vue', () => ({ default: { name: 'Campaigns' } }));
vi.mock('../views/Home.vue', () => ({ default: { name: 'Home' } }));
vi.mock('../views/PreChatForm.vue', () => ({ default: { name: 'PreChat' } }));
vi.mock('../views/Messages.vue', () => ({ default: { name: 'Messages' } }));
vi.mock('../views/ArticleViewer.vue', () => ({ default: { name: 'Article' } }));

describe('widget router', () => {
  it('loads each view and flags route transitions', async () => {
    const names = [
      'unread-messages',
      'campaigns',
      'home',
      'prechat-form',
      'messages',
      'article-viewer',
    ];
    const loaded = await names.reduce(async (previous, name) => {
      const list = await previous;
      await router.push({ name });
      const { matched } = router.currentRoute.value;
      return [...list, matched[matched.length - 1].components.default.name];
    }, Promise.resolve([]));
    expect(loaded).toEqual([
      'Unread',
      'Campaigns',
      'Home',
      'PreChat',
      'Messages',
      'Article',
    ]);
    expect(store.dispatch).toHaveBeenCalledWith(
      'appConfig/setRouteTransitionState',
      true
    );
    expect(store.dispatch).toHaveBeenCalledWith(
      'appConfig/setRouteTransitionState',
      false
    );
  });
});
