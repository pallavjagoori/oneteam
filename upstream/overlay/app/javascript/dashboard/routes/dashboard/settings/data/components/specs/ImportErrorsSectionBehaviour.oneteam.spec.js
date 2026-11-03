/**
 * OneTeam behaviour spec for the errors section of a data import.
 *
 * Covers the props passed to the log section, toggle and download
 * events, each error row with "-" for a missing message, and missing
 * errors.
 */
import { mount } from '@vue/test-utils';
import ImportErrorsSection from '../ImportErrorsSection.vue';

vi.mock('../../importStatus', () => ({
  formatDate: value => `date:${value}`,
  sourceObjectLabel: error => `source:${error.id}`,
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
  template: '<table><slot name="row" :items="items" /></table>',
};
const BaseTableRow = {
  name: 'BaseTableRow',
  props: ['item'],
  template: '<tr><slot /></tr>',
};
const BaseTableCell = { name: 'BaseTableCell', template: '<td><slot /></td>' };

const dataImport = {
  import_errors_count: 2,
  import_errors: [
    { id: 1, error_code: 'E1', message: 'Bad row', created_at: 5 },
    { id: 2, error_code: 'E2' },
  ],
};

/**
 * Mounts the errors section.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountSection = props =>
  mount(ImportErrorsSection, {
    props: { dataImport, ...props },
    global: { stubs: { ImportLogSection, BaseTableRow, BaseTableCell } },
  });

describe('ImportErrorsSection behaviour', () => {
  it('passes the errors and labels to the log section', async () => {
    const wrapper = mountSection({ isOpen: true, isDownloading: true });
    const section = wrapper.findComponent(ImportLogSection);
    expect(section.props()).toMatchObject({
      title: 'DATA_IMPORTS.DETAIL.ERRORS',
      count: 2,
      isOpen: true,
      isDownloading: true,
      downloadLabel: 'DATA_IMPORTS.DETAIL.DOWNLOAD_ERROR_LOGS',
      emptyMessage: 'DATA_IMPORTS.DETAIL.NO_ERRORS',
      headers: [
        'DATA_IMPORTS.DETAIL.ERROR_CODE',
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

  it('renders a row per error', () => {
    const rows = mountSection()
      .findAll('tr')
      .map(tr => tr.findAll('td').map(td => td.text()));
    expect(rows).toEqual([
      ['E1', 'source:1', 'Bad row', 'date:5'],
      ['E2', 'source:2', '-', 'date:undefined'],
    ]);
  });

  it('passes no items without errors', () => {
    const wrapper = mountSection({ dataImport: { import_errors_count: 0 } });
    expect(wrapper.findComponent(ImportLogSection).props('items')).toEqual([]);
  });
});
