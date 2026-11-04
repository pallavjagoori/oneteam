/**
 * OneTeam behaviour spec for the instant automation trigger section.
 *
 * Covers changing the event, the event error and reset message, the
 * condition rows and their query operators, removing and appending
 * conditions, and validation through the condition rows.
 */
import { mount } from '@vue/test-utils';
import AutomationInstantTrigger from '../AutomationInstantTrigger.vue';

const env = vi.hoisted(() => ({ valid: true, reset: vi.fn() }));

const ConditionRow = {
  name: 'ConditionRow',
  props: {
    attributeKey: String,
    queryOperator: String,
    showQueryOperator: Boolean,
  },
  emits: ['remove', 'update:queryOperator'],
  methods: {
    validate: () => env.valid,
    resetValidation: () => env.reset(),
  },
  template: '<li />',
};

/**
 * Mounts the section.
 *
 * @param {object} props extra props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountTrigger = props =>
  mount(AutomationInstantTrigger, {
    props: {
      events: [
        { key: 'conversation_created', value: 'Created' },
        { key: 'message_created', value: 'Message' },
      ],
      filterTypes: [],
      appendNewCondition: vi.fn(),
      removeFilter: vi.fn(),
      onEventChange: vi.fn(),
      eventName: 'conversation_created',
      conditions: [],
      ...props,
    },
    global: {
      mocks: { $t: key => key },
      stubs: {
        ConditionRow,
        NextButton: {
          emits: ['click'],
          template: '<button @click="$emit(\'click\')" />',
        },
      },
    },
  });

describe('AutomationInstantTrigger behaviour', () => {
  it('changes the event and shows errors and the reset message', async () => {
    const wrapper = mountTrigger({
      errors: { event_name: true, condition_0: true },
      showResetMessage: true,
    });
    expect(wrapper.text()).toContain('AUTOMATION.ADD.FORM.EVENT.ERROR');
    expect(wrapper.text()).toContain('AUTOMATION.FORM.RESET_MESSAGE');
    expect(wrapper.find('ul').classes()).toContain('outline-n-ruby-5');
    await wrapper.find('select').setValue('message_created');
    expect(wrapper.emitted('update:eventName')).toEqual([['message_created']]);
    expect(wrapper.props('onEventChange')).toHaveBeenCalled();
    expect(wrapper.vm.validate()).toBe(true);
  });

  it('renders condition rows and validates them', async () => {
    const conditions = [
      { attribute_key: 'status', query_operator: 'and' },
      { attribute_key: 'priority', query_operator: 'and' },
    ];
    const wrapper = mountTrigger({ conditions });
    expect(wrapper.find('ul').classes()).toContain('outline-n-weak');
    const rows = wrapper.findAllComponents(ConditionRow);
    expect(rows.map(row => row.props('showQueryOperator'))).toEqual([
      false,
      true,
    ]);
    rows[1].vm.$emit('update:queryOperator', 'or');
    expect(conditions[0].query_operator).toBe('or');
    rows[0].vm.$emit('remove');
    rows[1].vm.$emit('remove');
    expect(wrapper.props('removeFilter').mock.calls).toEqual([[0], [1]]);
    await wrapper.find('button').trigger('click');
    expect(wrapper.props('appendNewCondition')).toHaveBeenCalled();
    env.valid = false;
    expect(wrapper.vm.validate()).toBe(false);
    wrapper.vm.resetValidation();
    expect(env.reset).toHaveBeenCalledTimes(2);
  });
});
