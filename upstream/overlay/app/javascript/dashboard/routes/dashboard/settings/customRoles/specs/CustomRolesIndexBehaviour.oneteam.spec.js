/**
 * OneTeam behaviour spec for the custom roles settings page.
 *
 * Covers loading roles (ignoring load errors), the paywall when the
 * feature is off, the count, searching, opening the add and edit
 * dialogs, and deleting a role (success, error and fallback messages).
 * Also pins a Chatwoot bug: confirming a delete writes the loading flag
 * onto the ref itself instead of its value, so no spinner is shown.
 */
import { computed, reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import CustomRolesIndex from '../Index.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => env.store,
  useMapGetter: name => computed(() => env.getters[name]),
}));

const Layout = {
  name: 'SettingsLayout',
  props: ['isLoading', 'noRecordsFound'],
  template: '<div><slot name="header" /><slot name="body" /><slot /></div>',
};
const Header = {
  name: 'BaseSettingsHeader',
  props: ['searchQuery'],
  emits: ['update:searchQuery'],
  template: '<header><slot name="count" /><slot name="actions" /></header>',
};
const Table = {
  name: 'BaseTable',
  props: ['headers', 'items', 'noDataMessage'],
  template: '<table><slot name="row" :items="items" /></table>',
};
const Body = {
  name: 'CustomRoleTableBody',
  props: ['roles', 'loading'],
  emits: ['edit', 'delete'],
  template: '<tbody />',
};
const Paywall = {
  name: 'CustomRolePaywall',
  template: '<div class="paywall" />',
};
const NextButton = {
  name: 'Button',
  props: ['label', 'disabled'],
  template: '<button>{{ label }}</button>',
};
const Modal = {
  name: 'WootModal',
  props: ['show', 'onClose'],
  template: '<div v-if="show"><slot /></div>',
};
const DeleteModal = {
  name: 'WootDeleteModal',
  props: [
    'show',
    'onClose',
    'onConfirm',
    'messageValue',
    'confirmText',
    'rejectText',
  ],
  template: '<div />',
};
const RoleModal = {
  name: 'CustomRoleModal',
  props: ['mode', 'selectedRole'],
  emits: ['close'],
  template: '<div class="role-modal" />',
};

const roles = [
  { id: 1, name: 'Auditor', description: 'Reads reports' },
  { id: 2, name: 'Triage', description: 'Assigns conversations' },
];

const mountPage = ({
  records = roles,
  enabled = true,
  failLoad = false,
} = {}) => {
  env.store = {
    dispatch: failLoad
      ? vi.fn().mockRejectedValue(new Error('down'))
      : vi.fn().mockResolvedValue(),
  };
  env.getters = reactive({
    'customRole/getCustomRoles': records,
    'customRole/getUIFlags': { fetchingList: false },
    'accounts/isFeatureEnabledonAccount': (id, flag) =>
      id === 1 && flag === 'custom_roles' && enabled,
    getCurrentAccountId: 1,
  });
  return mount(CustomRolesIndex, {
    global: {
      stubs: {
        SettingsLayout: Layout,
        BaseSettingsHeader: Header,
        BaseTable: Table,
        CustomRoleTableBody: Body,
        CustomRolePaywall: Paywall,
        Button: NextButton,
        WootModal: Modal,
        WootDeleteModal: DeleteModal,
        CustomRoleModal: RoleModal,
      },
      mocks: { $t: key => key },
    },
  });
};

describe('Custom roles index behaviour', () => {
  it('loads roles and lists them with a count', async () => {
    const wrapper = mountPage();
    expect(env.store.dispatch).toHaveBeenCalledWith('customRole/getCustomRole');
    expect(wrapper.findComponent(Body).props('roles')).toEqual(roles);
    expect(wrapper.text()).toContain('CUSTOM_ROLE.COUNT');
    expect(wrapper.findComponent(Table).props('noDataMessage')).toBe(
      'CUSTOM_ROLE.LIST.404'
    );
    expect(wrapper.findComponent(Layout).props('noRecordsFound')).toBe(false);
  });

  it('ignores load errors and shows the empty state', async () => {
    const wrapper = mountPage({ records: [], failLoad: true });
    await flushPromises();
    expect(wrapper.findComponent(Layout).props('noRecordsFound')).toBe(true);
    expect(wrapper.text()).not.toContain('CUSTOM_ROLE.COUNT');
  });

  it('shows the paywall and blocks adding when the feature is off', async () => {
    const wrapper = mountPage({ records: [], enabled: false });
    expect(wrapper.find('.paywall').exists()).toBe(true);
    expect(wrapper.findComponent(Layout).props('noRecordsFound')).toBe(false);
    expect(wrapper.findComponent(NextButton).props('disabled')).toBe(true);
    await wrapper.findComponent(NextButton).vm.$emit('click');
    expect(wrapper.find('.role-modal').exists()).toBe(false);
  });

  it('searches roles', async () => {
    const wrapper = mountPage();
    await wrapper
      .findComponent(Header)
      .vm.$emit('update:searchQuery', 'Triage');
    expect(
      wrapper
        .findComponent(Body)
        .props('roles')
        .map(r => r.id)
    ).toEqual([2]);
    expect(wrapper.findComponent(Table).props('noDataMessage')).toBe(
      'CUSTOM_ROLE.NO_RESULTS'
    );
    await wrapper.findComponent(Header).vm.$emit('update:searchQuery', ' ');
    expect(wrapper.findComponent(Body).props('roles')).toHaveLength(2);
  });

  it('opens the add and edit dialogs', async () => {
    const wrapper = mountPage();
    await wrapper.find('header button').trigger('click');
    expect(wrapper.findComponent(RoleModal).props()).toEqual({
      mode: 'add',
      selectedRole: null,
    });
    await wrapper.findComponent(RoleModal).vm.$emit('close');
    expect(wrapper.find('.role-modal').exists()).toBe(false);

    await wrapper.findComponent(Body).vm.$emit('edit', roles[0]);
    expect(wrapper.findComponent(RoleModal).props()).toEqual({
      mode: 'edit',
      selectedRole: roles[0],
    });
    wrapper.findComponent(Modal).props('onClose')();
    await flushPromises();
    expect(wrapper.find('.role-modal').exists()).toBe(false);
  });

  it('deletes a role and reports the result', async () => {
    const wrapper = mountPage();
    const modal = () => wrapper.findComponent(DeleteModal);
    await wrapper.findComponent(Body).vm.$emit('delete', roles[0]);
    expect(modal().props()).toMatchObject({
      show: true,
      messageValue: ' Auditor ? ',
      confirmText: 'CUSTOM_ROLE.DELETE.CONFIRM.YES Auditor',
      rejectText: 'CUSTOM_ROLE.DELETE.CONFIRM.NO Auditor',
    });
    modal().props('onClose')();
    await flushPromises();
    expect(modal().props('show')).toBe(false);

    await wrapper.findComponent(Body).vm.$emit('delete', roles[0]);
    modal().props('onConfirm')();
    expect(wrapper.findComponent(Body).props('loading')).toEqual({});
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenCalledWith(
      'customRole/deleteCustomRole',
      1
    );
    expect(useAlert).toHaveBeenLastCalledWith(
      'CUSTOM_ROLE.DELETE.API.SUCCESS_MESSAGE'
    );
    expect(wrapper.findComponent(Body).props('loading')).toEqual({ 1: false });

    await wrapper.findComponent(Body).vm.$emit('delete', roles[1]);
    env.store.dispatch.mockRejectedValueOnce(new Error('In use'));
    modal().props('onConfirm')();
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('In use');
    await wrapper.findComponent(Body).vm.$emit('delete', roles[1]);
    env.store.dispatch.mockRejectedValueOnce({});
    modal().props('onConfirm')();
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'CUSTOM_ROLE.DELETE.API.ERROR_MESSAGE'
    );
  });
});
