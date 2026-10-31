/**
 * OneTeam behaviour spec for the Captain custom tools page.
 *
 * Covers fetching the assistant's tools (and refetching when access
 * resolves or the assistant changes), pagination, the catalog button,
 * opening the create, edit and view panels, deleting (and stepping back a
 * page when the page empties), enabling and disabling tools (including the
 * confirmation for tools used by scenarios, failures and duplicate
 * toggles), and the toolset install flow.
 */
import { computed, reactive, ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import ToolsIndex from '../Index.vue';

const env = vi.hoisted(() => ({
  state: {},
  route: null,
  push: null,
  replace: null,
  dispatch: null,
  paywall: null,
  isAdmin: null,
  log: [],
}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
  useRouter: () => ({ push: env.push, replace: env.replace }),
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: name => computed(() => env.state[name]),
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/usePolicy', () => ({
  usePolicy: () => ({ shouldShowPaywall: () => env.paywall.value }),
}));
vi.mock('dashboard/composables/useAdmin', () => ({
  useAdmin: () => ({ isAdmin: env.isAdmin }),
}));

const PageLayout = {
  name: 'PageLayout',
  props: [
    'totalCount',
    'currentPage',
    'showPaginationFooter',
    'isFetching',
    'isEmpty',
  ],
  emits: ['update:currentPage', 'click'],
  template: `<div>
    <div class="actions"><slot name="headerActions" /></div>
    <slot name="paywall" /><slot name="emptyState" /><slot name="controls" />
    <div class="body"><slot name="body" /></div>
  </div>`,
};
const panel = name => ({
  name,
  props: ['type', 'selectedTool', 'entity', 'deletePayload'],
  emits: ['close', 'created', 'deleteSuccess'],
  data: () => ({ dialogRef: { open: () => env.log.push(`${name} open`) } }),
  template: `<div class="${name}" />`,
});
const Dialog = {
  name: 'Dialog',
  props: ['title', 'description', 'isLoading'],
  emits: ['confirm', 'close'],
  methods: {
    open: () => env.log.push('disable open'),
    close: () => env.log.push('disable close'),
  },
  template: '<div class="disable" />',
};
const CustomToolCard = {
  name: 'CustomToolCard',
  props: ['id', 'title', 'isUpdating'],
  emits: ['action', 'toggle'],
  template: '<div class="card">{{ title }}</div>',
};
const ToolsetInstallFlow = {
  name: 'ToolsetInstallFlow',
  props: ['source', 'assistantId'],
  emits: ['installed', 'done'],
  template: '<div class="install" />',
};

const tools = [
  { id: 1, title: 'Orders', assistant_id: 3 },
  { id: 2, title: 'Refunds', assistant_id: 3 },
  { id: 9, title: 'Other assistant', assistant_id: 4 },
];

const mountPage = async () => {
  const wrapper = mount(ToolsIndex, {
    global: {
      stubs: {
        PageLayout,
        CreateCustomToolDialog: panel('CreateCustomToolDialog'),
        DeleteDialog: panel('DeleteDialog'),
        Dialog,
        CustomToolCard,
        ToolsetInstallFlow,
        CaptainPaywall: true,
        CustomToolsPageEmptyState: {
          emits: ['click'],
          template: '<button class="empty" @click="$emit(\'click\')" />',
        },
        AssistantToolsBanner: true,
        Policy: { template: '<div><slot /></div>' },
        Button: {
          emits: ['click'],
          template: '<button class="catalog" @click="$emit(\'click\')" />',
        },
      },
    },
  });
  await flushPromises();
  return wrapper;
};
const layout = wrapper => wrapper.findComponent(PageLayout);
const cards = wrapper => wrapper.findAllComponents(CustomToolCard);
const getCalls = () =>
  env.dispatch.mock.calls.filter(([name]) => name === 'captainCustomTools/get');

describe('Captain tools page behaviour', () => {
  beforeEach(() => {
    env.route = reactive({
      params: { accountId: 1, assistantId: '3' },
      query: {},
    });
    env.push = vi.fn();
    env.replace = vi.fn();
    env.dispatch = vi.fn();
    env.paywall = ref(false);
    env.isAdmin = ref(true);
    env.log = [];
    env.state = {
      'captainCustomTools/getUIFlags': { fetchingList: false },
      'captainCustomTools/getRecords': tools,
      'captainCustomTools/getMeta': { page: 1, totalCount: 2 },
      'globalConfig/get': { captainToolsManifestEnabled: true },
    };
  });

  it("lists the assistant's tools and pages through them", async () => {
    const wrapper = await mountPage();
    expect(getCalls()[0][1]).toMatchObject({ assistantId: '3', page: 1 });
    expect(getCalls()[0][1].signal).toBeInstanceOf(AbortSignal);
    expect(cards(wrapper).map(c => c.text())).toEqual(['Orders', 'Refunds']);
    expect(layout(wrapper).props('showPaginationFooter')).toBe(true);
    await layout(wrapper).vm.$emit('update:currentPage', 2);
    expect(getCalls().at(-1)[1].page).toBe(2);
  });

  it('waits for access and refetches when the assistant changes', async () => {
    env.paywall.value = true;
    env.state['captainCustomTools/getUIFlags'] = { fetchingList: true };
    const wrapper = await mountPage();
    expect(getCalls()).toHaveLength(0);
    expect(wrapper.find('.catalog').exists()).toBe(false);
    expect(layout(wrapper).props('isFetching')).toBe(true);
    env.route.params.assistantId = '4';
    await flushPromises();
    expect(getCalls()).toHaveLength(0);
    expect(cards(wrapper).map(c => c.text())).toEqual(['Other assistant']);
  });

  it('opens the catalog', async () => {
    const wrapper = await mountPage();
    await wrapper.find('.catalog').trigger('click');
    expect(env.push).toHaveBeenCalledWith({
      name: 'captain_tools_explore',
      params: { accountId: 1, assistantId: '3' },
    });
  });

  it('opens the create panel from the header and the empty state', async () => {
    const wrapper = await mountPage();
    await layout(wrapper).vm.$emit('click');
    await flushPromises();
    const dialog = wrapper.findComponent({ name: 'CreateCustomToolDialog' });
    expect(dialog.props('type')).toBe('create');
    expect(dialog.props('selectedTool')).toBeNull();
    expect(env.log).toEqual(['CreateCustomToolDialog open']);
    await dialog.vm.$emit('created');
    expect(getCalls()).toHaveLength(2);
    await dialog.vm.$emit('close');
    expect(
      wrapper.findComponent({ name: 'CreateCustomToolDialog' }).exists()
    ).toBe(false);
    await wrapper.find('.empty').trigger('click');
    await flushPromises();
    expect(env.log).toHaveLength(2);
  });

  it('opens edit and view panels and ignores unknown actions', async () => {
    const wrapper = await mountPage();
    await cards(wrapper)[0].vm.$emit('action', { action: 'edit', id: 1 });
    await flushPromises();
    expect(
      wrapper.findComponent({ name: 'CreateCustomToolDialog' }).props('type')
    ).toBe('edit');
    await cards(wrapper)[1].vm.$emit('action', { action: 'view', id: 2 });
    await flushPromises();
    expect(
      wrapper
        .findComponent({ name: 'CreateCustomToolDialog' })
        .props('selectedTool')
    ).toEqual(tools[1]);
    await cards(wrapper)[1].vm.$emit('action', { action: 'duplicate', id: 2 });
    expect(env.log).toHaveLength(2);
  });

  it('deletes tools and refreshes the right page', async () => {
    env.state['captainCustomTools/getMeta'] = { page: 2, totalCount: 12 };
    const wrapper = await mountPage();
    await cards(wrapper)[0].vm.$emit('action', { action: 'delete', id: 1 });
    await flushPromises();
    const remove = wrapper.findComponent({ name: 'DeleteDialog' });
    expect(remove.props('deletePayload')).toEqual({ id: 1, assistantId: '3' });
    expect(env.log).toEqual(['DeleteDialog open']);
    await remove.vm.$emit('deleteSuccess');
    expect(getCalls().at(-1)[1].page).toBe(2);
    expect(wrapper.findComponent({ name: 'DeleteDialog' }).exists()).toBe(
      false
    );
  });

  it('steps back a page when the last tool on it is deleted', async () => {
    env.state['captainCustomTools/getMeta'] = { page: 2, totalCount: 11 };
    env.state['captainCustomTools/getRecords'] = [];
    const wrapper = await mountPage();
    wrapper.vm.$.setupState.selectedTool = tools[0];
    await flushPromises();
    await wrapper
      .findComponent({ name: 'DeleteDialog' })
      .vm.$emit('deleteSuccess');
    expect(getCalls().at(-1)[1].page).toBe(1);
  });

  it('enables tools and reports failures', async () => {
    const wrapper = await mountPage();
    await cards(wrapper)[0].vm.$emit('toggle', { id: 1, enabled: true });
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('captainCustomTools/update', {
      id: 1,
      enabled: true,
      assistantId: '3',
    });
    expect(useAlert).toHaveBeenLastCalledWith(
      'CAPTAIN.CUSTOM_TOOLS.TOGGLE.ENABLED'
    );
    env.dispatch.mockImplementation(name =>
      name === 'captainCustomTools/update'
        ? Promise.reject(new Error('x'))
        : undefined
    );
    await cards(wrapper)[0].vm.$emit('toggle', { id: 1, enabled: true });
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'CAPTAIN.CUSTOM_TOOLS.TOGGLE.ERROR'
    );
    expect(cards(wrapper)[0].props('isUpdating')).toBe(false);
  });

  it('disables unused tools directly and ignores repeated toggles', async () => {
    let finish;
    env.dispatch.mockImplementation(name => {
      if (name === 'captainCustomTools/show')
        return { title: 'Orders', enabled_scenarios_count: 0 };
      if (name === 'captainCustomTools/update')
        return new Promise(resolve => {
          finish = resolve;
        });
      return undefined;
    });
    const wrapper = await mountPage();
    await cards(wrapper)[0].vm.$emit('toggle', { id: 1, enabled: false });
    await flushPromises();
    expect(cards(wrapper)[0].props('isUpdating')).toBe(true);
    await cards(wrapper)[0].vm.$emit('toggle', { id: 1, enabled: false });
    finish();
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'CAPTAIN.CUSTOM_TOOLS.TOGGLE.DISABLED'
    );
    expect(
      env.dispatch.mock.calls.filter(([n]) => n === 'captainCustomTools/show')
    ).toHaveLength(1);
    expect(cards(wrapper)[0].props('isUpdating')).toBe(false);
  });

  it('alerts when the tool cannot be loaded before disabling', async () => {
    env.dispatch.mockImplementation(name =>
      name === 'captainCustomTools/show'
        ? Promise.reject(new Error('x'))
        : undefined
    );
    const wrapper = await mountPage();
    await cards(wrapper)[0].vm.$emit('toggle', { id: 1, enabled: false });
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'CAPTAIN.CUSTOM_TOOLS.TOGGLE.ERROR'
    );
    expect(cards(wrapper)[0].props('isUpdating')).toBe(false);
  });

  it('confirms before disabling tools used by scenarios', async () => {
    let count = 1;
    let updateFails = true;
    env.dispatch.mockImplementation(name => {
      if (name === 'captainCustomTools/show')
        return { title: 'Orders', enabled_scenarios_count: count };
      if (name === 'captainCustomTools/update' && updateFails)
        return Promise.reject(new Error('x'));
      return undefined;
    });
    const wrapper = await mountPage();
    const dialog = () => wrapper.findComponent(Dialog);
    await dialog().vm.$emit('confirm');
    await cards(wrapper)[0].vm.$emit('toggle', { id: 1, enabled: false });
    await flushPromises();
    expect(env.log).toEqual(['disable open']);
    expect(dialog().props('title')).toBe(
      'CAPTAIN.CUSTOM_TOOLS.DISABLE_CONFIRMATION.TITLE'
    );
    expect(dialog().props('description')).toBe(
      'CAPTAIN.CUSTOM_TOOLS.DISABLE_CONFIRMATION.DESCRIPTION_ONE'
    );
    await dialog().vm.$emit('confirm');
    await flushPromises();
    expect(env.log).toEqual(['disable open']);
    updateFails = false;
    await dialog().vm.$emit('confirm');
    await flushPromises();
    expect(env.log).toEqual(['disable open', 'disable close']);
    await dialog().vm.$emit('close');
    expect(cards(wrapper)[0].props('isUpdating')).toBe(false);
    await dialog().vm.$emit('close');

    count = 3;
    await cards(wrapper)[1].vm.$emit('toggle', { id: 2, enabled: false });
    await flushPromises();
    expect(dialog().props('description')).toBe(
      'CAPTAIN.CUSTOM_TOOLS.DISABLE_CONFIRMATION.DESCRIPTION_OTHER'
    );
    expect(cards(wrapper)[1].props('isUpdating')).toBe(true);
  });

  it('runs the toolset install flow for admins', async () => {
    env.route.query = { install: 'shopify' };
    const wrapper = await mountPage();
    const flow = wrapper.findComponent(ToolsetInstallFlow);
    expect(flow.props()).toEqual({ source: 'shopify', assistantId: '3' });
    await flow.vm.$emit('installed', 4);
    expect(getCalls()).toHaveLength(1);
    await flow.vm.$emit('installed', 3);
    expect(getCalls()).toHaveLength(2);
    await flow.vm.$emit('done', 4);
    expect(env.replace).toHaveBeenCalledWith({
      name: 'captain_tools_index',
      params: { accountId: 1, assistantId: 4 },
    });
    env.isAdmin.value = false;
    await flushPromises();
    expect(wrapper.findComponent(ToolsetInstallFlow).exists()).toBe(false);
  });
});
