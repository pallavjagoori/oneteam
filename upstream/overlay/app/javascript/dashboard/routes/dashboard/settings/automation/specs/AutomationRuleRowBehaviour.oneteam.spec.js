/**
 * OneTeam behaviour spec for one row in the automation rules table.
 *
 * Covers the name, monitor problem badges (paused, deleted,
 * unavailable) that also lock the toggle, the delay badge, the monitor
 * link and description, the created date, toggling the rule and the
 * edit, clone and delete actions. Chatwoot quirk: the toggle emits
 * `status` as the negation of the switch's new value.
 */
import { mount } from '@vue/test-utils';
import AutomationRuleRow from '../AutomationRuleRow.vue';

vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({
    accountScopedRoute: (name, params) => ({ name, params }),
  }),
}));

const passthrough = name => ({ name, template: '<div><slot /></div>' });
const Label = {
  name: 'Label',
  props: ['label', 'color'],
  template: '<span class="label">{{ label }}<slot name="icon" /></span>',
};
const ToggleSwitch = {
  name: 'Switch',
  props: ['modelValue', 'disabled'],
  emits: ['update:modelValue'],
  template: '<button class="switch" />',
};
const HoverActions = {
  name: 'HoverActions',
  props: ['actions', 'loading'],
  emits: ['action'],
  template: '<div class="actions"><slot /></div>',
};
const RouterLink = {
  name: 'RouterLink',
  props: ['to'],
  template: '<a class="monitor"><slot /></a>',
};

const base = {
  id: 4,
  name: 'Auto assign',
  active: true,
  created_on: 1772618400,
};

const mountRow = (automation, loading = false) =>
  mount(AutomationRuleRow, {
    props: { automation: { ...base, ...automation }, loading },
    global: {
      stubs: {
        BaseTableRow: passthrough('BaseTableRow'),
        BaseTableCell: passthrough('BaseTableCell'),
        Label,
        Switch: ToggleSwitch,
        HoverActions,
        RouterLink,
        Icon: { props: ['icon'], template: '<i :data-icon="icon" />' },
      },
    },
  });

describe('AutomationRuleRow behaviour', () => {
  it('shows a plain rule with its date', () => {
    const wrapper = mountRow({});
    expect(wrapper.text()).toContain('Auto assign');
    expect(wrapper.findAll('.label')).toHaveLength(0);
    expect(wrapper.find('.monitor').exists()).toBe(false);
    expect(wrapper.findComponent(ToggleSwitch).props()).toEqual({
      modelValue: true,
      disabled: false,
    });
    const date = wrapper.find('.actions span');
    expect(date.text()).toBe('Mar 4, 2026');
    expect(date.attributes('title')).toContain('Mar 4, 2026');
  });

  it.each([
    ['paused', 'AUTOMATION.LIST.MONITOR_PAUSED'],
    ['deleted', 'AUTOMATION.LIST.MONITOR_DELETED'],
    ['unavailable', 'AUTOMATION.LIST.MONITOR_UNAVAILABLE'],
  ])('flags a %s monitor and locks the toggle', (availability, label) => {
    const wrapper = mountRow({ monitor_availability: availability });
    expect(wrapper.find('.label').text()).toBe(label);
    expect(wrapper.findComponent(ToggleSwitch).props('disabled')).toBe(true);
  });

  it('shows the delay, monitor link and description', () => {
    const wrapper = mountRow({
      execution_delay: 3600,
      monitor_id: 8,
      monitor_name: 'Website',
      description: 'Routes VIPs',
    });
    const labels = wrapper.findAll('.label').map(l => l.text());
    expect(labels).toEqual(['AUTOMATION.LIST.DELAY_BADGE', 'Website']);
    expect(wrapper.find('[data-icon="i-lucide-timer"]').exists()).toBe(true);
    expect(wrapper.findComponent(RouterLink).props('to')).toEqual({
      name: 'monitor_reports_show',
      params: { monitorId: 8 },
    });
    expect(wrapper.find('.bg-n-weak').exists()).toBe(true);
    expect(wrapper.text()).toContain('Routes VIPs');
  });

  it('shows a description without a monitor', () => {
    const wrapper = mountRow({ description: 'Tags spam' });
    expect(wrapper.find('.monitor').exists()).toBe(false);
    expect(wrapper.find('.bg-n-weak').exists()).toBe(false);
    expect(wrapper.text()).toContain('Tags spam');
  });

  it('toggles the rule and runs row actions', async () => {
    const wrapper = mountRow({}, true);
    await wrapper
      .findComponent(ToggleSwitch)
      .vm.$emit('update:modelValue', false);
    expect(wrapper.emitted('toggle')[0]).toEqual([
      { id: 4, name: 'Auto assign', status: true },
    ]);

    const actions = wrapper.findComponent(HoverActions);
    expect(actions.props('loading')).toBe(true);
    expect(actions.props('actions').map(a => a.key)).toEqual([
      'edit',
      'clone',
      'delete',
    ]);
    await actions.vm.$emit('action', 'edit');
    await actions.vm.$emit('action', 'clone');
    await actions.vm.$emit('action', 'delete');
    ['edit', 'clone', 'delete'].forEach(event => {
      expect(wrapper.emitted(event)[0][0]).toMatchObject({ id: 4 });
    });
  });
});
