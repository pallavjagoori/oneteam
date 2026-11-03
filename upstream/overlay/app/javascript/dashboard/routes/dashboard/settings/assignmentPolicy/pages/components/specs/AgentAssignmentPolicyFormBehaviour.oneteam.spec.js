/**
 * OneTeam behaviour spec for the agent assignment policy form.
 *
 * Covers the default and loaded values, the balanced option being locked
 * without the advanced assignment feature, choosing radio options,
 * validation gating the submit button, the hours and minutes bridge for
 * the stale-conversation threshold (including clearing it), resetting the
 * form, and the inbox section's add, delete and navigate events.
 */
import { shallowMount } from '@vue/test-utils';
import AgentAssignmentPolicyForm from '../AgentAssignmentPolicyForm.vue';

const env = vi.hoisted(() => ({ advanced: false }));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { accountId: '1' } }),
}));
vi.mock('dashboard/composables/store', async () => {
  const { ref } = await import('vue');
  return {
    useMapGetter: () => ref(() => env.advanced),
  };
});

const WithLabel = { name: 'WithLabel', template: '<div><slot /></div>' };

const mountForm = (props = {}) =>
  shallowMount(AgentAssignmentPolicyForm, {
    props: { mode: 'CREATE', ...props },
    global: { stubs: { WithLabel } },
  });

const cards = wrapper => wrapper.findAllComponents({ name: 'RadioCard' });
const duration = wrapper => wrapper.findComponent({ name: 'DurationInput' });
const submitButton = wrapper => wrapper.findComponent({ name: 'Button' });

describe('AgentAssignmentPolicyForm behaviour', () => {
  beforeEach(() => {
    env.advanced = false;
  });

  it('locks balanced assignment without the premium feature', () => {
    const wrapper = mountForm();
    const [roundRobin, balanced, earliest] = cards(wrapper);
    expect(roundRobin.props('isActive')).toBe(true);
    expect(balanced.props()).toMatchObject({
      disabled: true,
      disabledLabel:
        'ASSIGNMENT_POLICY.AGENT_ASSIGNMENT_POLICY.FORM.ASSIGNMENT_ORDER.BALANCED.PREMIUM_BADGE',
    });
    expect(earliest.props('isActive')).toBe(true);

    env.advanced = true;
    expect(cards(mountForm())[1].props()).toMatchObject({
      disabled: false,
      disabledMessage: '',
      disabledLabel: '',
    });
    expect(
      AgentAssignmentPolicyForm.props.mode.validator('EDIT') &&
        !AgentAssignmentPolicyForm.props.mode.validator('VIEW')
    ).toBe(true);
  });

  it('validates, edits and submits the policy', async () => {
    const wrapper = mountForm({ mode: 'EDIT' });
    expect(submitButton(wrapper).vm.$attrs.disabled).toBe(true);
    expect(submitButton(wrapper).props('label')).toBe(
      'ASSIGNMENT_POLICY.AGENT_ASSIGNMENT_POLICY.EDIT.EDIT_BUTTON'
    );
    const base = wrapper.findComponent({ name: 'BaseInfo' });
    await base.vm.$emit('validationChange', { isValid: true });
    expect(wrapper.emitted('validationChange')).toEqual([[{ isValid: true }]]);
    expect(submitButton(wrapper).vm.$attrs.disabled).toBe(false);

    await base.vm.$emit('update:policyName', 'Fair');
    await base.vm.$emit('update:description', 'Spread work');
    await cards(wrapper)[3].vm.$emit('select', 'longest_waiting');
    const fair = wrapper.findComponent({ name: 'FairDistribution' });
    await fair.vm.$emit('update:fairDistributionLimit', 5);
    await fair.vm.$emit('update:fairDistributionWindow', 60);
    await fair.vm.$emit('update:windowUnit', 'minutes');
    expect(duration(wrapper).props('modelValue')).toBe(168 * 60);
    await duration(wrapper).vm.$emit('update:modelValue', 150);
    await duration(wrapper).vm.$emit('update:unit', 'hours');
    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('submit')[0][0]).toMatchObject({
      name: 'Fair',
      description: 'Spread work',
      conversationPriority: 'longest_waiting',
      fairDistributionLimit: 5,
      fairDistributionWindow: 60,
      windowUnit: 'minutes',
      excludeOlderThanHours: 3,
    });

    await duration(wrapper).vm.$emit('update:modelValue', null);
    expect(duration(wrapper).props('modelValue')).toBeNull();

    wrapper.vm.resetForm();
    await wrapper.vm.$nextTick();
    expect(duration(wrapper).props('modelValue')).toBe(168 * 60);
    expect(cards(wrapper)[2].props('isActive')).toBe(true);

    await wrapper.setProps({ isLoading: true });
    expect(submitButton(wrapper).vm.$attrs.disabled).toBe(true);
  });

  it('picks the threshold unit from loaded data', async () => {
    const wrapper = mountForm({
      initialData: { name: 'Odd', excludeOlderThanHours: 25 },
    });
    expect(duration(wrapper).props('unit')).toBe('hours');
    await wrapper.setProps({
      initialData: { name: 'Even', excludeOlderThanHours: 48 },
    });
    expect(duration(wrapper).props('unit')).toBe('days');
    await wrapper.setProps({
      initialData: { name: 'None', excludeOlderThanHours: null },
    });
    expect(duration(wrapper).props()).toMatchObject({
      unit: 'days',
      modelValue: null,
    });
  });

  it('adds, deletes and opens inboxes', async () => {
    const wrapper = mountForm({
      showInboxSection: true,
      policyInboxes: [{ id: 1 }],
      inboxList: [{ id: 2 }],
      isInboxLoading: true,
    });
    await wrapper
      .findComponent({ name: 'AddDataDropdown' })
      .vm.$emit('add', { id: 2 });
    const table = wrapper.findComponent({ name: 'DataTable' });
    expect(table.props('isFetching')).toBe(true);
    await table.vm.$emit('delete', 1);
    await table.vm.$emit('navigate', { id: 1 });
    expect(wrapper.emitted('addInbox')).toEqual([[{ id: 2 }]]);
    expect(wrapper.emitted('deleteInbox')).toEqual([[1]]);
    expect(wrapper.emitted('navigateToInbox')).toEqual([[{ id: 1 }]]);
    expect(mountForm().findComponent({ name: 'DataTable' }).exists()).toBe(
      false
    );
  });
});
