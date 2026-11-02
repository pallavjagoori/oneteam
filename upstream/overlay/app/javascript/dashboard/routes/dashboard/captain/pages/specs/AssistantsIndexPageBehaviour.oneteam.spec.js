/**
 * OneTeam behaviour spec for the Captain assistants landing route.
 *
 * Covers loading assistants and redirecting to the last active
 * assistant, the first assistant, or the create page when there are
 * none, keeping a valid sub-page from the route and falling back to the
 * overview for unknown ones.
 */
import { ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import AssistantsIndexPage from '../AssistantsIndexPage.vue';

const replace = vi.fn();
const route = { params: {} };
const uiSettings = ref({});

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => route,
  useRouter: () => ({ replace }),
}));
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({ uiSettings }),
}));

const mountPage = async assistants => {
  const store = createStore({
    getters: { 'captainAssistants/getRecords': () => assistants },
  });
  store.dispatch = vi.fn().mockResolvedValue();
  const wrapper = mount(AssistantsIndexPage, {
    global: { plugins: [store], stubs: { Spinner: true } },
  });
  await flushPromises();
  return { wrapper, store };
};

describe('AssistantsIndexPage behaviour', () => {
  beforeEach(() => {
    route.params = { accountId: 3 };
    uiSettings.value = {};
  });

  it('goes to the create page when there are no assistants', async () => {
    uiSettings.value = null;
    const { store } = await mountPage([]);
    expect(store.dispatch).toHaveBeenCalledWith('captainAssistants/get');
    expect(replace).toHaveBeenCalledWith({
      name: 'captain_assistants_create_index',
      params: { accountId: 3 },
      replace: true,
    });
  });

  it('opens the last active assistant on the requested page', async () => {
    uiSettings.value = { last_active_assistant_id: '2' };
    route.params.navigationPath = 'captain_tools_index';
    await mountPage([{ id: 1 }, { id: 2 }]);
    expect(replace).toHaveBeenCalledWith({
      name: 'captain_tools_index',
      params: { accountId: 3, assistantId: '2' },
      replace: true,
    });
  });

  it('falls back to the first assistant and the overview', async () => {
    uiSettings.value = { last_active_assistant_id: 99 };
    route.params.navigationPath = 'somewhere_else';
    await mountPage([{ id: 1 }, { id: 2 }]);
    expect(replace).toHaveBeenCalledWith({
      name: 'captain_assistants_overview_index',
      params: { accountId: 3, assistantId: 1 },
      replace: true,
    });
  });
});
