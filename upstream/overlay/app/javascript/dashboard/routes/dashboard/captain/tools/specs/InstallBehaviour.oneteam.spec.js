/**
 * OneTeam behaviour spec for the Captain tool install link.
 *
 * Covers sending the user to the last active assistant's tools (or the
 * first assistant) with the install source, to assistant creation when
 * there are none, the load error, and staying put when the page was left
 * while loading.
 */
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import Install from '../Install.vue';

const replace = vi.fn();
const dispatch = vi.fn();
const assistants = ref([]);
const settings = ref({});

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { accountId: 1 }, query: { source: 'zapier' } }),
  useRouter: () => ({ replace }),
}));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch }),
  useMapGetter: () => assistants,
}));
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({ uiSettings: settings }),
}));

const mountInstall = async () => {
  const wrapper = mount(Install, {
    global: { stubs: { Spinner: { template: '<b class="spinner" />' } } },
  });
  await flushPromises();
  return wrapper;
};
const target = assistantId => ({
  name: 'captain_tools_index',
  params: { accountId: 1, assistantId },
  query: { install: 'zapier' },
});

describe('Captain tools Install behaviour', () => {
  beforeEach(() => {
    dispatch.mockResolvedValue();
    assistants.value = [{ id: 4 }, { id: 9 }];
  });

  it('opens the last active or first assistant', async () => {
    settings.value = { last_active_assistant_id: '9' };
    const wrapper = await mountInstall();
    expect(wrapper.find('.spinner').exists()).toBe(true);
    expect(dispatch).toHaveBeenCalledWith('captainAssistants/get');
    expect(replace).toHaveBeenLastCalledWith(target(9));

    settings.value = { last_active_assistant_id: '77' };
    await mountInstall();
    expect(replace).toHaveBeenLastCalledWith(target(4));
    settings.value = null;
    await mountInstall();
    expect(replace).toHaveBeenLastCalledWith(target(4));
  });

  it('creates an assistant when there are none', async () => {
    assistants.value = [];
    await mountInstall();
    expect(replace).toHaveBeenLastCalledWith({
      name: 'captain_assistants_create_index',
      params: { accountId: 1 },
    });
  });

  it('shows the load error and respects leaving early', async () => {
    dispatch.mockRejectedValueOnce(new Error('x'));
    const failed = await mountInstall();
    expect(failed.text()).toBe('CAPTAIN.CUSTOM_TOOLS.INSTALL_LINK.LOAD_ERROR');
    expect(replace).not.toHaveBeenCalled();

    let resolve;
    dispatch.mockReturnValueOnce(
      new Promise(done => {
        resolve = done;
      })
    );
    const left = mount(Install, { global: { stubs: { Spinner: true } } });
    left.unmount();
    resolve();
    await flushPromises();
    expect(replace).not.toHaveBeenCalled();
  });
});
