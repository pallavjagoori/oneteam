/**
 * OneTeam behaviour spec for the automation monitor picker.
 *
 * Covers choosing a monitor, the invalid state, the fetch error with
 * retry, the empty state linking to monitors, a saved monitor that no
 * longer exists (named or unnamed), and the help text.
 */
import { mount } from '@vue/test-utils';
import AutomationMonitorSelect from '../AutomationMonitorSelect.vue';

vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({
    accountScopedRoute: name => ({ name, params: { accountId: 1 } }),
  }),
}));

const RouterLink = {
  name: 'RouterLink',
  props: ['to'],
  template: '<a><slot /></a>',
};
const options = [
  { id: 1, name: 'Uptime' },
  { id: 2, name: 'Latency' },
];

/**
 * Mounts the picker.
 *
 * @param {object} props Picker props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountSelect = props =>
  mount(AutomationMonitorSelect, {
    props,
    global: {
      stubs: { RouterLink, Icon: true },
      mocks: { $t: key => key },
    },
  });

describe('AutomationMonitorSelect behaviour', () => {
  it('chooses a monitor and shows help', async () => {
    const wrapper = mountSelect({
      options,
      modelValue: null,
      'onUpdate:modelValue': () => {},
    });
    const select = wrapper.get('select');
    expect(select.attributes('disabled')).toBeUndefined();
    expect(wrapper.findAll('option')).toHaveLength(3);
    await select.setValue('2');
    expect(wrapper.emitted('update:modelValue')).toEqual([[2]]);
    expect(wrapper.text()).toContain('AUTOMATION.ADD.FORM.MONITOR.HELP');
    expect(wrapper.find('.message').exists()).toBe(false);
  });

  it('flags an invalid choice', () => {
    const wrapper = mountSelect({ options, invalid: true });
    expect(wrapper.get('label').classes()).toContain('error');
    expect(wrapper.get('.message').text()).toBe(
      'AUTOMATION.ADD.FORM.MONITOR.ERROR'
    );
  });

  it('retries after a fetch error', async () => {
    const wrapper = mountSelect({ error: true });
    expect(wrapper.get('[role="alert"]').text()).toContain('FETCH_FAILED');
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('retry')).toHaveLength(1);
  });

  it('links to monitors when there are none', () => {
    const wrapper = mountSelect();
    expect(wrapper.get('select').attributes('disabled')).toBeDefined();
    expect(wrapper.getComponent(RouterLink).props('to')).toEqual({
      name: 'monitor_reports_index',
      params: { accountId: 1 },
    });
  });

  it('disables the select while loading', () => {
    const wrapper = mountSelect({ loading: true, modelValue: 9 });
    expect(wrapper.get('select').attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('AUTOMATION.ADD.FORM.MONITOR.HELP');
  });

  it('keeps a missing saved monitor', () => {
    const named = mountSelect({
      options,
      modelValue: 9,
      selectedName: 'Old monitor',
    });
    const missing = named.get('option[disabled]');
    expect(missing.text()).toBe('Old monitor');
    expect(named.text()).toContain('UNAVAILABLE_HELP');
    expect(
      mountSelect({ options, modelValue: 9 }).get('option[disabled]').text()
    ).toBe('AUTOMATION.ADD.FORM.MONITOR.UNAVAILABLE');
  });
});
