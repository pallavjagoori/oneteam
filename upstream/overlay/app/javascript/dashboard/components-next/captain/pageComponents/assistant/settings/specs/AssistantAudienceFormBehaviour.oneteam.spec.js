/**
 * OneTeam behaviour spec for the Captain assistant audience form.
 *
 * Covers loading a saved audience into the condition tree (nested groups,
 * a single bare condition, every value input type, unknown options and
 * attributes), switching between "everyone" and "specific", the empty
 * audience error and its reset, group validation, and the submitted
 * audience payload for each value shape.
 */
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import AssistantAudienceForm from '../AssistantAudienceForm.vue';

const env = vi.hoisted(() => ({ valid: true }));

vi.mock('../audience/useAudienceFilterTypes.js', async () => {
  const { ref } = await import('vue');
  return {
    useAudienceFilterTypes: () => ({
      filterTypes: ref([
        {
          attributeKey: 'labels',
          inputType: 'multiSelect',
          attributeModel: 'standard',
          options: [{ id: 'vip', name: 'VIP' }],
        },
        {
          attributeKey: 'country_code',
          inputType: 'searchSelect',
          attributeModel: 'additional',
          options: [{ id: 'IN', name: 'India' }],
        },
        {
          attributeKey: 'blocked',
          inputType: 'booleanSelect',
          options: [{ id: true, name: 'Yes' }],
        },
        { attributeKey: 'email', inputType: 'plainText' },
      ]),
    }),
  };
});

const RadioCard = {
  name: 'RadioCard',
  props: { id: String, isActive: Boolean },
  emits: ['select'],
  template: '<div class="card"><slot /></div>',
};
const AudienceGroup = {
  name: 'AudienceGroup',
  props: ['modelValue', 'filterTypes', 'isRoot'],
  emits: ['update:modelValue'],
  methods: { validate: () => env.valid },
  template: '<div class="group" />',
};
const Button = {
  name: 'Button',
  props: ['label'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')" />',
};

const mountForm = assistant =>
  mount(AssistantAudienceForm, {
    props: assistant === undefined ? {} : { assistant },
    global: { stubs: { RadioCard, AudienceGroup, Button } },
  });

const group = wrapper => wrapper.findComponent(AudienceGroup);
const submit = async wrapper => {
  await wrapper.findComponent(Button).trigger('click');
  return wrapper.emitted('submit')?.at(-1)?.[0];
};
const strip = node =>
  node.conditions
    ? { ...node, id: undefined, conditions: node.conditions.map(strip) }
    : { ...node, id: undefined };

describe('Assistant audience form behaviour', () => {
  beforeEach(() => {
    env.valid = true;
  });

  it('defaults to everyone and submits a null audience', async () => {
    const wrapper = mountForm({ config: { tone: 'friendly' } });
    const cards = wrapper.findAllComponents(RadioCard);
    expect(cards[0].props('isActive')).toBe(true);
    expect(group(wrapper).exists()).toBe(false);
    expect(await submit(wrapper)).toEqual({
      config: { tone: 'friendly', audience: null },
    });
  });

  it('copes with the default assistant and a null assistant', async () => {
    expect(await submit(mountForm())).toEqual({ config: { audience: null } });
    const wrapper = mountForm({});
    await wrapper.setProps({ assistant: null });
    expect(wrapper.findAllComponents(RadioCard)[0].props('isActive')).toBe(
      true
    );
  });

  it('hydrates a nested audience for every input type', () => {
    const wrapper = mountForm({
      config: {
        audience: {
          operator: 'or',
          conditions: [
            {
              attribute_key: 'labels',
              filter_operator: 'equal_to',
              values: ['vip', 'new'],
            },
            {
              attribute_key: 'country_code',
              filter_operator: 'equal_to',
              values: ['IN'],
            },
            {
              attribute_key: 'country_code',
              filter_operator: 'equal_to',
              values: 'XX',
            },
            {
              attribute_key: 'blocked',
              filter_operator: 'equal_to',
              values: [true],
            },
            {
              conditions: [
                {
                  attribute_key: 'email',
                  filter_operator: 'contains',
                  values: [],
                },
              ],
            },
            {
              attribute_key: 'unknown',
              filter_operator: 'equal_to',
              values: ['a'],
            },
            { conditions: null },
          ],
        },
      },
    });
    expect(wrapper.findAllComponents(RadioCard)[1].props('isActive')).toBe(
      true
    );
    const tree = group(wrapper).props('modelValue');
    expect(tree.id).toMatch(/^audience-root-/);
    expect(strip(tree)).toEqual({
      id: undefined,
      operator: 'or',
      conditions: [
        {
          id: undefined,
          attributeKey: 'labels',
          filterOperator: 'equal_to',
          values: [
            { id: 'vip', name: 'VIP' },
            { id: 'new', name: 'new' },
          ],
          attributeModel: 'standard',
        },
        {
          id: undefined,
          attributeKey: 'country_code',
          filterOperator: 'equal_to',
          values: { id: 'IN', name: 'India' },
          attributeModel: 'additional',
        },
        {
          id: undefined,
          attributeKey: 'country_code',
          filterOperator: 'equal_to',
          values: { id: 'XX', name: 'XX' },
          attributeModel: 'additional',
        },
        {
          id: undefined,
          attributeKey: 'blocked',
          filterOperator: 'equal_to',
          values: { id: true, name: 'Yes' },
          attributeModel: 'standard',
        },
        {
          id: undefined,
          operator: 'and',
          conditions: [
            {
              id: undefined,
              attributeKey: 'email',
              filterOperator: 'contains',
              values: '',
              attributeModel: 'standard',
            },
          ],
        },
        {
          id: undefined,
          attributeKey: 'unknown',
          filterOperator: 'equal_to',
          values: 'a',
          attributeModel: 'standard',
        },
        { id: undefined, operator: 'and', conditions: [] },
      ],
    });
  });

  it('wraps a single saved condition in a root group', () => {
    const wrapper = mountForm({
      config: {
        audience: {
          attribute_key: 'email',
          filter_operator: 'contains',
          values: ['@acme'],
        },
      },
    });
    const tree = group(wrapper).props('modelValue');
    expect(tree.operator).toBe('and');
    expect(tree.conditions[0]).toMatchObject({
      attributeKey: 'email',
      values: '@acme',
    });
  });

  it('requires at least one condition for a specific audience', async () => {
    const wrapper = mountForm({ config: {} });
    await wrapper.findAllComponents(RadioCard)[1].vm.$emit('select');
    expect(await submit(wrapper)).toBeUndefined();
    expect(wrapper.text()).toContain(
      'CAPTAIN.ASSISTANTS.FORM.AUDIENCE.EMPTY_ERROR'
    );
    const tree = group(wrapper).props('modelValue');
    await group(wrapper).vm.$emit('update:modelValue', {
      ...tree,
      conditions: [
        {
          id: 'c',
          attributeKey: 'email',
          filterOperator: 'contains',
          values: 'x',
        },
      ],
    });
    await nextTick();
    expect(wrapper.text()).not.toContain('EMPTY_ERROR');
    await wrapper.findAllComponents(RadioCard)[0].vm.$emit('select');
    expect(group(wrapper).exists()).toBe(false);
  });

  it('stops when the condition group is invalid', async () => {
    env.valid = false;
    const wrapper = mountForm({
      config: {
        audience: {
          attribute_key: 'email',
          filter_operator: 'contains',
          values: ['x'],
        },
      },
    });
    expect(await submit(wrapper)).toBeUndefined();
  });

  it('serializes every value shape', async () => {
    const wrapper = mountForm({ config: { audience: { conditions: [] } } });
    const leaf = (attributeKey, values) => ({
      id: attributeKey,
      attributeKey,
      filterOperator: 'equal_to',
      values,
    });
    await group(wrapper).vm.$emit('update:modelValue', {
      id: 'r',
      operator: 'or',
      conditions: [
        leaf('labels', [{ id: 'vip', name: 'VIP' }]),
        leaf('tags', ['a', 'b']),
        leaf('country_code', { id: 'IN', name: 'India' }),
        leaf('email', ''),
        leaf('phone', null),
        leaf('city', undefined),
        leaf('age', 30),
        { id: 'g', operator: 'and', conditions: [leaf('email', 'x')] },
      ],
    });
    expect((await submit(wrapper)).config.audience).toEqual({
      operator: 'or',
      conditions: [
        {
          attribute_key: 'labels',
          filter_operator: 'equal_to',
          values: ['vip'],
        },
        {
          attribute_key: 'tags',
          filter_operator: 'equal_to',
          values: ['a', 'b'],
        },
        {
          attribute_key: 'country_code',
          filter_operator: 'equal_to',
          values: ['IN'],
        },
        { attribute_key: 'email', filter_operator: 'equal_to', values: [] },
        { attribute_key: 'phone', filter_operator: 'equal_to', values: [] },
        { attribute_key: 'city', filter_operator: 'equal_to', values: [] },
        { attribute_key: 'age', filter_operator: 'equal_to', values: [30] },
        {
          operator: 'and',
          conditions: [
            {
              attribute_key: 'email',
              filter_operator: 'equal_to',
              values: ['x'],
            },
          ],
        },
      ],
    });
  });
});
