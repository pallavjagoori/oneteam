/**
 * OneTeam behaviour spec for the automation wait condition extras.
 *
 * Covers rebuilding the wait while keeping extra conditions and their
 * connector, adding an inbox and private note to a rebuilt reply wait,
 * inserting the private note when a saved incoming wait turns into an
 * outgoing one, and resetting validation on the extra rows.
 */
import { h, nextTick } from 'vue';
import { shallowMount } from '@vue/test-utils';
import NextButton from 'dashboard/components-next/button/Button.vue';
import FilterSelect from 'dashboard/components-next/filter/inputs/FilterSelect.vue';
import MultiSelect from 'dashboard/components-next/filter/inputs/MultiSelect.vue';
import { DURATION_UNITS } from 'dashboard/components-next/input/constants';
import AutomationWaitCondition from '../AutomationWaitCondition.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

const env = vi.hoisted(() => ({ resets: [] }));

const ConditionRow = {
  name: 'ConditionRow',
  setup(_, { expose }) {
    const resetValidation = vi.fn();
    env.resets.push(resetValidation);
    expose({ validate: () => true, resetValidation });
    return () => h('li');
  },
};

/**
 * Builds a condition.
 *
 * @param {string} key attribute key
 * @param {*} values condition values
 * @param {string|null} queryOperator connector after it
 * @returns {object}
 */
const condition = (key, values, queryOperator = 'and') => ({
  attribute_key: key,
  filter_operator: 'equal_to',
  values,
  query_operator: queryOperator,
  custom_attribute_type: '',
});

/**
 * Mounts a saved wait.
 *
 * @param {string} eventName saved event
 * @param {object[]} conditions saved conditions
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountWait = (eventName, conditions, extra = {}) =>
  shallowMount(AutomationWaitCondition, {
    props: {
      eventName,
      conditions,
      delay: 60,
      unit: DURATION_UNITS.MINUTES,
      statusOptions: [{ value: 'pending', label: 'Pending' }],
      inboxOptions: [{ id: 7, name: 'Support' }],
      filterTypes: [],
      removeFilter: vi.fn(),
      isSavedWait: true,
      ...extra,
    },
    global: { stubs: { ConditionRow } },
  });

/**
 * Returns the latest emitted conditions.
 *
 * @param {import('@vue/test-utils').VueWrapper} wrapper mounted wait
 * @returns {object[]}
 */
const lastConditions = wrapper =>
  wrapper.emitted('update:conditions').at(-1)[0];

describe('AutomationWaitCondition extras', () => {
  beforeEach(() => {
    env.resets = [];
  });

  it('rebuilds the wait keeping extra conditions and their connector', async () => {
    const wrapper = mountWait('message_created', [
      condition('status', 'open', 'or'),
      condition('assignee_id', '', null),
    ]);
    await nextTick();

    wrapper
      .findComponent(MultiSelect)
      .vm.$emit('update:modelValue', [{ id: 7, name: 'Support' }]);
    await nextTick();
    expect(lastConditions(wrapper)).toEqual([
      condition('status', 'pending'),
      condition('inbox_id', [7], 'or'),
      condition('assignee_id', '', null),
    ]);

    wrapper.vm.resetValidation();
    expect(env.resets.at(-1)).toHaveBeenCalled();

    wrapper
      .findAllComponents(FilterSelect)[0]
      .vm.$emit('update:modelValue', 'customer_unresponsive');
    await nextTick();
    expect(wrapper.emitted('update:eventName').at(-1)).toEqual([
      'message_created',
    ]);
    expect(lastConditions(wrapper)).toEqual([
      condition('message_type', 'outgoing'),
      condition('private_note', [false]),
      condition('inbox_id', [7]),
    ]);
  });

  it('inserts the private note when an incoming wait becomes outgoing', async () => {
    const wrapper = mountWait('message_created', [
      condition('message_type', 'incoming', null),
    ]);
    await nextTick();
    wrapper
      .findAllComponents(FilterSelect)[0]
      .vm.$emit('update:modelValue', 'customer_unresponsive');
    await nextTick();
    expect(lastConditions(wrapper)).toEqual([
      condition('message_type', 'outgoing'),
      condition('private_note', [false], null),
    ]);
  });

  it('replaces a saved inbox and anchors a new one after the message type', async () => {
    const saved = mountWait('message_created', [
      condition('message_type', 'incoming'),
      condition('inbox_id', [{ id: 7 }, 8], null),
    ]);
    await nextTick();
    saved.findComponent(MultiSelect).vm.$emit('update:modelValue', [
      { id: 7, name: 'Support' },
      { id: 8, name: 'Sales' },
    ]);
    await nextTick();
    expect(lastConditions(saved)).toEqual([
      condition('message_type', 'incoming'),
      condition('inbox_id', [7, 8], null),
    ]);

    const fresh = mountWait('message_created', [
      condition('message_type', 'incoming', null),
    ]);
    await nextTick();
    fresh
      .findComponent(MultiSelect)
      .vm.$emit('update:modelValue', [{ id: 7, name: 'Support' }]);
    await nextTick();
    expect(lastConditions(fresh)).toEqual([
      condition('message_type', 'incoming'),
      condition('inbox_id', [7], null),
    ]);
  });

  it('defaults the status, delay and validation and shows the error', async () => {
    const wrapper = mountWait('conversation_updated', [], {
      delay: null,
      hasError: true,
      inboxOptions: [{ id: 7, name: 'Support' }],
    });
    await nextTick();
    expect(wrapper.findAllComponents(FilterSelect)[1].props('modelValue')).toBe(
      'pending'
    );
    expect(wrapper.vm.validate()).toBe(true);
    expect(wrapper.text()).toContain('AUTOMATION.ADD.FORM.WAIT.ERROR');
  });

  it('adds the first selectable filter with its model, or nothing', async () => {
    const filter = (attributeKey, attributeModel, disabled = false) => ({
      attributeKey,
      attributeModel,
      disabled,
      filterOperators: [{ value: 'equal_to' }],
    });
    const wrapper = mountWait(
      'message_created',
      [condition('message_type', 'incoming', null)],
      {
        filterTypes: [
          filter('labels', 'standard', true),
          filter('tier', 'conversation_attribute'),
        ],
      }
    );
    await nextTick();
    wrapper.findComponent(NextButton).vm.$emit('click');
    await nextTick();
    expect(lastConditions(wrapper).at(-1)).toMatchObject({
      attribute_key: 'tier',
      custom_attribute_type: 'conversation_attribute',
    });

    const plain = mountWait(
      'message_created',
      [condition('message_type', 'incoming', null)],
      { filterTypes: [filter('labels', undefined)] }
    );
    await nextTick();
    plain.findComponent(NextButton).vm.$emit('click');
    await nextTick();
    expect(lastConditions(plain).at(-1).custom_attribute_type).toBe('');

    const standard = mountWait(
      'message_created',
      [condition('message_type', 'incoming', null)],
      { filterTypes: [filter('assignee_id', 'standard')] }
    );
    await nextTick();
    standard.findComponent(NextButton).vm.$emit('click');
    await nextTick();
    expect(lastConditions(standard).at(-1).custom_attribute_type).toBe('');

    const none = mountWait(
      'message_created',
      [condition('message_type', 'incoming', null)],
      { filterTypes: [filter('labels', 'standard', true)] }
    );
    await nextTick();
    none.findComponent(NextButton).vm.$emit('click');
    expect(none.emitted('update:conditions')).toBeUndefined();
  });
});
