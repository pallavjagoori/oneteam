/**
 * OneTeam behaviour spec for the WhatsApp campaign delivery table.
 *
 * Covers the spinner while loading, the empty table with its message and
 * border, the filter and footer slots, each delivery's contact link (in a
 * new tab, with fallbacks for missing name and phone), status, message
 * (or a "not generated" note), and failure reason with an error code
 * shown only when it adds something.
 */
import { mount } from '@vue/test-utils';
import CampaignDeliveryTable from '../CampaignDeliveryTable.vue';

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { accountId: 9 } }),
}));

const BaseTable = {
  name: 'BaseTable',
  props: ['headers', 'items', 'noDataMessage'],
  template:
    '<table><p v-if="!items.length" class="no-data">{{ noDataMessage }}</p><slot name="row" :items="items" /></table>',
};
const RouterLink = {
  name: 'RouterLink',
  props: ['to'],
  template: '<a class="contact" :data-to="JSON.stringify(to)"><slot /></a>',
};

const mountTable = (props, slots) =>
  mount(CampaignDeliveryTable, {
    props,
    slots,
    global: {
      stubs: {
        BaseTable,
        BaseTableRow: { template: '<tr><slot /></tr>' },
        BaseTableCell: { template: '<td><slot /></td>' },
        RouterLink,
        DeliveryStatusBadge: {
          props: ['status'],
          template: '<b class="status">{{ status }}</b>',
        },
        Spinner: { template: '<i class="spinner" />' },
      },
    },
  });

const cells = row => row.findAll('td').map(td => td.text());

describe('CampaignDeliveryTable behaviour', () => {
  it('shows a spinner while loading', () => {
    const wrapper = mountTable({ loading: true });
    expect(wrapper.find('.spinner').exists()).toBe(true);
    expect(wrapper.find('table').exists()).toBe(false);
  });

  it('shows the empty message with the filter and footer slots', () => {
    const wrapper = mountTable(
      { noDataMessage: 'No deliveries yet' },
      { filters: '<span class="filters" />', footer: '<span class="foot" />' }
    );
    expect(wrapper.find('.no-data').text()).toBe('No deliveries yet');
    expect(wrapper.find('.border-t').exists()).toBe(true);
    expect(wrapper.find('.filters').exists()).toBe(true);
    expect(wrapper.find('.foot').exists()).toBe(true);
    expect(wrapper.findComponent(BaseTable).props('headers')).toHaveLength(4);
  });

  it('lists each delivery with its contact, status, message and reason', () => {
    const wrapper = mountTable({
      deliveries: [
        {
          contact: { id: 1, name: 'Jane', phone_number: '+15550001' },
          status: 'delivered',
          message_content: 'Hello Jane',
        },
        {
          contact: { id: 2 },
          status: 'failed',
          error_message: 'Number not on WhatsApp',
          error_code: 131026,
        },
        {
          contact: { id: 3 },
          status: 'failed',
          error_code: 470,
        },
        {
          contact: { id: 4 },
          status: 'failed',
          error_title: 'Rate limited',
        },
      ],
    });
    const rows = wrapper.findAll('tr');
    expect(wrapper.find('.border-t').exists()).toBe(false);

    const [jane, missing, codeOnly, titled] = rows;
    expect(cells(jane)).toEqual([
      'Jane+15550001',
      'delivered',
      'Hello Jane',
      '-',
    ]);
    expect(JSON.parse(jane.find('.contact').attributes('data-to'))).toEqual({
      name: 'contacts_edit',
      params: { accountId: 9, contactId: 1 },
    });

    expect(cells(missing)).toEqual([
      '--',
      'failed',
      'CAMPAIGN.WHATSAPP.ANALYTICS.TABLE.MESSAGE_NOT_GENERATED',
      'Number not on WhatsAppCAMPAIGN.WHATSAPP.ANALYTICS.TABLE.ERROR_CODE',
    ]);
    expect(missing.findAll('td')[2].find('span').classes()).toContain('italic');

    // The code alone is the reason, so it is not repeated.
    expect(cells(codeOnly)[3]).toBe('470');
    expect(cells(titled)[3]).toBe('Rate limited');
  });
});
