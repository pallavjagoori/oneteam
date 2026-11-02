/**
 * OneTeam behaviour spec for a Captain assistant audience rule group.
 *
 * Covers the match all/any selector, the empty state on the root group,
 * adding conditions and nested groups (only up to the maximum depth),
 * removing conditions, removing a nested group (by its button or when
 * its last condition goes, but never the root), editing a condition
 * through its row, and validating every row and nested group.
 */
import { reactive } from 'vue';
import { mount } from '@vue/test-utils';
import AudienceGroup from '../AudienceGroup.vue';

const env = vi.hoisted(() => ({ valid: {} }));

const ConditionRow = {
  name: 'ConditionRow',
  props: ['attributeKey', 'filterOperator', 'values', 'filterTypes'],
  emits: [
    'remove',
    'update:attributeKey',
    'update:filterOperator',
    'update:values',
  ],
  methods: {
    validate() {
      return env.valid[this.attributeKey] !== false;
    },
  },
  template: '<li class="row">{{ attributeKey }}</li>',
};
const FilterSelect = {
  name: 'FilterSelect',
  props: ['modelValue', 'options'],
  emits: ['update:modelValue'],
  template: '<select class="match" />',
};
const Button = {
  name: 'Button',
  props: ['label', 'icon'],
  emits: ['click'],
  template:
    '<button :data-icon="icon" @click="$emit(\'click\')">{{ label }}</button>',
};

const leaf = (id, key) => ({
  id,
  attributeKey: key,
  filterOperator: 'contains',
  values: '',
  attributeModel: 'standard',
});

const mountGroup = (node, props = {}) =>
  mount(AudienceGroup, {
    props: { modelValue: node, filterTypes: [], isRoot: true, ...props },
    global: {
      stubs: { ConditionRow, FilterSelect, Button, NextButton: Button },
    },
  });

const buttonByLabel = (wrapper, label) =>
  wrapper.findAll('button').filter(b => b.text().endsWith(label));

describe('AudienceGroup behaviour', () => {
  beforeEach(() => {
    env.valid = {};
  });

  it('starts empty and adds conditions and groups', async () => {
    const node = reactive({ operator: 'and', conditions: [] });
    const wrapper = mountGroup(node);
    expect(wrapper.classes()).toContain('rounded-xl');
    expect(wrapper.text()).toContain(
      'CAPTAIN.ASSISTANTS.FORM.AUDIENCE.EMPTY_TITLE'
    );
    expect(
      wrapper
        .findComponent(FilterSelect)
        .props('options')
        .map(o => o.value)
    ).toEqual(['and', 'or']);
    await wrapper
      .findComponent(FilterSelect)
      .vm.$emit('update:modelValue', 'or');
    expect(node.operator).toBe('or');
    expect(wrapper.find('[data-icon="i-lucide-trash"]').exists()).toBe(false);

    await buttonByLabel(wrapper, 'ADD_CONDITION')[0].trigger('click');
    expect(node.conditions[0]).toMatchObject({
      attributeKey: 'email',
      filterOperator: 'contains',
    });
    await buttonByLabel(wrapper, 'ADD_GROUP')[0].trigger('click');
    expect(node.conditions[1]).toMatchObject({ operator: 'and' });
    expect(node.conditions[1].conditions).toHaveLength(1);
    expect(node.conditions[0].id).not.toBe(node.conditions[1].id);

    // The nested group is at the maximum depth, so it cannot add groups.
    const nested = wrapper.find('.bg-n-alpha-1');
    expect(nested.classes()).not.toContain('rounded-xl');
    expect(buttonByLabel(nested, 'ADD_GROUP')).toHaveLength(0);
    await buttonByLabel(nested, 'ADD_CONDITION')[0].trigger('click');
    expect(node.conditions[1].conditions).toHaveLength(2);
  });

  it('edits and removes conditions and nested groups', async () => {
    const node = reactive({
      operator: 'and',
      conditions: [
        leaf('a', 'email'),
        { id: 'g1', operator: 'or', conditions: [leaf('b', 'name')] },
        { id: 'g2', operator: 'and', conditions: [leaf('c', 'city')] },
      ],
    });
    const wrapper = mountGroup(node);
    const rows = () => wrapper.findAllComponents(ConditionRow);
    await rows()[0].vm.$emit('update:attributeKey', 'phone');
    await rows()[0].vm.$emit('update:filterOperator', 'equal_to');
    await rows()[0].vm.$emit('update:values', '+1');
    expect(node.conditions[0]).toMatchObject({
      attributeKey: 'phone',
      filterOperator: 'equal_to',
      values: '+1',
    });

    // Removing the last condition of a nested group removes the group.
    await rows()[1].vm.$emit('remove');
    expect(node.conditions.map(c => c.id)).toEqual(['a', 'g2']);

    await wrapper.find('[data-icon="i-lucide-trash"]').trigger('click');
    expect(node.conditions.map(c => c.id)).toEqual(['a']);

    // The root group stays even when emptied.
    await rows()[0].vm.$emit('remove');
    expect(node.conditions).toEqual([]);
    expect(wrapper.emitted('remove')).toBeUndefined();
  });

  it('validates every row and nested group', () => {
    const node = reactive({
      operator: 'and',
      conditions: [
        leaf('a', 'email'),
        { id: 'g1', operator: 'or', conditions: [leaf('b', 'name')] },
      ],
    });
    const wrapper = mountGroup(node);
    expect(wrapper.vm.validate()).toBe(true);
    env.valid = { name: false };
    expect(wrapper.vm.validate()).toBe(false);
    env.valid = { email: false };
    expect(wrapper.vm.validate()).toBe(false);
    expect(
      mountGroup(reactive({ operator: 'and', conditions: [] })).vm.validate()
    ).toBe(true);
  });
});
