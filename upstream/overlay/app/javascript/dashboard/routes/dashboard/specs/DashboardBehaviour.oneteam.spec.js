/**
 * OneTeam behaviour spec for the dashboard shell around every page.
 *
 * Covers switching to the expanded conversation layout on small screens
 * and back to the agent's previous layout on wide ones, the mobile
 * sidebar, the account switcher and create-account modal, the keyboard
 * shortcuts modal, and showing the floating call widget during an
 * active or incoming call, and showing only the upgrade page with a
 * paywalled command bar when the account is paywalled.
 */
import { mount, flushPromises } from '@vue/test-utils';
import { ref } from 'vue';
import Dashboard from '../Dashboard.vue';

const width = ref(1200);
const uiSettings = ref({});
const updateUISettings = vi.fn();
const calls = { hasActiveCall: false, hasIncomingCall: false };

vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  useWindowSize: () => ({ width }),
}));
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({ uiSettings, updateUISettings }),
}));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({ accountId: ref(1) }),
}));
vi.mock('dashboard/stores/calls', () => ({ useCallsStore: () => calls }));
// The async children are mocked rather than stubbed so their loaders run.
vi.mock('../commands/commandbar.vue', () => ({
  __esModule: true,
  default: {
    name: 'CommandBar',
    props: { isPaywalled: Boolean },
    template: '<div class="command-bar" />',
  },
}));
vi.mock('dashboard/components-next/call/FloatingCallWidget.vue', () => ({
  __esModule: true,
  default: { template: '<div class="call" />' },
}));

const upgrade = { show: false };
const UpgradePage = {
  name: 'UpgradePage',
  data: () => ({
    shouldShowUpgradePage: upgrade.show,
    isAccountPaywalled: upgrade.show,
  }),
  template: '<div class="upgrade"><slot /></div>',
};

const NextSidebar = {
  name: 'NextSidebar',
  props: { isMobileSidebarOpen: Boolean },
  emits: [
    'toggleAccountModal',
    'openKeyShortcutModal',
    'closeKeyShortcutModal',
    'showCreateAccountModal',
    'closeMobileSidebar',
  ],
  template: '<nav />',
};
const Launcher = {
  name: 'MobileSidebarLauncher',
  props: { isMobileSidebarOpen: Boolean },
  emits: ['toggle'],
  template: '<button class="launcher" @click="$emit(\'toggle\')" />',
};
const AddAccountModal = {
  name: 'AddAccountModal',
  props: { show: Boolean },
  emits: ['closeAccountCreateModal'],
  template: '<div />',
};
const ShortcutModal = {
  name: 'WootKeyShortcutModal',
  props: { show: Boolean },
  emits: ['close', 'clickaway', 'update:show'],
  template: '<div />',
};

const mountDashboard = async () => {
  const wrapper = mount(Dashboard, {
    global: {
      mocks: { $route: { name: 'home' } },
      stubs: {
        NextSidebar,
        MobileSidebarLauncher: Launcher,
        AddAccountModal,
        WootKeyShortcutModal: ShortcutModal,
        UpgradePage,
        CopilotLauncher: true,
        CopilotContainer: true,
        RouterView: true,
      },
    },
  });
  await flushPromises();
  return wrapper;
};
const sidebar = wrapper => wrapper.findComponent(NextSidebar);

describe('Dashboard shell behaviour', () => {
  beforeEach(() => {
    width.value = 1200;
    window.innerWidth = 1200;
    uiSettings.value = {
      previously_used_conversation_display_type: 'condensed',
    };
    calls.hasActiveCall = false;
    calls.hasIncomingCall = false;
    upgrade.show = false;
    vi.clearAllMocks();
  });

  it('switches layouts between small and wide screens', async () => {
    await mountDashboard();
    expect(updateUISettings).toHaveBeenLastCalledWith({
      conversation_display_type: 'condensed',
    });
    window.innerWidth = 500;
    width.value = 500;
    await flushPromises();
    expect(updateUISettings).toHaveBeenLastCalledWith({
      conversation_display_type: 'expanded',
    });
  });

  it('opens and closes the mobile sidebar', async () => {
    const wrapper = await mountDashboard();
    const launchers = wrapper.findAllComponents(Launcher);
    await launchers[1].trigger('click');
    expect(sidebar(wrapper).props('isMobileSidebarOpen')).toBe(true);
    await launchers[0].trigger('click');
    expect(sidebar(wrapper).props('isMobileSidebarOpen')).toBe(false);
    await launchers[0].trigger('click');
    await sidebar(wrapper).vm.$emit('closeMobileSidebar');
    expect(sidebar(wrapper).props('isMobileSidebarOpen')).toBe(false);
  });

  it('opens the account switcher and the create account modal', async () => {
    const wrapper = await mountDashboard();
    await sidebar(wrapper).vm.$emit('toggleAccountModal');
    expect(wrapper.vm.showAccountModal).toBe(true);
    await sidebar(wrapper).vm.$emit('showCreateAccountModal');
    expect(wrapper.vm.showAccountModal).toBe(false);
    const modal = wrapper.findComponent(AddAccountModal);
    expect(modal.props('show')).toBe(true);
    await modal.vm.$emit('closeAccountCreateModal');
    expect(modal.props('show')).toBe(false);
  });

  it('opens and closes the keyboard shortcuts', async () => {
    const wrapper = await mountDashboard();
    const modal = wrapper.findComponent(ShortcutModal);
    await sidebar(wrapper).vm.$emit('openKeyShortcutModal');
    expect(modal.props('show')).toBe(true);
    await sidebar(wrapper).vm.$emit('closeKeyShortcutModal');
    expect(modal.props('show')).toBe(false);

    await sidebar(wrapper).vm.$emit('openKeyShortcutModal');
    await modal.vm.$emit('close');
    expect(modal.props('show')).toBe(false);
    await sidebar(wrapper).vm.$emit('openKeyShortcutModal');
    await modal.vm.$emit('clickaway');
    expect(modal.props('show')).toBe(false);
    await sidebar(wrapper).vm.$emit('openKeyShortcutModal');
    await modal.vm.$emit('update:show', false);
    expect(modal.props('show')).toBe(false);
  });

  it('shows the call widget during a call', async () => {
    expect((await mountDashboard()).find('.call').exists()).toBe(false);
    calls.hasActiveCall = true;
    expect((await mountDashboard()).find('.call').exists()).toBe(true);
    calls.hasActiveCall = false;
    calls.hasIncomingCall = true;
    expect((await mountDashboard()).find('.call').exists()).toBe(true);
  });

  it('shows only the upgrade page when the account is paywalled', async () => {
    const open = await mountDashboard();
    expect(open.findComponent(Launcher).exists()).toBe(true);
    expect(open.findAllComponents(Launcher)).toHaveLength(2);
    expect(
      open.findComponent({ name: 'CommandBar' }).props('isPaywalled')
    ).toBe(false);

    upgrade.show = true;
    const paywalled = await mountDashboard();
    expect(paywalled.findAllComponents(Launcher)).toHaveLength(1);
    expect(
      paywalled.findComponent({ name: 'CommandBar' }).props('isPaywalled')
    ).toBe(true);
  });
});
