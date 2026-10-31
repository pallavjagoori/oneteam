/**
 * OneTeam behaviour spec for the macro editor page.
 *
 * Covers starting a new macro (global for admins, personal otherwise),
 * loading an existing macro and mapping its params to dropdown values,
 * the loading state, provided action types, switching routes between edit
 * and create, saving (create and update, success and failure), and
 * read-only global macros for non-admins.
 */
import { computed, inject, reactive, ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import MacroEditor from '../MacroEditor.vue';

const env = vi.hoisted(() => ({
  route: null,
  push: null,
  dispatch: null,
  getters: {},
  isAdmin: null,
  provided: null,
}));

vi.mock('vue-router', () => ({
  useRoute: () => env.route,
  useRouter: () => ({ push: env.push }),
}));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({
    dispatch: env.dispatch,
    getters: { 'macros/getMacro': id => env.getters.macro(id) },
  }),
  useStoreGetters: () =>
    new Proxy({}, { get: (_, name) => computed(() => env.getters[name]) }),
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/useAdmin', () => ({
  useAdmin: () => ({ isAdmin: env.isAdmin }),
}));
vi.mock('dashboard/composables/useMacros', () => ({
  useMacros: () => ({
    getMacroDropdownValues: name =>
      name === 'assign_team'
        ? [
            { id: 1, name: 'Sales' },
            { id: 2, name: 'Support' },
          ]
        : [{ id: 'urgent', name: 'Urgent' }],
  }),
}));
vi.mock('dashboard/helper/actionQueryGenerator.js', () => ({
  default: actions => actions.map(action => ({ ...action, generated: true })),
}));

const MacroForm = {
  name: 'MacroForm',
  props: ['macroData', 'canManagePublicMacros', 'readOnly'],
  emits: ['update:macroData', 'submit'],
  setup() {
    env.provided = inject('macroActionTypes');
  },
  template: '<form class="macro-form" />',
};

const savedMacro = {
  id: 9,
  name: 'Escalate',
  visibility: 'global',
  actions: [
    { action_name: 'assign_team', action_params: [2] },
    { action_name: 'change_priority', action_params: ['urgent'] },
    { action_name: 'send_message', action_params: ['Hi'] },
    { action_name: 'resolve_conversation', action_params: [] },
  ],
};

const mountEditor = async () => {
  const wrapper = mount(MacroEditor, {
    global: {
      stubs: {
        MacroForm,
        'woot-loading-state': {
          props: ['message'],
          template: '<p class="loading">{{ message }}</p>',
        },
      },
    },
  });
  await flushPromises();
  return wrapper;
};
const form = wrapper => wrapper.findComponent(MacroForm);

describe('MacroEditor behaviour', () => {
  beforeEach(() => {
    env.route = reactive({ params: {} });
    env.push = vi.fn();
    env.dispatch = vi.fn();
    env.isAdmin = ref(true);
    env.getters = {
      'macros/getUIFlags': { isFetchingItem: false },
      macro: () => savedMacro,
    };
  });

  it('starts a global macro for admins and provides action types', async () => {
    const wrapper = await mountEditor();
    expect(env.dispatch.mock.calls.map(c => c[0])).toEqual([
      'agents/get',
      'teams/get',
      'labels/get',
    ]);
    expect(form(wrapper).props('macroData')).toEqual({
      name: '',
      actions: [{ action_name: 'assign_team', action_params: [] }],
      visibility: 'global',
    });
    expect(form(wrapper).props('canManagePublicMacros')).toBe(true);
    expect(env.provided.value[0]).toMatchObject({
      key: 'assign_team',
      label: 'MACROS.ACTIONS.ASSIGN_TEAM',
    });
    expect(env.provided.value[0].icon).toBeTruthy();
  });

  it('starts a personal macro for agents', async () => {
    env.isAdmin.value = false;
    const wrapper = await mountEditor();
    expect(form(wrapper).props('macroData').visibility).toBe('personal');
    expect(form(wrapper).props('readOnly')).toBe(false);
  });

  it('loads an existing macro and maps its params', async () => {
    env.route.params.macroId = '9';
    const wrapper = await mountEditor();
    expect(env.dispatch).toHaveBeenCalledWith('macros/getSingleMacro', '9');
    expect(form(wrapper).props('macroData').actions).toEqual([
      {
        action_name: 'assign_team',
        action_params: [{ id: 2, name: 'Support' }],
      },
      {
        action_name: 'change_priority',
        action_params: [{ id: 'urgent', name: 'Urgent' }],
      },
      { action_name: 'send_message', action_params: ['Hi'] },
      { action_name: 'resolve_conversation', action_params: [] },
    ]);
  });

  it('shows the loading state while fetching', async () => {
    env.getters['macros/getUIFlags'] = { isFetchingItem: true };
    const wrapper = await mountEditor();
    expect(wrapper.find('.loading').text()).toBe('MACROS.EDITOR.LOADING');
    expect(form(wrapper).exists()).toBe(false);
  });

  it('follows route changes and form updates', async () => {
    env.route.params.macroId = '9';
    const wrapper = await mountEditor();
    env.route.params = {};
    await flushPromises();
    expect(form(wrapper).props('macroData').name).toBe('');
    await form(wrapper).vm.$emit('update:macroData', {
      name: 'Changed',
      actions: [],
    });
    expect(form(wrapper).props('macroData').name).toBe('Changed');
  });

  it('creates and updates macros', async () => {
    const wrapper = await mountEditor();
    await form(wrapper).vm.$emit('submit', {
      name: 'New',
      actions: [{ action_name: 'resolve_conversation' }],
    });
    await flushPromises();
    expect(env.dispatch).toHaveBeenLastCalledWith('macros/create', {
      name: 'New',
      actions: [{ action_name: 'resolve_conversation', generated: true }],
    });
    expect(useAlert).toHaveBeenLastCalledWith('MACROS.ADD.API.SUCCESS_MESSAGE');
    expect(env.push).toHaveBeenCalledWith({ name: 'macros_wrapper' });

    env.route.params.macroId = '9';
    await flushPromises();
    await form(wrapper).vm.$emit('submit', { name: 'Edited', actions: [] });
    await flushPromises();
    expect(env.dispatch).toHaveBeenLastCalledWith('macros/update', {
      name: 'Edited',
      actions: [],
    });
    expect(useAlert).toHaveBeenLastCalledWith(
      'MACROS.EDIT.API.SUCCESS_MESSAGE'
    );
  });

  it('alerts when saving fails', async () => {
    const wrapper = await mountEditor();
    env.dispatch.mockRejectedValueOnce(new Error('nope'));
    await form(wrapper).vm.$emit('submit', { name: 'New', actions: [] });
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('MACROS.ERROR');
    expect(env.push).not.toHaveBeenCalled();
  });

  it('keeps global macros read-only for agents', async () => {
    env.isAdmin.value = false;
    env.route.params.macroId = '9';
    const wrapper = await mountEditor();
    expect(form(wrapper).props('readOnly')).toBe(true);
    env.dispatch.mockClear();
    await form(wrapper).vm.$emit('submit', savedMacro);
    await flushPromises();
    expect(env.dispatch).not.toHaveBeenCalled();
  });
});
