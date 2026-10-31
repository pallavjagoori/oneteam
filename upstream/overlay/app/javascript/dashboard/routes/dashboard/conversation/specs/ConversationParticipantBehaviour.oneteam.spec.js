/**
 * OneTeam behaviour spec for the conversation participants panel.
 *
 * Covers loading watchers on mount and on conversation change, the
 * participant counts and "+N more" thumbnails, watching the conversation
 * yourself, adding and removing participants from the dropdown, the
 * success and error alerts, and opening and closing the dropdown.
 */
import { reactive, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import ConversationParticipant from '../ConversationParticipant.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/useAgentsList', () => ({
  useAgentsList: () => ({ agentsList: env.agents }),
}));

const agent = id => ({ id, name: `Agent ${id}` });

const NextButton = {
  name: 'NextButton',
  props: ['label', 'icon'],
  template: '<button :data-icon="icon">{{ label }}</button>',
};
const Dropdown = {
  name: 'MultiselectDropdownItems',
  props: ['options', 'selectedItems'],
  emits: ['select'],
  template: '<ul />',
};
const Thumbs = {
  name: 'ThumbnailGroup',
  props: ['moreThumbnailsText', 'showMoreThumbnailsCount', 'usersList'],
  template: '<div class="thumbs" />',
};

const mountPanel = (watchers = []) => {
  env.watchers = ref(watchers);
  const getters = reactive({
    'conversationWatchers/getUIFlags': { isFetching: true },
    getCurrentUser: agent(1),
    'conversationWatchers/getByConversationId': () => env.watchers.value,
  });
  env.store = { getters, dispatch: vi.fn() };
  return mount(ConversationParticipant, {
    props: { conversationId: 7 },
    global: {
      stubs: {
        NextButton,
        MultiselectDropdownItems: Dropdown,
        ThumbnailGroup: Thumbs,
        Spinner: true,
      },
      mocks: {
        $store: env.store,
        $t: (key, args) => (args ? `${key}:${args.count}` : key),
      },
      directives: {
        tooltip: {},
        onClickaway: {
          mounted: (el, binding) => {
            env.outside = binding.value;
          },
        },
      },
    },
  });
};

const setWatchers = async (wrapper, list) => {
  env.watchers.value = list;
  // Re-create the getter function so the computed sees a new value.
  env.store.getters['conversationWatchers/getByConversationId'] = () => list;
  await flushPromises();
};

describe('ConversationParticipant behaviour', () => {
  beforeEach(() => {
    env.agents = ref([agent(1), agent(2), agent(3)]);
  });

  it('loads watchers and shows the empty state', async () => {
    const wrapper = mountPanel();
    expect(env.store.dispatch).toHaveBeenCalledWith(
      'conversationWatchers/show',
      { conversationId: 7 }
    );
    expect(env.store.dispatch).toHaveBeenCalledWith('agents/get');
    expect(wrapper.text()).toContain(
      'CONVERSATION_PARTICIPANTS.NO_PARTICIPANTS_TEXT'
    );
    await wrapper.setProps({ conversationId: 8 });
    expect(env.store.dispatch).toHaveBeenCalledWith(
      'conversationWatchers/show',
      { conversationId: 8 }
    );
  });

  it('shows counts and thumbnails as watchers change', async () => {
    const wrapper = mountPanel();
    const thumbs = () => wrapper.findComponent(Thumbs);
    await setWatchers(wrapper, [agent(2)]);
    expect(wrapper.find('.total-watchers').text()).toBe(
      'CONVERSATION_PARTICIPANTS.TOTAL_PARTICIPANT_TEXT:1'
    );
    expect(thumbs().props('showMoreThumbnailsCount')).toBe(false);
    expect(thumbs().props('moreThumbnailsText')).toBe(
      'CONVERSATION_PARTICIPANTS.REMANING_PARTICIPANT_TEXT:1'
    );

    await setWatchers(wrapper, [2, 3, 4, 5, 6].map(agent));
    expect(wrapper.find('.total-watchers').text()).toBe(
      'CONVERSATION_PARTICIPANTS.TOTAL_PARTICIPANTS_TEXT:5'
    );
    expect(thumbs().props('usersList')).toHaveLength(4);
    expect(thumbs().props('showMoreThumbnailsCount')).toBe(true);
    expect(thumbs().props('moreThumbnailsText')).toBe(
      'CONVERSATION_PARTICIPANTS.REMANING_PARTICIPANT_TEXT:1'
    );

    expect(wrapper.find('spinner-stub').exists()).toBe(true);
    env.store.getters['conversationWatchers/getUIFlags'] = {
      isFetching: false,
    };
    await setWatchers(wrapper, [2, 3, 4, 5, 6, 7].map(agent));
    expect(wrapper.find('spinner-stub').exists()).toBe(false);
    expect(thumbs().props('moreThumbnailsText')).toBe(
      'CONVERSATION_PARTICIPANTS.REMANING_PARTICIPANTS_TEXT:2'
    );

    await setWatchers(wrapper, undefined);
    expect(wrapper.text()).toContain(
      'CONVERSATION_PARTICIPANTS.NO_PARTICIPANTS_TEXT'
    );
  });

  it('lets the user watch the conversation', async () => {
    const wrapper = mountPanel();
    await setWatchers(wrapper, [agent(2)]);
    await wrapper
      .findAll('button')
      .find(b => b.text() === 'CONVERSATION_PARTICIPANTS.WATCH_CONVERSATION')
      .trigger('click');
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenCalledWith(
      'conversationWatchers/update',
      { conversationId: 7, userIds: [2, 1] }
    );
    expect(useAlert).toHaveBeenCalledWith(
      'CONVERSATION_PARTICIPANTS.API.SUCCESS_MESSAGE'
    );
    expect(wrapper.text()).toContain(
      'CONVERSATION_PARTICIPANTS.YOU_ARE_WATCHING'
    );
  });

  it('adds and removes participants and reports errors', async () => {
    const wrapper = mountPanel();
    const dropdown = wrapper.findComponent(Dropdown);
    expect(dropdown.props('options')).toHaveLength(3);
    await dropdown.vm.$emit('select', agent(3));
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenCalledWith(
      'conversationWatchers/update',
      { conversationId: 7, userIds: [3] }
    );

    env.store.dispatch.mockImplementation(action =>
      action === 'conversationWatchers/update'
        ? Promise.reject(new Error('Nope'))
        : undefined
    );
    await dropdown.vm.$emit('select', agent(3));
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenCalledWith(
      'conversationWatchers/update',
      { conversationId: 7, userIds: [] }
    );
    expect(useAlert).toHaveBeenLastCalledWith('Nope');

    env.store.dispatch.mockImplementation(action =>
      action === 'conversationWatchers/update'
        ? Promise.reject(new Error(''))
        : undefined
    );
    await dropdown.vm.$emit('select', agent(2));
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'CONVERSATION_PARTICIPANTS.API.ERROR_MESSAGE'
    );
  });

  it('opens and closes the dropdown', async () => {
    const wrapper = mountPanel();
    const panel = () => wrapper.find('.shadow-lg');
    expect(panel().classes()).toContain('hidden');
    await wrapper.find('[data-icon="i-lucide-settings"]').trigger('click');
    expect(panel().classes()).toContain('visible');
    await wrapper.find('[data-icon="i-lucide-x"]').trigger('click');
    expect(panel().classes()).toContain('hidden');
    await wrapper.find('[data-icon="i-lucide-settings"]').trigger('click');
    env.outside();
    await flushPromises();
    expect(panel().classes()).toContain('hidden');
  });
});
