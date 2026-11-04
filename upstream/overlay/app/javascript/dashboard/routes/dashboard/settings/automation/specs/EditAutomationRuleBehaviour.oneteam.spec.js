/**
 * OneTeam behaviour spec for the edit automation rule wrapper.
 *
 * Covers formatting the selected rule, ignoring rules without
 * conditions, opening with a rule's execution delay, closing, and
 * relaying saves.
 */
import { mount } from '@vue/test-utils';
import { computed, ref } from 'vue';
import EditAutomationRule from '../EditAutomationRule.vue';

const env = vi.hoisted(() => ({
  automation: null,
  manifest: vi.fn(),
  format: vi.fn(),
  open: vi.fn(),
  close: vi.fn(),
}));

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => computed(() => [{ key: 'plan' }]),
}));
vi.mock('dashboard/composables/useAutomation', () => ({
  useAutomation: () => {
    env.automation = ref({});
    return {
      automation: env.automation,
      automationTypes: { types: true },
      manifestCustomAttributes: env.manifest,
    };
  },
}));
vi.mock('dashboard/composables/useEditableAutomation', () => ({
  useEditableAutomation: () => ({ formatAutomation: env.format }),
}));

/**
 * Mounts the wrapper.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountRule = props =>
  mount(EditAutomationRule, {
    props,
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

describe('EditAutomationRule behaviour', () => {
  it('formats the selected rule and reopens with another', () => {
    env.format.mockImplementation(source => ({ formatted: source.name }));
    const wrapper = mountRule({
      selectedResponse: { name: 'A', conditions: [] },
    });
    expect(env.automation.value).toEqual({ formatted: 'A' });
    expect(env.format.mock.calls[0].slice(1, 3)).toEqual([
      [{ key: 'plan' }],
      { types: true },
    ]);
    expect(env.manifest).toHaveBeenCalled();
    wrapper.vm.open({ name: 'B', conditions: [], execution_delay: 60 });
    expect(env.automation.value).toEqual({ formatted: 'B' });
    expect(env.open).toHaveBeenCalledWith(60);
    wrapper.vm.close();
    expect(env.close).toHaveBeenCalled();
  });

  it('ignores rules without conditions and relays saves', () => {
    const wrapper = mountRule();
    wrapper.vm.open();
    expect(env.format).not.toHaveBeenCalled();
    expect(env.open).toHaveBeenCalledWith(undefined);
    wrapper
      .findComponent({ name: 'AutomationRuleForm' })
      .vm.$emit('save', { id: 1 }, 'edit');
    expect(wrapper.emitted('saveAutomation')).toEqual([[{ id: 1 }, 'edit']]);
  });
});
