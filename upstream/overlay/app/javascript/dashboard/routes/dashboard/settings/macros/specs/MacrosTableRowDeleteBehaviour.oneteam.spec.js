/**
 * Covers the macro row delete button, which emits delete.
 */
import { shallowMount } from '@vue/test-utils';
import MacrosTableRow from '../MacrosTableRow.vue';

describe('MacrosTableRow delete', () => {
  it('emits delete from the bin button', async () => {
    const wrapper = shallowMount(MacrosTableRow, {
      props: {
        macro: {
          id: 1,
          name: 'Close conversation',
          visibility: 'global',
          created_by: { available_name: 'Maya', email: 'm@example.test' },
          updated_by: { available_name: 'Maya', email: 'm@example.test' },
        },
        canManagePublicMacros: true,
      },
      global: {
        stubs: {
          BaseTableRow: { template: '<div><slot /></div>' },
          BaseTableCell: { template: '<div><slot /></div>' },
          Button: {
            props: ['icon'],
            template: '<button :data-icon="icon" />',
          },
          RouterLink: { template: '<a><slot /></a>' },
        },
        directives: { tooltip: {} },
      },
    });
    await wrapper.find('[data-icon="i-woot-bin"]').trigger('click');
    expect(wrapper.emitted('delete')).toHaveLength(1);
  });
});
