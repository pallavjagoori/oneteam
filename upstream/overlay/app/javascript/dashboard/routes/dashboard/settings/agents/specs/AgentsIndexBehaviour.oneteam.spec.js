/**
 * OneTeam behaviour spec for the agents settings page.
 *
 * Covers loading agents and custom roles, the list (role names, custom
 * role permissions, verification state), search, which agents can be
 * edited or deleted (not yourself, not the last verified admin), and
 * the add, edit and delete flows with their alerts.
 */
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import AgentsIndex from '../Index.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({
  useAlert: (...args) => env.alert(...args),
}));
vi.mock('dashboard/composables/store', () => ({
  useStoreGetters: () => env.getters,
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
  useMapGetter: () => env.customRoles,
}));

const Button = {
  name: 'Button',
  props: ['label', 'icon', 'isLoading'],
  emits: ['click'],
  template:
    '<button :data-icon="icon" @click="$emit(\'click\')">{{ label }}</button>',
};
const WootModal = {
  name: 'WootModal',
  props: ['show', 'onClose'],
  emits: ['update:show'],
  template: '<div v-if="show" class="modal"><slot /></div>',
};
const WootDeleteModal = {
  name: 'WootDeleteModal',
  props: [
    'show',
    'onClose',
    'onConfirm',
    'messageValue',
    'confirmText',
    'rejectText',
  ],
  emits: ['update:show'],
  template: '<div class="delete-modal" />',
};

const agents = () => [
  {
    id: 1,
    name: 'Me',
    email: 'me@x.test',
    role: 'administrator',
    confirmed: true,
  },
  {
    id: 2,
    name: 'Ann',
    email: 'ann@x.test',
    role: 'agent',
    confirmed: true,
    custom_role_id: 7,
  },
  {
    id: 3,
    name: 'Bo',
    email: 'bo@x.test',
    role: 'administrator',
    confirmed: false,
    custom_role_id: 99,
  },
];

const mountPage = async () => {
  const wrapper = mount(AgentsIndex, {
    global: {
      stubs: {
        SettingsLayout: {
          props: ['isLoading', 'noRecordsFound'],
          template:
            '<div><slot name="header" /><slot name="body" /><slot /></div>',
        },
        BaseSettingsHeader: {
          name: 'BaseSettingsHeader',
          props: ['searchQuery'],
          emits: ['update:searchQuery'],
          template:
            '<header><slot name="count" /><slot name="actions" /></header>',
        },
        Button,
        Avatar: true,
        WootModal,
        WootDeleteModal,
        AddAgent: {
          name: 'AddAgent',
          emits: ['close'],
          template: '<div class="add" />',
        },
        EditAgent: {
          name: 'EditAgent',
          props: ['id', 'name', 'type', 'customRoleId'],
          emits: ['close'],
          template: '<div class="edit" />',
        },
      },
      directives: { tooltip: {} },
    },
  });
  await flushPromises();
  return wrapper;
};

const rows = wrapper => wrapper.findAll('.py-4');
const rowButton = (wrapper, index, icon) =>
  rows(wrapper)
    [index].findAllComponents(Button)
    .find(b => b.props('icon') === icon);
const search = (wrapper, query) =>
  wrapper
    .findComponent({ name: 'BaseSettingsHeader' })
    .vm.$emit('update:searchQuery', query);
const deleteModal = wrapper => wrapper.findComponent(WootDeleteModal);

describe('Agents settings page behaviour', () => {
  beforeEach(() => {
    env.alert = vi.fn();
    env.dispatch = vi.fn(() => Promise.resolve());
    env.getters = {
      'agents/getAgents': ref(agents()),
      'agents/getUIFlags': ref({ isFetching: false }),
      getCurrentUserID: ref(1),
    };
    env.customRoles = ref([
      { id: 7, name: 'Support', permissions: ['conversation_manage'] },
    ]);
  });

  it('loads agents and roles and lists them', async () => {
    const wrapper = await mountPage();
    expect(env.dispatch).toHaveBeenCalledWith('agents/get');
    expect(env.dispatch).toHaveBeenCalledWith('customRole/getCustomRole');
    expect(wrapper.text()).toContain('AGENT_MGMT.COUNT');
    expect(rows(wrapper)).toHaveLength(3);
    expect(rows(wrapper)[0].text()).toContain(
      'AGENT_MGMT.AGENT_TYPES.ADMINISTRATOR'
    );
    expect(rows(wrapper)[0].text()).toContain('AGENT_MGMT.LIST.VERIFIED');
    expect(rows(wrapper)[1].text()).toContain('Support');
    expect(rows(wrapper)[1].text()).toContain(
      'CUSTOM_ROLE.PERMISSIONS.CONVERSATION_MANAGE'
    );
    // A custom role that no longer exists shows no name or permissions.
    expect(rows(wrapper)[2].text()).not.toContain('AGENT_TYPES');
    expect(rows(wrapper)[2].findAll('li')).toHaveLength(0);
    expect(rows(wrapper)[2].text()).toContain(
      'AGENT_MGMT.LIST.VERIFICATION_PENDING'
    );
  });

  it('hides edit and delete for yourself and the last verified admin', async () => {
    const wrapper = await mountPage();
    expect(rowButton(wrapper, 0, 'i-woot-edit-pen')).toBeUndefined();
    expect(rowButton(wrapper, 0, 'i-woot-bin')).toBeUndefined();
    expect(rowButton(wrapper, 1, 'i-woot-bin')).toBeDefined();
    // An unconfirmed admin can always be deleted.
    expect(rowButton(wrapper, 2, 'i-woot-bin')).toBeDefined();

    env.getters.getCurrentUserID.value = 2;
    await flushPromises();
    expect(rowButton(wrapper, 0, 'i-woot-bin')).toBeUndefined();

    env.getters['agents/getAgents'].value = [
      ...agents(),
      {
        id: 4,
        name: 'Cy',
        email: 'cy@x.test',
        role: 'administrator',
        confirmed: true,
      },
    ];
    await flushPromises();
    expect(rowButton(wrapper, 0, 'i-woot-bin')).toBeDefined();
  });

  it('searches agents by name or email', async () => {
    const wrapper = await mountPage();
    search(wrapper, 'ann');
    await flushPromises();
    expect(rows(wrapper)).toHaveLength(1);
    search(wrapper, 'zzz');
    await flushPromises();
    expect(wrapper.text()).toContain('AGENT_MGMT.NO_RESULTS');
    search(wrapper, '  ');
    await flushPromises();
    expect(rows(wrapper)).toHaveLength(3);
  });

  it('shows no count without agents', async () => {
    env.getters['agents/getAgents'].value = [];
    const wrapper = await mountPage();
    expect(wrapper.text()).not.toContain('AGENT_MGMT.COUNT');
  });

  it('opens and closes the add and edit modals', async () => {
    const wrapper = await mountPage();
    await wrapper.find('header button').trigger('click');
    expect(wrapper.find('.add').exists()).toBe(true);
    wrapper.findComponent({ name: 'AddAgent' }).vm.$emit('close');
    await flushPromises();
    expect(wrapper.find('.add').exists()).toBe(false);

    await rowButton(wrapper, 1, 'i-woot-edit-pen').trigger('click');
    expect(wrapper.findComponent({ name: 'EditAgent' }).props()).toMatchObject({
      id: 2,
      name: 'Ann',
      type: 'agent',
      customRoleId: 7,
    });
    wrapper.findComponent({ name: 'EditAgent' }).vm.$emit('close');
    await flushPromises();
    expect(wrapper.find('.edit').exists()).toBe(false);

    // The modals' own close handlers and v-models.
    const [add, edit] = wrapper.findAllComponents(WootModal);
    add.vm.$emit('update:show', true);
    await flushPromises();
    add.props('onClose')();
    edit.vm.$emit('update:show', true);
    await flushPromises();
    edit.props('onClose')();
    await flushPromises();
    expect(wrapper.find('.modal').exists()).toBe(false);
  });

  it('deletes an agent after confirmation', async () => {
    const wrapper = await mountPage();
    await rowButton(wrapper, 1, 'i-woot-bin').trigger('click');
    expect(deleteModal(wrapper).props()).toMatchObject({
      show: true,
      messageValue: ' Ann?',
      confirmText: 'AGENT_MGMT.DELETE.CONFIRM.YES Ann',
      rejectText: 'AGENT_MGMT.DELETE.CONFIRM.NO Ann',
    });
    let finish;
    env.dispatch = vi.fn(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    deleteModal(wrapper).props('onConfirm')();
    await flushPromises();
    expect(deleteModal(wrapper).props('show')).toBe(false);
    expect(rowButton(wrapper, 1, 'i-woot-bin').props('isLoading')).toBe(true);
    expect(env.dispatch).toHaveBeenCalledWith('agents/delete', 2);
    finish();
    await flushPromises();
    expect(env.alert).toHaveBeenCalledWith(
      'AGENT_MGMT.DELETE.API.SUCCESS_MESSAGE'
    );
    expect(rowButton(wrapper, 1, 'i-woot-bin').props('isLoading')).toBe(false);
  });

  it('alerts when deleting fails and can cancel', async () => {
    const wrapper = await mountPage();
    await rowButton(wrapper, 2, 'i-woot-bin').trigger('click');
    deleteModal(wrapper).props('onClose')();
    await flushPromises();
    expect(deleteModal(wrapper).props('show')).toBe(false);
    deleteModal(wrapper).vm.$emit('update:show', true);
    await flushPromises();
    expect(deleteModal(wrapper).props('show')).toBe(true);
    env.dispatch = vi.fn(() => Promise.reject(new Error('x')));
    deleteModal(wrapper).props('onConfirm')();
    await flushPromises();
    expect(env.alert).toHaveBeenCalledWith(
      'AGENT_MGMT.DELETE.API.ERROR_MESSAGE'
    );
  });
});
