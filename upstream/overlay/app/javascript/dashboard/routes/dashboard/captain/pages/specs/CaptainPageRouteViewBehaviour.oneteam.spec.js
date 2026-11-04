/**
 * OneTeam behaviour spec for the Captain CaptainPageRouteView.
 *
 * Covers remembering a newly selected assistant and skipping the
 * update when the id is missing or already stored.
 */
import { mount } from '@vue/test-utils';
import { reactive, ref, nextTick } from 'vue';
import CaptainPageRouteView from '../CaptainPageRouteView.vue';

const env = vi.hoisted(() => ({ route: null, update: vi.fn() }));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
}));
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({
    uiSettings: ref({ last_active_assistant_id: 3 }),
    updateUISettings: env.update,
  }),
}));

describe('CaptainPageRouteView behaviour', () => {
  it('stores a newly selected assistant only', async () => {
    env.route = reactive({ params: { assistantId: '3' } });
    mount(CaptainPageRouteView, {
      global: { stubs: { RouterView: true } },
    });
    env.route.params.assistantId = '';
    await nextTick();
    env.route.params.assistantId = '3';
    await nextTick();
    expect(env.update).not.toHaveBeenCalled();
    env.route.params.assistantId = '5';
    await nextTick();
    expect(env.update).toHaveBeenCalledWith({ last_active_assistant_id: 5 });
  });
});
