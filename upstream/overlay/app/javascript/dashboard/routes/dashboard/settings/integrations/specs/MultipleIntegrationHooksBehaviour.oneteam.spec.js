/**
 * OneTeam behaviour spec for integrations with several hooks (e.g. one
 * per inbox).
 *
 * Covers the header (title, description with the installation name,
 * hook count, optional add button), the empty state, table headers with
 * and without the inbox column, hook properties with "--" for blanks,
 * inbox names, searching (including clearing to null and no results),
 * and the add and delete events.
 *
 * UNREACHABLE: `integration.name || ''` (the description already calls
 * `integration.name.toUpperCase()`), and the `?.`/`|| []` fallbacks in
 * filteredHooks, which always have hooks with string properties.
 */
import { computed } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import MultipleIntegrationHooks from '../MultipleIntegrationHooks.vue';

const { env, Table, Row, Cell } = vi.hoisted(() => ({
  env: {},
  Table: {
    name: 'BaseTable',
    props: ['headers', 'items', 'noDataMessage'],
    template: '<table><slot name="row" :items="items" /></table>',
  },
  Row: {
    name: 'BaseTableRow',
    props: ['item'],
    template: '<tr class="row"><slot /></tr>',
  },
  Cell: { name: 'BaseTableCell', template: '<td><slot /></td>' },
}));

vi.mock('dashboard/components-next/table', () => ({
  BaseTable: Table,
  BaseTableRow: Row,
  BaseTableCell: Cell,
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => computed(() => ({ installationName: 'OneTeam' })),
}));
vi.mock('dashboard/composables/useIntegrationHook', () => ({
  useIntegrationHook: () => ({
    integration: computed(() => env.integration),
    isHookTypeInbox: computed(() => env.inbox),
    hasConnectedHooks: computed(() => env.integration.hooks.length > 0),
  }),
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const Header = {
  name: 'BaseSettingsHeader',
  props: ['searchQuery', 'title', 'description'],
  emits: ['update:searchQuery'],
  template: '<header><slot name="count" /><slot name="actions" /></header>',
};
const NextButton = {
  name: 'NextButton',
  props: ['label', 'icon'],
  emits: ['click'],
  template:
    '<button :data-icon="icon" @click="$emit(\'click\', $event)">{{ label }}</button>',
};

const hooks = [
  {
    id: 1,
    settings: { channel: 'support', team: 'Tier 1' },
    inbox: { name: 'Email' },
  },
  { id: 2, settings: { channel: 'billing' } },
];

const mountHooks = async ({
  integration = {},
  inbox = true,
  showAddButton = true,
} = {}) => {
  env.integration = {
    id: 'slack',
    name: 'slack',
    visible_properties: ['channel', 'team'],
    hooks,
    ...integration,
  };
  env.inbox = inbox;
  const wrapper = mount(MultipleIntegrationHooks, {
    props: { integrationId: 'slack', showAddButton },
    global: {
      stubs: { BaseSettingsHeader: Header, NextButton },
      directives: { tooltip: {} },
      mocks: {
        $t: (key, params) =>
          params ? `${key}:${Object.values(params).join(',')}` : key,
      },
    },
  });
  await flushPromises();
  return wrapper;
};
const rows = wrapper => wrapper.findAll('.row');
const search = async (wrapper, query) => {
  wrapper.findComponent(Header).vm.$emit('update:searchQuery', query);
  await flushPromises();
};

describe('MultipleIntegrationHooks behaviour', () => {
  it('shows the header with count and add button', async () => {
    const wrapper = await mountHooks();
    const header = wrapper.findComponent(Header);
    expect(header.props()).toMatchObject({
      title: 'slack',
      description: 'INTEGRATION_APPS.SIDEBAR_DESCRIPTION.SLACK:OneTeam',
    });
    expect(header.text()).toContain('INTEGRATION_APPS.COUNT:2');
    await wrapper.find('header button').trigger('click');
    expect(wrapper.emitted('add')).toHaveLength(1);
  });

  it('lists hooks with inbox names and placeholders', async () => {
    const wrapper = await mountHooks();
    expect(wrapper.findComponent(Table).props('headers')).toEqual([
      'channel',
      'team',
      'INTEGRATION_APPS.LIST.INBOX',
      'INTEGRATION_APPS.LIST.ACTIONS',
    ]);
    expect(rows(wrapper).map(r => r.findAll('td').map(c => c.text()))).toEqual([
      ['support', 'Tier 1', 'Email', ''],
      ['billing', '--', '', ''],
    ]);
    await rows(wrapper)[1].find('[data-icon="i-woot-bin"]').trigger('click');
    expect(wrapper.emitted('delete')[0][0]).toMatchObject({ id: 2 });
  });

  it('drops the inbox column for account hooks and handles no properties', async () => {
    const wrapper = await mountHooks({
      inbox: false,
      showAddButton: false,
      integration: { visible_properties: undefined },
    });
    expect(wrapper.findComponent(Table).props('headers')).toEqual([
      'INTEGRATION_APPS.LIST.ACTIONS',
    ]);
    expect(wrapper.find('header button').exists()).toBe(false);
  });

  it('searches hooks by property', async () => {
    const wrapper = await mountHooks();
    await search(wrapper, ' BILL ');
    expect(rows(wrapper)).toHaveLength(1);
    expect(wrapper.findComponent(Table).props('noDataMessage')).toBe(
      'INTEGRATION_APPS.NO_RESULTS'
    );
    await search(wrapper, null);
    expect(rows(wrapper)).toHaveLength(2);
    expect(wrapper.findComponent(Table).props('noDataMessage')).toBe('');
  });

  it('shows the empty state without hooks', async () => {
    const wrapper = await mountHooks({ integration: { hooks: [] } });
    expect(wrapper.findComponent(Table).exists()).toBe(false);
    expect(wrapper.text()).toContain(
      'INTEGRATION_APPS.NO_HOOK_CONFIGURED:slack'
    );
    expect(wrapper.text()).not.toContain('INTEGRATION_APPS.COUNT');
  });
});
