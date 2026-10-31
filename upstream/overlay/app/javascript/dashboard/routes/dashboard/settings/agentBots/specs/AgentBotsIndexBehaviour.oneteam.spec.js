/**
 * OneTeam behaviour spec for the agent bots settings page.
 *
 * Covers loading bots, rows (global bot badge, webhook URL fallback, no
 * actions for system bots), the count and search, opening the create
 * and edit dialog, and deleting a bot (success and error, spinner state).
 */
import { computed, reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import AgentBotsIndex from '../Index.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({
    t: (key, args) => (args ? `${key} ${JSON.stringify(args)}` : key),
  }),
}));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => env.store,
  useMapGetter: name => computed(() => env.state[name]),
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
const Row = { name: 'BaseTableRow', template: '<tr><slot /></tr>' };
const Cell = { name: 'BaseTableCell', template: '<td><slot /></td>' };
const NextButton = {
  name: 'Button',
  props: ['label', 'icon', 'isLoading'],
  emits: ['click'],
  template:
    '<button :data-icon="icon" @click="$emit(\'click\')">{{ label }}</button>',
};
const BotModal = {
  name: 'AgentBotModal',
  props: ['type', 'selectedBot'],
  data: () => ({ dialogRef: { open: () => env.modalOpen() } }),
  template: '<div />',
};
const Dialog = {
  name: 'Dialog',
  props: ['description', 'isLoading'],
  emits: ['confirm'],
  methods: { open: () => env.dialogOpen(), close: () => env.dialogClose() },
  template: '<div />',
};

const bots = [
  {
    id: 1,
    name: 'Helper',
    description: 'Answers FAQs',
    outgoing_url: 'https://bot.test/hook',
  },
  {
    id: 2,
    name: '',
    description: 'Routes chats',
    bot_config: { webhook_url: 'https://cfg.test' },
  },
  { id: 3, name: 'Captain', system_bot: true },
];

const mountPage = async (records = bots) => {
  env.store = { dispatch: vi.fn().mockResolvedValue() };
  env.state = reactive({
    'agentBots/getBots': records,
    'agentBots/getUIFlags': { isFetching: false, isDeleting: false },
  });
  env.modalOpen = vi.fn();
  env.dialogOpen = vi.fn();
  env.dialogClose = vi.fn();
  const wrapper = mount(AgentBotsIndex, {
    global: {
      stubs: {
        SettingsLayout: Layout,
        BaseSettingsHeader: Header,
        BaseTable: Table,
        BaseTableRow: Row,
        BaseTableCell: Cell,
        Button: NextButton,
        AgentBotModal: BotModal,
        Dialog,
        Avatar: true,
      },
      mocks: { $t: key => key },
    },
  });
  await flushPromises();
  return wrapper;
};

const rowButtons = (wrapper, index) =>
  wrapper.findAll('tr')[index].findAll('button');

describe('Agent bots index behaviour', () => {
  it('loads bots and shows rows', async () => {
    const wrapper = await mountPage();
    expect(env.store.dispatch).toHaveBeenCalledWith('agentBots/get');
    const rows = wrapper.findAll('tr');
    expect(rows[0].text()).toContain('https://bot.test/hook');
    expect(rows[1].text()).toContain('https://cfg.test');
    expect(rows[2].text()).toContain('AGENT_BOTS.GLOBAL_BOT_BADGE');
    expect(rowButtons(wrapper, 2)).toHaveLength(0);
    expect(wrapper.text()).toContain('AGENT_BOTS.COUNT');
    expect(wrapper.findComponent(Table).props('noDataMessage')).toBe(
      'AGENT_BOTS.LIST.404'
    );
  });

  it('shows the empty state', async () => {
    const wrapper = await mountPage([]);
    expect(wrapper.findComponent(Layout).props('noRecordsFound')).toBe(true);
    expect(wrapper.text()).not.toContain('AGENT_BOTS.COUNT');
  });

  it('searches bots', async () => {
    const wrapper = await mountPage();
    await wrapper
      .findComponent(Header)
      .vm.$emit('update:searchQuery', 'Routes');
    expect(
      wrapper
        .findComponent(Table)
        .props('items')
        .map(b => b.id)
    ).toEqual([2]);
    expect(wrapper.findComponent(Table).props('noDataMessage')).toBe(
      'AGENT_BOTS.NO_RESULTS'
    );
    await wrapper.findComponent(Header).vm.$emit('update:searchQuery', ' ');
    expect(wrapper.findComponent(Table).props('items')).toHaveLength(3);
  });

  it('opens the create and edit dialog', async () => {
    const wrapper = await mountPage();
    await rowButtons(wrapper, 0)[0].trigger('click');
    expect(wrapper.findComponent(BotModal).props()).toEqual({
      type: 'edit',
      selectedBot: bots[0],
    });
    await wrapper.find('header button').trigger('click');
    expect(wrapper.findComponent(BotModal).props()).toEqual({
      type: 'create',
      selectedBot: {},
    });
    expect(env.modalOpen).toHaveBeenCalledTimes(2);
  });

  it('deletes a bot and reports the result', async () => {
    const wrapper = await mountPage();
    expect(wrapper.findComponent(Dialog).props('description')).toContain(
      '"name":""'
    );
    await rowButtons(wrapper, 0)[1].trigger('click');
    expect(env.dialogOpen).toHaveBeenCalled();
    expect(wrapper.findComponent(Dialog).props('description')).toContain(
      'Helper'
    );

    let finish;
    env.store.dispatch.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    wrapper.findComponent(Dialog).vm.$emit('confirm');
    await flushPromises();
    expect(env.dialogClose).toHaveBeenCalled();
    expect(wrapper.findAllComponents(NextButton)[1].props('isLoading')).toBe(
      true
    );
    finish();
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenCalledWith('agentBots/delete', 1);
    expect(useAlert).toHaveBeenLastCalledWith(
      'AGENT_BOTS.DELETE.API.SUCCESS_MESSAGE'
    );
    expect(wrapper.findAllComponents(NextButton)[1].props('isLoading')).toBe(
      false
    );

    await rowButtons(wrapper, 1)[1].trigger('click');
    env.store.dispatch.mockRejectedValueOnce(new Error('x'));
    wrapper.findComponent(Dialog).vm.$emit('confirm');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'AGENT_BOTS.DELETE.API.ERROR_MESSAGE'
    );
  });
});
