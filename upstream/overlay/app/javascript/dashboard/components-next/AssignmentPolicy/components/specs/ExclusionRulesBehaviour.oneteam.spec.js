/**
 * OneTeam behaviour spec for the capacity policy's exclusion rules.
 *
 * Covers listing excluded labels and offering the rest, adding and
 * removing labels, the hover state, picking the duration unit that fits
 * the saved minutes (days, hours, minutes, or minutes when empty), the
 * 1 minute to 999 day limits, and passing duration changes up.
 */
import { mount } from '@vue/test-utils';
import ExclusionRules from '../ExclusionRules.vue';

const LabelItem = {
  name: 'LabelItem',
  props: { label: Object, isHovered: Boolean },
  emits: ['remove', 'hover'],
  template: '<span class="label">{{ label.title }}</span>',
};
const AddDataDropdown = {
  name: 'AddDataDropdown',
  props: ['label', 'searchPlaceholder', 'items'],
  emits: ['add'],
  template: '<button class="add" />',
};
const DurationInput = {
  name: 'DurationInput',
  props: ['modelValue', 'unit', 'min', 'max'],
  emits: ['update:modelValue', 'update:unit'],
  template: '<input class="duration" />',
};

const tagsList = [
  { id: 1, name: 'vip', color: 'red' },
  { id: 2, name: 'spam' },
  { id: 3, name: 'billing' },
];

const mountRules = (excludedLabels, minutes = null) => {
  const wrapper = mount(ExclusionRules, {
    props: {
      tagsList,
      excludedLabels,
      excludeOlderThanMinutes: minutes,
      'onUpdate:excludedLabels': value =>
        wrapper.setProps({ excludedLabels: value }),
      'onUpdate:excludeOlderThanMinutes': value =>
        wrapper.setProps({ excludeOlderThanMinutes: value }),
    },
    global: { stubs: { LabelItem, AddDataDropdown, DurationInput } },
  });
  return wrapper;
};

const labels = wrapper => wrapper.findAllComponents(LabelItem);
const dropdown = wrapper => wrapper.findComponent(AddDataDropdown);
const duration = wrapper => wrapper.findComponent(DurationInput);

describe('ExclusionRules behaviour', () => {
  it('lists excluded labels and adds or removes them', async () => {
    const wrapper = mountRules(['vip']);
    expect(labels(wrapper)[0].props('label')).toEqual({
      id: 1,
      title: 'vip',
      name: 'vip',
      color: 'red',
    });
    expect(
      dropdown(wrapper)
        .props('items')
        .map(l => l.id)
    ).toEqual([2, 3]);
    expect(dropdown(wrapper).props('label')).toBe(
      'ASSIGNMENT_POLICY.AGENT_CAPACITY_POLICY.FORM.EXCLUSION_RULES.TAGS.ADD_TAG'
    );

    await dropdown(wrapper).vm.$emit('add', tagsList[1]);
    expect(wrapper.props('excludedLabels')).toEqual(['vip', 'spam']);
    expect(labels(wrapper).map(l => l.text())).toEqual(['vip', 'spam']);

    await labels(wrapper)[0].vm.$emit(
      'remove',
      labels(wrapper)[0].props('label')
    );
    expect(wrapper.props('excludedLabels')).toEqual(['spam']);
  });

  it('highlights the hovered label until the pointer leaves', async () => {
    const wrapper = mountRules(['vip', 'spam']);
    await labels(wrapper)[1].vm.$emit('hover');
    expect(labels(wrapper).map(l => l.props('isHovered'))).toEqual([
      false,
      true,
    ]);
    await wrapper.find('.flex-wrap').trigger('mouseleave');
    expect(labels(wrapper).map(l => l.props('isHovered'))).toEqual([
      false,
      false,
    ]);
  });

  it.each([
    [2880, 'days'],
    [120, 'hours'],
    [45, 'minutes'],
    [null, 'minutes'],
  ])('shows %s minutes in %s', async (minutes, unit) => {
    const wrapper = mountRules([], minutes);
    await wrapper.vm.$nextTick();
    expect(duration(wrapper).props()).toMatchObject({
      modelValue: minutes,
      unit,
      min: 1,
      max: 1438560,
    });
  });

  it('passes duration and unit changes through', async () => {
    const wrapper = mountRules([], 60);
    await duration(wrapper).vm.$emit('update:modelValue', 90);
    expect(wrapper.props('excludeOlderThanMinutes')).toBe(90);
    await duration(wrapper).vm.$emit('update:unit', 'days');
    expect(duration(wrapper).props('unit')).toBe('days');
  });
});
