/**
 * OneTeam behaviour spec for the agent capacity policy form.
 *
 * Covers the default and loaded values, validation gating the submit
 * button, editing the name, description and exclusion rules, resetting,
 * the inbox limit events, the user section's add and delete events, and
 * hiding both sections.
 */
import { shallowMount } from '@vue/test-utils';
import AgentCapacityPolicyForm from '../AgentCapacityPolicyForm.vue';

const mountForm = (props = {}) =>
  shallowMount(AgentCapacityPolicyForm, {
    props: { mode: 'CREATE', ...props },
  });

const button = wrapper => wrapper.findComponent({ name: 'Button' });
const named = (wrapper, name) => wrapper.findComponent({ name });

describe('AgentCapacityPolicyForm behaviour', () => {
  it('edits, validates, submits and resets the policy', async () => {
    const wrapper = mountForm({ labelList: [{ id: 1 }] });
    expect(button(wrapper).vm.$attrs.disabled).toBe(true);
    expect(button(wrapper).props('label')).toBe(
      'ASSIGNMENT_POLICY.AGENT_CAPACITY_POLICY.CREATE.CREATE_BUTTON'
    );
    expect(
      AgentCapacityPolicyForm.props.mode.validator('EDIT') &&
        !AgentCapacityPolicyForm.props.mode.validator('VIEW')
    ).toBe(true);

    const base = named(wrapper, 'BaseInfo');
    await base.vm.$emit('validationChange', { isValid: true });
    expect(wrapper.emitted('validationChange')).toEqual([[{ isValid: true }]]);
    expect(button(wrapper).vm.$attrs.disabled).toBe(false);
    await base.vm.$emit('update:policyName', 'Cap');
    await base.vm.$emit('update:description', 'Limit');
    const rules = named(wrapper, 'ExclusionRules');
    await rules.vm.$emit('update:excludedLabels', ['vip']);
    await rules.vm.$emit('update:excludeOlderThanMinutes', 24);
    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('submit')[0][0]).toMatchObject({
      name: 'Cap',
      description: 'Limit',
      exclusionRules: { excludedLabels: ['vip'], excludeOlderThanHours: 24 },
    });

    wrapper.vm.resetForm();
    await wrapper.vm.$nextTick();
    expect(named(wrapper, 'BaseInfo').props('policyName')).toBe('');
    await wrapper.setProps({ isLoading: true });
    expect(button(wrapper).vm.$attrs.disabled).toBe(true);
  });

  it('forwards inbox limit and user events', async () => {
    const wrapper = mountForm({
      mode: 'EDIT',
      initialData: { name: 'Loaded', inboxCapacityLimits: [{ id: 1 }] },
      showInboxLimitSection: true,
      showUserSection: true,
      isUsersLoading: true,
    });
    expect(named(wrapper, 'BaseInfo').props('policyName')).toBe('Loaded');
    const limits = named(wrapper, 'InboxCapacityLimits');
    await limits.vm.$emit('delete', 1);
    await limits.vm.$emit('add', { inboxId: 2 });
    await limits.vm.$emit('update', { id: 1, limit: 5 });
    await limits.vm.$emit('update:inboxCapacityLimits', []);
    expect(wrapper.emitted('deleteInboxLimit')).toEqual([[1]]);
    expect(wrapper.emitted('addInboxLimit')).toEqual([[{ inboxId: 2 }]]);
    expect(wrapper.emitted('updateInboxLimit')).toEqual([
      [{ id: 1, limit: 5 }],
    ]);

    await named(wrapper, 'AddDataDropdown').vm.$emit('add', { id: 9 });
    await named(wrapper, 'DataTable').vm.$emit('delete', 9);
    expect(wrapper.emitted('addUser')).toEqual([[{ id: 9 }]]);
    expect(wrapper.emitted('deleteUser')).toEqual([[9]]);

    const usersOnly = mountForm({ showUserSection: true });
    expect(named(usersOnly, 'InboxCapacityLimits').exists()).toBe(false);
    const limitsOnly = mountForm({ showInboxLimitSection: true });
    expect(named(limitsOnly, 'DataTable').exists()).toBe(false);
    expect(named(mountForm(), 'DataTable').exists()).toBe(false);
  });
});
