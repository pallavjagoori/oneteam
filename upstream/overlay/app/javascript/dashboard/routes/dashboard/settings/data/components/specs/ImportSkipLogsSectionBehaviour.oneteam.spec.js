/**
 * OneTeam behaviour spec for the skip logs section of a data import.
 *
 * Covers passing the count, labels and logs to the log section, toggle
 * and download events, the type filter buttons (counts, the selected
 * one, disabled when empty or while changing), choosing a type, hiding
 * the filters without skip logs, and each log row with "-" for missing
 * fields.
 */
import { mount } from '@vue/test-utils';
import ImportSkipLogsSection from '../ImportSkipLogsSection.vue';

vi.mock('../../importStatus', () => ({
  formatDate: value => `date:${value}`,
  sourceObjectLabel: log => `source:${log.id}`,
}));

const ImportLogSection = {
  name: 'ImportLogSection',
  props: [
    'title',
    'count',
    'isOpen',
    'isDownloading',
    'downloadLabel',
    'headers',
    'items',
    'emptyMessage',
  ],
  emits: ['toggle', 'download'],
  template:
    '<section><slot name="filters" /><table><slot name="row" :items="items" /></table></section>',
};
const Button = {
  name: 'Button',
  props: { label: String, variant: String, disabled: Boolean },
  emits: ['click'],
  template:
    '<button :disabled="disabled" :data-variant="variant" @click="$emit(\'click\')">{{ label }}</button>',
};
const BaseTableRow = {
  name: 'BaseTableRow',
  props: ['item'],
  template: '<tr><slot /></tr>',
};
const BaseTableCell = { name: 'BaseTableCell', template: '<td><slot /></td>' };

const dataImport = {
  skip_logs_count: 3,
  skip_logs_filters: { counts_by_type: { contact: 2, message: 1 } },
  skip_logs: [
    { id: 1, kind: 'duplicate', message: 'Already exists', created_at: 10 },
    { id: 2 },
  ],
};

const mountSection = props =>
  mount(ImportSkipLogsSection, {
    props: { dataImport, ...props },
    global: {
      stubs: { ImportLogSection, Button, BaseTableRow, BaseTableCell },
    },
  });

const buttons = wrapper => wrapper.findAllComponents(Button);

describe('ImportSkipLogsSection behaviour', () => {
  it('passes the logs and labels to the log section', async () => {
    const wrapper = mountSection({ isOpen: true, isDownloading: true });
    const section = wrapper.findComponent(ImportLogSection);
    expect(section.props()).toMatchObject({
      title: 'DATA_IMPORTS.DETAIL.SKIP_LOGS',
      count: 3,
      isOpen: true,
      isDownloading: true,
      downloadLabel: 'DATA_IMPORTS.DETAIL.DOWNLOAD_SKIP_LOGS',
      emptyMessage: 'DATA_IMPORTS.DETAIL.NO_SKIP_LOGS',
      headers: [
        'DATA_IMPORTS.DETAIL.KIND',
        'DATA_IMPORTS.DETAIL.SOURCE_OBJECT',
        'DATA_IMPORTS.DETAIL.MESSAGE',
        'DATA_IMPORTS.DETAIL.CREATED',
      ],
    });
    await section.vm.$emit('toggle');
    await section.vm.$emit('download');
    expect(wrapper.emitted('toggle')).toHaveLength(1);
    expect(wrapper.emitted('download')).toHaveLength(1);
  });

  it('renders a row per log with placeholders', () => {
    const wrapper = mountSection();
    const rows = wrapper
      .findAll('tr')
      .map(tr => tr.findAll('td').map(td => td.text()));
    expect(rows).toEqual([
      ['duplicate', 'source:1', 'Already exists', 'date:10'],
      ['-', 'source:2', '-', 'date:undefined'],
    ]);
  });

  it('filters by type', async () => {
    const wrapper = mountSection({ selectedType: 'contact' });
    expect(buttons(wrapper).map(b => b.props('label'))).toEqual([
      'DATA_IMPORTS.DETAIL.ALL_SKIP_LOGS (3)',
      'DATA_IMPORTS.TYPES.CONTACTS (2)',
      'DATA_IMPORTS.TYPES.CONVERSATIONS (0)',
      'DATA_IMPORTS.TYPES.MESSAGES (1)',
    ]);
    expect(buttons(wrapper).map(b => b.props('variant'))).toEqual([
      'faded',
      'solid',
      'faded',
      'faded',
    ]);
    expect(buttons(wrapper).map(b => b.props('disabled'))).toEqual([
      false,
      false,
      true,
      false,
    ]);
    await buttons(wrapper)[3].trigger('click');
    await buttons(wrapper)[0].trigger('click');
    expect(wrapper.emitted('changeType')).toEqual([['message'], ['']]);

    await wrapper.setProps({ isChangingType: true });
    expect(buttons(wrapper).every(b => b.props('disabled'))).toBe(true);
  });

  it('hides the filters without skip logs and handles missing data', () => {
    const wrapper = mountSection({ dataImport: { skip_logs_count: 0 } });
    expect(buttons(wrapper)).toHaveLength(0);
    expect(wrapper.findComponent(ImportLogSection).props('items')).toEqual([]);
    expect(wrapper.vm.typeOptions.map(o => o.count)).toEqual([0, 0, 0, 0]);
  });
});
