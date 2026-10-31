/**
 * OneTeam behaviour spec for the conversation monitors list page.
 *
 * Covers loading monitors (success, superseded and failed requests),
 * the templates section (empty account, tab switch, non-admin help),
 * opening the create form and template/condition prefills from the URL,
 * the list actions dialog (refresh vs stepping back a page after the
 * last delete), change notices, pagination with its page-change loader,
 * resetting when the account switches, and the automation permission.
 */
import { reactive, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import MonitorsAPI from 'dashboard/api/monitors';
import MonitorsIndex from '../MonitorsIndex.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
  useRouter: () => env.router,
}));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({
    accountId: env.accountId,
    currentAccount: env.currentAccount,
    accountScopedRoute: (name, params) => ({ name, params }),
    isCloudFeatureEnabled: flag => env.features.includes(flag),
  }),
}));
vi.mock('dashboard/composables/useAdmin', () => ({
  useAdmin: () => ({ isAdmin: env.isAdmin }),
}));
vi.mock('dashboard/composables/useAbortableRequest', async () => {
  const { ref: appRef } = await import('vue');
  return {
    useAbortableRequest: () => {
      const isPending = appRef(false);
      env.isPending = isPending;
      return {
        isPending,
        run: async runner => {
          isPending.value = true;
          try {
            return await runner('signal');
          } finally {
            isPending.value = false;
          }
        },
      };
    },
  };
});
vi.mock('dashboard/api/monitors', () => ({ default: { get: vi.fn() } }));
vi.mock('../useMonitorRefresh', () => ({
  useMonitorRefresh: refresh => {
    env.refresh = refresh;
  },
}));

const NextButton = {
  name: 'Button',
  props: ['label', 'icon'],
  template: '<button :data-icon="icon">{{ label }}</button>',
};
const Tabs = {
  name: 'TabBar',
  props: ['tabs', 'initialActiveTab'],
  emits: ['tabChanged'],
  template: '<nav />',
};
const Item = {
  name: 'MonitorListItem',
  props: ['monitor', 'showActions', 'canCreateAutomation'],
  emits: ['action'],
  template: '<div class="item" />',
};
const TemplateCard = {
  name: 'MonitorTemplateCard',
  props: ['template', 'canCreate'],
  emits: ['use'],
  template: '<div class="template" />',
};
const Footer = {
  name: 'PaginationFooter',
  props: ['currentPage', 'totalItems'],
  emits: ['update:currentPage'],
  template: '<div class="pager" />',
};
const ActionDialog = {
  name: 'MonitorActionDialog',
  emits: ['saved', 'changed'],
  methods: { open: (...args) => env.actionOpen(...args) },
  template: '<div />',
};
const Form = {
  name: 'MonitorForm',
  emits: ['created'],
  methods: { open: prefill => env.formOpen(prefill) },
  template: '<div />',
};

const monitorsPage = (count, total = count, page = 1, extra = {}) => ({
  data: {
    payload: Array.from({ length: count }, (_, i) => ({ id: i + 1 })),
    meta: { total_count: total, configured: true, page, ...extra },
  },
});

const mountPage = ({ query = {}, admin = true } = {}) => {
  env.route = reactive({ query });
  env.router = {
    push: vi.fn(),
    replace: vi.fn(({ query: next }) => {
      env.route.query = next;
    }),
  };
  env.isAdmin = ref(admin);
  return mount(MonitorsIndex, {
    global: {
      stubs: {
        Button: NextButton,
        TabBar: Tabs,
        MonitorListItem: Item,
        MonitorTemplateCard: TemplateCard,
        PaginationFooter: Footer,
        MonitorActionDialog: ActionDialog,
        MonitorForm: Form,
        MonitorUsageWarning: true,
        ReportHeader: { template: '<div><slot /></div>' },
        Spinner: true,
      },
    },
  });
};

describe('MonitorsIndex behaviour', () => {
  beforeEach(() => {
    env.accountId = ref(1);
    env.currentAccount = ref({ id: 1 });
    env.features = ['reports', 'conversation_monitors', 'automations'];
    env.actionOpen = vi.fn();
    env.formOpen = vi.fn();
    MonitorsAPI.get.mockReset();
    MonitorsAPI.get.mockResolvedValue(monitorsPage(2));
  });

  it('loads monitors with a spinner first', async () => {
    let finish;
    MonitorsAPI.get.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    const wrapper = mountPage();
    await flushPromises();
    expect(wrapper.find('spinner-stub').exists()).toBe(true);
    finish(monitorsPage(2));
    await flushPromises();
    expect(MonitorsAPI.get).toHaveBeenCalledWith({ page: 1 }, 'signal');
    expect(wrapper.findAllComponents(Item)).toHaveLength(2);
    expect(wrapper.findComponent(Tabs).props('tabs')[0].count).toBe(2);
    expect(wrapper.findComponent(Item).props()).toMatchObject({
      showActions: true,
      canCreateAutomation: true,
    });
    expect(wrapper.find('.pager').exists()).toBe(false);
  });

  it('keeps the list when a request is superseded and shows failures', async () => {
    const wrapper = mountPage();
    await flushPromises();
    MonitorsAPI.get.mockResolvedValueOnce(undefined);
    await env.refresh();
    await flushPromises();
    expect(wrapper.findAllComponents(Item)).toHaveLength(2);

    MonitorsAPI.get.mockRejectedValueOnce(new Error('down'));
    await env.refresh();
    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.findComponent(Tabs).props('tabs')[0].count).toBe(0);
    await wrapper
      .findAll('button')
      .find(b => b.text() === 'MONITORS.RETRY')
      .trigger('click');
    await flushPromises();
    expect(wrapper.findAllComponents(Item)).toHaveLength(2);
  });

  it('shows templates for empty accounts and on the templates tab', async () => {
    MonitorsAPI.get.mockResolvedValue({
      data: { payload: [], meta: { total_count: 0, configured: false } },
    });
    let wrapper = mountPage();
    await flushPromises();
    expect(wrapper.text()).toContain('MONITORS.TEMPLATES.TITLE');
    expect(wrapper.text()).toContain('MONITORS.ERRORS.NOT_CONFIGURED');
    expect(wrapper.findComponent(Tabs).exists()).toBe(false);
    await wrapper
      .findComponent(TemplateCard)
      .vm.$emit('use', wrapper.findComponent(TemplateCard).props('template'));
    await flushPromises();
    expect(env.formOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: 'shield-check-line',
        templateName: expect.any(String),
      })
    );

    MonitorsAPI.get.mockResolvedValue(monitorsPage(1));
    wrapper = mountPage({ admin: false });
    await flushPromises();
    await wrapper
      .findComponent(Tabs)
      .vm.$emit('tabChanged', { key: 'templates' });
    expect(wrapper.text()).toContain('MONITORS.TEMPLATES.ADMIN_HELP');
    expect(wrapper.text()).not.toContain('MONITORS.TEMPLATES.TITLE');
    expect(wrapper.findComponent(Tabs).props('initialActiveTab')).toBe(1);
    expect(wrapper.findComponent(TemplateCard).props('canCreate')).toBe(false);
    expect(wrapper.findComponent(Form).exists()).toBe(false);
  });

  it('opens the create form and goes to new monitors', async () => {
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.find('[data-icon="i-lucide-plus"]').trigger('click');
    await flushPromises();
    expect(env.formOpen).toHaveBeenCalledWith(undefined);
    await wrapper.findComponent(Form).vm.$emit('created', { id: 9 });
    expect(env.router.push).toHaveBeenCalledWith({
      name: 'monitor_reports_show',
      params: { monitorId: 9 },
    });
  });

  it('prefills the form from template and condition links', async () => {
    mountPage({ query: { template: 'login-problems', page: '1' } });
    await flushPromises();
    expect(env.formOpen).toHaveBeenCalledWith(
      expect.objectContaining({ icon: 'shield-check-line' })
    );
    expect(env.route.query).toEqual({ page: '1' });

    env.formOpen.mockClear();
    mountPage({
      query: { template: 'unknown', condition: 'Customer is angry' },
    });
    await flushPromises();
    expect(env.formOpen).toHaveBeenCalledWith({
      condition: 'Customer is angry',
    });

    env.formOpen.mockClear();
    const wrapper = mountPage({ query: { template: 'unknown' } });
    await flushPromises();
    expect(env.formOpen).not.toHaveBeenCalled();
    expect(env.router.replace).toHaveBeenCalled();
    expect(wrapper.findComponent(TemplateCard).exists()).toBe(true);

    mountPage({ query: { condition: ['a', 'b'] } });
    await flushPromises();
    expect(env.formOpen).not.toHaveBeenCalled();

    mountPage({ query: { template: 'login-problems' }, admin: false });
    await flushPromises();
    expect(env.formOpen).not.toHaveBeenCalled();
  });

  it('handles list actions and change notices', async () => {
    MonitorsAPI.get.mockResolvedValue(monitorsPage(1, 21, 2));
    const wrapper = mountPage({ query: { page: '2' } });
    await flushPromises();
    await wrapper.findComponent(Item).vm.$emit('action', 'delete');
    expect(env.actionOpen).toHaveBeenCalledWith('delete', { id: 1 });

    await wrapper.findComponent(ActionDialog).vm.$emit('changed', 'Paused');
    await flushPromises();
    expect(wrapper.find('p[role="status"]').text()).toBe('Paused');

    await wrapper.findComponent(ActionDialog).vm.$emit('saved', 'delete');
    await flushPromises();
    expect(env.route.query.page).toBe(1);
    expect(wrapper.find('p[role="status"]').exists()).toBe(false);

    MonitorsAPI.get.mockClear();
    await wrapper.findComponent(ActionDialog).vm.$emit('saved', 'pause');
    await flushPromises();
    expect(MonitorsAPI.get).toHaveBeenCalledTimes(1);
  });

  it('pages through monitors with a loader', async () => {
    MonitorsAPI.get.mockResolvedValue(monitorsPage(20, 45, 1));
    const wrapper = mountPage();
    await flushPromises();
    let finish;
    MonitorsAPI.get.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    await wrapper.findComponent(Footer).vm.$emit('update:currentPage', 2);
    await flushPromises();
    expect(MonitorsAPI.get).toHaveBeenLastCalledWith({ page: 2 }, 'signal');
    expect(wrapper.find('.opacity-50').exists()).toBe(true);
    expect(wrapper.find('footer spinner-stub').exists()).toBe(true);
    finish(monitorsPage(20, 45, 2));
    await flushPromises();
    expect(wrapper.find('.opacity-50').exists()).toBe(false);

    await wrapper
      .findComponent(Tabs)
      .vm.$emit('tabChanged', { key: 'templates' });
    expect(wrapper.find('.pager').exists()).toBe(false);
  });

  it('resets when the account changes', async () => {
    MonitorsAPI.get.mockResolvedValue(monitorsPage(1, 21, 2));
    const wrapper = mountPage({ query: { page: '2' } });
    await flushPromises();
    await wrapper.findComponent(ActionDialog).vm.$emit('changed', 'Saved');
    MonitorsAPI.get.mockResolvedValue(monitorsPage(3));
    env.accountId.value = 2;
    await flushPromises();
    expect(env.route.query.page).toBe(1);
    expect(wrapper.find('p[role="status"]').exists()).toBe(false);
    expect(wrapper.findAllComponents(Item)).toHaveLength(3);
  });

  it('only offers automations with every feature on an admin account', async () => {
    env.features = ['reports'];
    let wrapper = mountPage();
    await flushPromises();
    expect(wrapper.findComponent(Item).props('canCreateAutomation')).toBe(
      false
    );
    env.features = ['reports', 'conversation_monitors'];
    wrapper = mountPage();
    await flushPromises();
    expect(wrapper.findComponent(Item).props('canCreateAutomation')).toBe(
      false
    );
    env.currentAccount = ref(null);
    wrapper = mountPage();
    await flushPromises();
    expect(
      wrapper.findComponent(Item).props('canCreateAutomation')
    ).toBeFalsy();
    wrapper = mountPage({ admin: false });
    await flushPromises();
    expect(wrapper.findComponent(Item).props()).toMatchObject({
      canCreateAutomation: false,
      showActions: false,
    });
  });
});
