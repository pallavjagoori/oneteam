/**
 * OneTeam behaviour spec for the conversation sidebar macro list.
 *
 * Covers fetching macros, the empty and loading states, executing a
 * macro, opening the resolve attributes modal for pending attributes,
 * and the drag state.
 */
import { mount } from '@vue/test-utils';
import { computed, ref } from 'vue';
import List from '../List.vue';

const env = vi.hoisted(() => ({
  dispatch: vi.fn(),
  macros: [],
  isFetching: false,
  execute: vi.fn(),
  open: vi.fn(),
}));

vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: env.dispatch }),
  useMapGetter: key =>
    computed(() =>
      key === 'macros/getMacros' ? env.macros : { isFetching: env.isFetching }
    ),
}));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({ accountScopedUrl: path => `/app/accounts/1/${path}` }),
}));
vi.mock('dashboard/composables/useOrderedMacros', () => ({
  useOrderedMacros: () => ({ orderedMacros: ref(env.macros) }),
}));
vi.mock('dashboard/composables/useMacroExecution', () => ({
  useMacroExecution: () => ({
    executingMacroId: ref(2),
    execute: env.execute,
    submitPendingAttributes: vi.fn(),
    dismissPendingAttributes: vi.fn(),
  }),
}));

const MacroItem = {
  name: 'MacroItem',
  props: ['macro', 'isExecuting'],
  emits: ['execute'],
  template: '<div class="macro" />',
};

/**
 * Mounts the list.
 *
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountList = () =>
  mount(List, {
    props: { conversationId: 7 },
    global: {
      mocks: { $t: key => key },
      stubs: {
        RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
        NextButton: true,
        Spinner: true,
        MacroItem,
        Draggable: {
          name: 'Draggable',
          props: ['modelValue'],
          emits: ['start', 'end'],
          template:
            '<div><template v-for="el in modelValue" :key="el.id"><slot name="item" :element="el" /></template></div>',
        },
        ConversationResolveAttributesModal: {
          methods: { open: (...args) => env.open(...args) },
          template: '<div />',
        },
      },
    },
  });

describe('Conversation macro list behaviour', () => {
  beforeEach(() => {
    env.macros = [];
    env.isFetching = false;
  });

  it('fetches macros and shows the empty state', () => {
    const wrapper = mountList();
    expect(env.dispatch).toHaveBeenCalledWith('macros/get');
    expect(wrapper.find('a').attributes('href')).toBe(
      '/app/accounts/1/settings/macros'
    );
    expect(wrapper.text()).toContain('MACROS.LIST.404');
  });

  it('shows the loading state', () => {
    env.isFetching = true;
    const wrapper = mountList();
    expect(wrapper.text()).toContain('MACROS.LOADING');
    expect(wrapper.find('a').exists()).toBe(false);
  });

  it('executes macros and opens the modal for pending attributes', async () => {
    env.macros = [
      { id: 1, name: 'One' },
      { id: 2, name: 'Two' },
    ];
    const wrapper = mountList();
    const items = wrapper.findAllComponents(MacroItem);
    expect(items.map(item => item.props('isExecuting'))).toEqual([false, true]);
    env.execute.mockReturnValueOnce(null);
    items[0].vm.$emit('execute');
    expect(env.execute).toHaveBeenCalledWith(env.macros[0], 7);
    expect(env.open).not.toHaveBeenCalled();
    env.execute.mockReturnValueOnce({
      missing: ['priority'],
      customAttributes: { plan: 'pro' },
    });
    items[1].vm.$emit('execute');
    expect(env.open).toHaveBeenCalledWith(['priority'], { plan: 'pro' });
    const draggable = wrapper.findComponent({ name: 'Draggable' });
    draggable.vm.$emit('start');
    draggable.vm.$emit('end');
    expect(wrapper.vm.$.setupState.dragging).toBe(false);
  });
});
