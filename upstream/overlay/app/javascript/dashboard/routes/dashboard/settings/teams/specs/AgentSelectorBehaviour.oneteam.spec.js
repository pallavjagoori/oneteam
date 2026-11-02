/**
 * OneTeam behaviour spec for the team member picker table.
 *
 * Covers the select-all checkbox (checked, indeterminate, empty list),
 * selecting and unselecting single agents, selecting or clearing all,
 * the agent rows (name, email or placeholder), the selected count, and
 * the submit button disabled until someone is picked.
 */
import { mount } from '@vue/test-utils';
import AgentSelector from '../AgentSelector.vue';

const Checkbox = {
  name: 'Checkbox',
  props: { modelValue: Boolean, indeterminate: Boolean },
  emits: ['change'],
  template: '<input type="checkbox" :checked="modelValue" :data-indeterminate="indeterminate" @change="$emit(\'change\')" />',
};
const BaseTable = {
  name: 'BaseTable',
  props: ['items'],
  template: '<table><thead><slot name="header-0" /></thead><tbody><slot name="row" :items="items" /></tbody></table>',
};
const NextButton = {
  name: 'NextButton',
  props: { label: String, disabled: Boolean },
  template: '<button type="submit" :disabled="disabled">{{ label }}</button>',
};

const agents = [
  { id: 1, name: 'Asha', email: 'asha@acme.com' },
  { id: 2, name: 'Ben' },
];
const mountSelector = props => {
  const updateSelectedAgents = vi.fn();
  const wrapper = mount(AgentSelector, {
    props: { agentList: agents, updateSelectedAgents, submitButtonText: 'Add', ...props },
    global: {
      stubs: {
        Checkbox,
        BaseTable,
        BaseTableRow: { template: '<tr><slot /></tr>' },
        BaseTableCell: { template: '<td><slot /></td>' },
        NextButton,
        Avatar: true,
      },
      mocks: { $t: (key, args) => (args ? `${key}:${args.selected}/${args.total}` : key) },
    },
  });
  return { wrapper, updateSelectedAgents };
};
const selectAll = wrapper => wrapper.find('thead input');
const rowBoxes = wrapper => wrapper.findAll('tbody input');

describe('Team agent selector behaviour', () => {
  it('lists agents and starts with nothing selected', async () => {
    const { wrapper, updateSelectedAgents } = mountSelector();
    expect(wrapper.findAll('h4').map(h => h.text())).toEqual(['Asha', 'Ben']);
    expect(wrapper.text()).toContain('asha@acme.com');
    expect(wrapper.text()).toContain('---');
    expect(wrapper.text()).toContain('TEAMS_SETTINGS.AGENTS.SELECTED_COUNT:0/2');
    expect(wrapper.find('button').attributes('disabled')).toBeDefined();
    expect(selectAll(wrapper).attributes('data-indeterminate')).toBe('false');
    await rowBoxes(wrapper)[1].trigger('change');
    expect(updateSelectedAgents).toHaveBeenLastCalledWith([2]);
    await selectAll(wrapper).trigger('change');
    expect(updateSelectedAgents).toHaveBeenLastCalledWith([1, 2]);
  });

  it('marks partial and full selections and toggles them', async () => {
    const { wrapper, updateSelectedAgents } = mountSelector({ selectedAgents: [1] });
    expect(selectAll(wrapper).attributes('data-indeterminate')).toBe('true');
    expect(rowBoxes(wrapper)[0].element.checked).toBe(true);
    expect(wrapper.find('button').attributes('disabled')).toBeUndefined();
    await rowBoxes(wrapper)[0].trigger('change');
    expect(updateSelectedAgents).toHaveBeenLastCalledWith([]);

    await wrapper.setProps({ selectedAgents: [1, 2] });
    expect(selectAll(wrapper).element.checked).toBe(true);
    expect(selectAll(wrapper).attributes('data-indeterminate')).toBe('false');
    await selectAll(wrapper).trigger('change');
    expect(updateSelectedAgents).toHaveBeenLastCalledWith([]);
  });

  it('does not treat an empty list as all selected', () => {
    const { wrapper } = mountSelector({ agentList: [] });
    expect(selectAll(wrapper).element.checked).toBe(false);
  });
});
