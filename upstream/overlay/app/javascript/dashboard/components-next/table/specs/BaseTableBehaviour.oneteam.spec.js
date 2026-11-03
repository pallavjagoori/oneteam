/**
 * OneTeam behaviour spec for BaseTable.
 *
 * Covers headers (text and slot), the row slot, and the no-data row with
 * and without headers or while loading.
 */
import { mount } from '@vue/test-utils';
import BaseTable from '../BaseTable.vue';

describe('BaseTable behaviour', () => {
  it('renders headers and rows', () => {
    const wrapper = mount(BaseTable, {
      props: { headers: ['Name', 'Email'], items: [{ id: 1 }] },
      slots: {
        'header-1': '<em>Mail</em>',
        row: '<tr class="row"><td>Ann</td></tr>',
      },
    });
    const headers = wrapper.findAll('th');
    expect(headers[0].text()).toBe('Name');
    expect(headers[1].find('em').text()).toBe('Mail');
    expect(wrapper.find('.row').exists()).toBe(true);
  });

  it('shows the no-data message without items', () => {
    const wrapper = mount(BaseTable, {
      props: { headers: ['Name', 'Email'], noDataMessage: 'Nothing here' },
    });
    expect(wrapper.find('thead').exists()).toBe(false);
    expect(wrapper.find('td').attributes('colspan')).toBe('2');
    expect(wrapper.find('td').text()).toBe('Nothing here');
    expect(
      mount(BaseTable, { props: { noDataMessage: 'None' } })
        .find('td')
        .attributes('colspan')
    ).toBe('1');
  });

  it('hides the no-data row while loading', () => {
    const wrapper = mount(BaseTable, {
      props: { noDataMessage: 'Nothing here', loading: true },
    });
    expect(wrapper.find('td').exists()).toBe(false);
  });
});
