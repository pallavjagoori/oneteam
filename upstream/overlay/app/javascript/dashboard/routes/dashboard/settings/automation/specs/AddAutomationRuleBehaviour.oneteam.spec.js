/**
 * OneTeam behaviour spec for the add automation rule wrapper.
 *
 * Covers the initial fetches, opening with a fresh rule or a monitor
 * rule, closing, and relaying saves.
 */
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import AddAutomationRule from '../AddAutomationRule.vue';

const env = vi.hoisted(() => ({
  dispatch: vi.fn(),
  automation: null,
  manifest: vi.fn(),
  open: vi.fn(),
  close: vi.fn(),
}));

vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: env.dispatch }),
}));
vi.mock('dashboard/composables/useAutomation', () => ({
  useAutomation: () => {
    env.automation = ref({});
    return {
      automation: env.automation,
      automationTypes: {},
      manifestCustomAttributes: env.manifest,
    };
  },
}));

/**
 * Mounts the wrapper.
 *
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountRule = () =>
  mount(AddAutomationRule, {
    global: {
      stubs: {
        AutomationRuleForm: {
          name: 'AutomationRuleForm',
          props: ['automation', 'mode'],
          emits: ['save'],
          methods: {
            open: (...args) => env.open(...args),
            close: () => env.close(),
          },
          template: '<form />',
        },
      },
    },
  });

describe('AddAutomationRule behaviour', () => {
  it('fetches resources and opens a fresh rule', () => {
    const wrapper = mountRule();
    expect(env.dispatch.mock.calls.map(([name]) => name)).toEqual([
      'inboxes/get',
      'agents/get',
      'contacts/get',
      'teams/get',
      'labels/get',
      'campaigns/get',
    ]);
    wrapper.vm.open();
    expect(env.automation.value.event_name).toBe('conversation_created');
    expect(env.automation.value.conditions).toHaveLength(1);
    expect(env.manifest).toHaveBeenCalled();
    expect(env.open).toHaveBeenCalledWith(null);
    wrapper.vm.close();
    expect(env.close).toHaveBeenCalled();
  });

  it('opens a monitor rule without conditions', () => {
    const wrapper = mountRule();
    wrapper.vm.open(30, '5');
    expect(env.automation.value).toMatchObject({
      event_name: 'monitor_matched',
      monitor_id: 5,
      conditions: [],
    });
    expect(env.open).toHaveBeenCalledWith(30);
  });

  it('relays saves', () => {
    const wrapper = mountRule();
    wrapper
      .findComponent({ name: 'AutomationRuleForm' })
      .vm.$emit('save', { name: 'Rule' }, 'create');
    expect(wrapper.emitted('saveAutomation')).toEqual([
      [{ name: 'Rule' }, 'create'],
    ]);
  });
});
