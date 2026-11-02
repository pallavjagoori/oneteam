/**
 * OneTeam behaviour spec for the Captain assistant switcher.
 *
 * Covers the empty state, listing assistants with a check on the active
 * one, ignoring a click on the active assistant, prefetching the data
 * each Captain page needs before switching (and falling back to the
 * overview route), and the "new assistant" button.
 */
import { ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import AssistantSwitcher from '../AssistantSwitcher.vue';

const assistants = ref([]);
const dispatch = vi.fn();
const push = vi.fn();
const route = { name: null, params: {} };

vi.mock('dashboard/composables/store.js', () => ({
  useStore: () => ({ dispatch }),
  useMapGetter: () => assistants,
}));
vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({ push }),
}));

const Button = {
  name: 'Button',
  props: ['label', 'icon'],
  emits: ['click'],
  template:
    '<button class="btn" :data-icon="icon" @click="$emit(\'click\')">{{ label }}<slot /></button>',
};

const mountSwitcher = () =>
  mount(AssistantSwitcher, {
    global: { stubs: { Button, Avatar: true } },
  });

const assistantButtons = wrapper => wrapper.findAll('.btn').slice(1);

describe('AssistantSwitcher behaviour', () => {
  beforeEach(() => {
    assistants.value = [
      { id: 1, name: 'Sky' },
      { id: 2, name: '' },
    ];
    route.name = 'captain_assistants_documents_index';
    route.params = { accountId: 4, assistantId: '1' };
    dispatch.mockResolvedValue();
    push.mockResolvedValue();
  });

  it('shows the empty state', () => {
    assistants.value = [];
    const wrapper = mountSwitcher();
    expect(wrapper.text()).toContain('CAPTAIN.ASSISTANT_SWITCHER.EMPTY_LIST');
    expect(assistantButtons(wrapper)).toHaveLength(0);
  });

  it('marks the active assistant and ignores clicks on it', async () => {
    const wrapper = mountSwitcher();
    const buttons = assistantButtons(wrapper);
    expect(buttons[0].attributes('data-icon')).toBe('i-lucide-check');
    expect(buttons[1].attributes('data-icon')).toBe('');
    await buttons[0].trigger('click');
    await flushPromises();
    expect(dispatch).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it.each([
    [
      'captain_assistants_documents_index',
      'captainDocuments/get',
      { assistantId: 2 },
    ],
    [
      'captain_assistants_scenarios_index',
      'captainScenarios/get',
      { assistantId: 2 },
    ],
    [
      'captain_assistants_inboxes_index',
      'captainInboxes/get',
      { assistantId: 2 },
    ],
    ['captain_assistants_settings_index', 'captainAssistants/show', 2],
  ])('prefetches %s data before switching', async (name, action, payload) => {
    route.name = name;
    const wrapper = mountSwitcher();
    await assistantButtons(wrapper)[1].trigger('click');
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(action, payload);
    expect(push).toHaveBeenCalledWith({
      name,
      params: { accountId: 4, assistantId: 2 },
    });
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('switches without prefetching on other routes', async () => {
    route.name = 'captain_assistants_playground_index';
    let wrapper = mountSwitcher();
    await assistantButtons(wrapper)[1].trigger('click');
    await flushPromises();
    expect(dispatch).not.toHaveBeenCalled();

    route.name = undefined;
    wrapper = mountSwitcher();
    await assistantButtons(wrapper)[1].trigger('click');
    await flushPromises();
    expect(dispatch).not.toHaveBeenCalled();
    expect(push).toHaveBeenLastCalledWith({
      name: 'captain_assistants_overview_index',
      params: { accountId: 4, assistantId: 2 },
    });
  });

  it('opens the create dialog', async () => {
    const wrapper = mountSwitcher();
    await wrapper.findAll('.btn')[0].trigger('click');
    expect(wrapper.emitted('createAssistant')).toHaveLength(1);
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
