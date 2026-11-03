/**
 * OneTeam behaviour spec for the dashboard apps settings row.
 *
 * Covers the title and URL cells and the edit and delete events.
 */
import { mount } from '@vue/test-utils';
import DashboardAppsRow from '../DashboardAppsRow.vue';

const app = { id: 1, title: 'CRM', content: [{ url: 'https://crm.test' }] };

describe('DashboardAppsRow behaviour', () => {
  it('shows the app and emits edit and delete', async () => {
    const wrapper = mount(DashboardAppsRow, {
      props: { app },
      global: {
        mocks: { $t: key => key },
        directives: { tooltip: {} },
        stubs: {
          BaseTableRow: { template: '<tr><slot /></tr>' },
          BaseTableCell: { template: '<td><slot /></td>' },
          Button: {
            props: { icon: String },
            emits: ['click'],
            template: '<button :class="icon" @click="$emit(\'click\')" />',
          },
        },
      },
    });
    expect(
      wrapper
        .findAll('td')
        .map(td => td.text())
        .slice(0, 2)
    ).toEqual(['CRM', 'https://crm.test']);
    await wrapper.find('.i-woot-edit-pen').trigger('click');
    await wrapper.find('.i-woot-bin').trigger('click');
    expect(wrapper.emitted('edit')).toEqual([[app]]);
    expect(wrapper.emitted('delete')).toEqual([[app]]);
  });
});
