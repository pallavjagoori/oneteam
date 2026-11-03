/**
 * OneTeam behaviour spec for the custom roles table body.
 *
 * Covers one row per role with its name, description and translated
 * permissions, the per-row delete spinner, and the edit and delete events.
 */
import { mount } from '@vue/test-utils';
import CustomRoleTableBody from '../CustomRoleTableBody.vue';

const Button = {
  name: 'Button',
  props: ['icon', 'isLoading'],
  emits: ['click'],
  template: '<button :class="icon" @click="$emit(\'click\')" />',
};
const roles = [
  { id: 1, name: 'Lead', description: 'Leads', permissions: ['a', 'b'] },
  { id: 2, name: 'Viewer', description: 'Reads', permissions: [] },
];

describe('CustomRoleTableBody behaviour', () => {
  it('lists roles and emits row actions', async () => {
    const wrapper = mount(CustomRoleTableBody, {
      props: { roles, loading: { 2: true } },
      global: {
        stubs: {
          Button,
          BaseTableRow: { template: '<tr><slot /></tr>' },
          BaseTableCell: { template: '<td><slot /></td>' },
        },
        directives: { tooltip: {} },
      },
    });
    const rows = wrapper.findAll('tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('Lead');
    expect(rows[0].text()).toContain('Leads');
    expect(rows[0].findAll('td')[2].text()).toBe(
      'CUSTOM_ROLE.PERMISSIONS.A, CUSTOM_ROLE.PERMISSIONS.B'
    );
    const deletes = wrapper
      .findAllComponents(Button)
      .filter(button => button.props('icon') === 'i-woot-bin');
    expect(deletes.map(button => button.props('isLoading'))).toEqual([
      undefined,
      true,
    ]);
    await rows[0].find('.i-woot-edit-pen').trigger('click');
    await rows[1].find('.i-woot-bin').trigger('click');
    expect(wrapper.emitted('edit')).toEqual([[roles[0]]]);
    expect(wrapper.emitted('delete')).toEqual([[roles[1]]]);
  });

  it('defaults to no loading rows', () => {
    const wrapper = mount(CustomRoleTableBody, {
      props: { roles: [] },
      global: { directives: { tooltip: {} } },
    });
    expect(wrapper.findAll('tr')).toHaveLength(0);
  });
});
