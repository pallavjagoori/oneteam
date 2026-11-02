/**
 * OneTeam behaviour spec for the conversation and contact filter panels.
 *
 * Both panels share one shape, so each case runs against both: the title
 * for plain filters versus editing a folder / segment, adding, removing
 * and resetting conditions (removing the last one resets it), chaining
 * the query operator onto the previous row, applying only valid
 * conditions (store filters, applyFilter event, tracking), updating a
 * saved folder / segment (blocked without a name), and closing on an
 * outside click or unmount.
 */
import { flushPromises, mount } from '@vue/test-utils';
import ConversationFilter from '../ConversationFilter.vue';
import ContactsFilter from '../ContactsFilter.vue';

const env = vi.hoisted(() => ({ dispatch: null, track: null, outside: null, valid: true }));

vi.mock('dashboard/composables', () => ({
  useTrack: (...args) => env.track(...args),
}));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
}));
vi.mock('@vueuse/components', () => ({
  vOnClickOutside: {
    mounted: (el, binding) => {
      env.outside = binding.value;
    },
  },
}));
vi.mock('../provider.js', () => ({
  useConversationFilterContext: () => ({ attributeFilterTypes: ['conversation'] }),
}));
vi.mock('../contactProvider.js', () => ({
  useContactFilterContext: () => ({ attributeFilterTypes: ['contact'] }),
}));

const ConditionRow = {
  name: 'ConditionRow',
  props: ['attributeKey', 'filterOperator', 'queryOperator', 'values', 'filterTypes', 'showQueryOperator'],
  emits: ['remove', 'update:queryOperator', 'update:attributeKey'],
  methods: { validate: () => env.valid },
  template: '<li class="row" :data-key="attributeKey" :data-query="queryOperator" />',
};
const Button = {
  name: 'NextButton',
  props: { disabled: Boolean },
  emits: ['click'],
  template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
};
const Input = {
  name: 'Input',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
};

const panels = [
  {
    name: 'conversation',
    component: ConversationFilter,
    savedProp: 'isFolderView',
    nameProp: 'folderName',
    title: ['FILTER.TITLE', 'FILTER.EDIT_CUSTOM_FILTER'],
    defaultKey: 'status',
    storeAction: 'setConversationFilters',
    updateEvent: 'updateFolder',
    labels: { add: 'FILTER.ADD_NEW_FILTER', clear: 'FILTER.CLEAR_BUTTON_LABEL', apply: 'FILTER.SUBMIT_BUTTON_LABEL', update: 'FILTER.UPDATE_BUTTON_LABEL' },
    ignore: '#toggleConversationFilterButton',
  },
  {
    name: 'contacts',
    component: ContactsFilter,
    savedProp: 'isSegmentView',
    nameProp: 'segmentName',
    title: ['CONTACTS_LAYOUT.FILTER.TITLE', 'CONTACTS_LAYOUT.FILTER.EDIT_SEGMENT'],
    defaultKey: 'name',
    storeAction: 'contacts/setContactFilters',
    updateEvent: 'updateSegment',
    labels: {
      add: 'CONTACTS_LAYOUT.FILTER.BUTTONS.ADD_FILTER',
      clear: 'CONTACTS_LAYOUT.FILTER.BUTTONS.CLEAR_FILTERS',
      apply: 'CONTACTS_LAYOUT.FILTER.BUTTONS.APPLY_FILTERS',
      update: 'CONTACTS_LAYOUT.FILTER.BUTTONS.UPDATE_SEGMENT',
    },
    ignore: '#toggleContactsFilterButton',
  },
];

describe.each(panels)('$name filter panel behaviour', panel => {
  const mountPanel = (props = {}) => {
    const filters = [
      { attributeKey: 'priority', filterOperator: 'equal_to', values: ['high'], queryOperator: 'or' },
    ];
    const wrapper = mount(panel.component, {
      props: {
        modelValue: filters,
        'onUpdate:modelValue': value => wrapper.setProps({ modelValue: value }),
        ...props,
      },
      global: { stubs: { ConditionRow, NextButton: Button, Button, Input }, mocks: { $t: key => key } },
    });
    return wrapper;
  };
  const button = (wrapper, label) => wrapper.findAll('button').find(b => b.text() === label);
  const rows = wrapper => wrapper.findAllComponents(ConditionRow);

  beforeEach(() => {
    env.dispatch = vi.fn();
    env.track = vi.fn();
    env.valid = true;
  });

  it('adds, chains, removes and resets conditions', async () => {
    const wrapper = mountPanel();
    expect(wrapper.find('h3').text()).toBe(panel.title[0]);
    expect(rows(wrapper)[0].props('showQueryOperator')).toBe(false);
    await button(wrapper, panel.labels.add).trigger('click');
    expect(rows(wrapper)).toHaveLength(2);
    expect(rows(wrapper)[1].props('attributeKey')).toBe(panel.defaultKey);
    expect(rows(wrapper)[1].props('queryOperator')).toBe('or');
    rows(wrapper)[1].vm.$emit('update:queryOperator', 'and');
    await flushPromises();
    expect(wrapper.props('modelValue')[0].queryOperator).toBe('and');

    rows(wrapper)[1].vm.$emit('remove');
    await flushPromises();
    expect(rows(wrapper)).toHaveLength(1);
    rows(wrapper)[0].vm.$emit('remove');
    await flushPromises();
    expect(rows(wrapper)[0].props('attributeKey')).toBe(panel.defaultKey);

    await button(wrapper, panel.labels.add).trigger('click');
    await button(wrapper, panel.labels.clear).trigger('click');
    await flushPromises();
    expect(rows(wrapper)).toHaveLength(1);
  });

  it('applies only valid filters', async () => {
    const wrapper = mountPanel();
    env.valid = false;
    await button(wrapper, panel.labels.apply).trigger('click');
    expect(env.dispatch).not.toHaveBeenCalled();
    env.valid = true;
    await button(wrapper, panel.labels.apply).trigger('click');
    expect(env.dispatch.mock.calls[0][0]).toBe(panel.storeAction);
    expect(env.dispatch.mock.calls[0][1][0]).toMatchObject({ attribute_key: 'priority', query_operator: 'or' });
    expect(wrapper.emitted('applyFilter')[0][0][0].attributeKey).toBe('priority');
    expect(env.track.mock.calls[0][1]).toEqual({
      appliedFilters: [{ key: 'priority', operator: 'equal_to', queryOperator: 'or' }],
    });
  });

  it('updates a saved view once it has a name', async () => {
    const wrapper = mountPanel({ [panel.savedProp]: true, [panel.nameProp]: '' });
    expect(wrapper.find('h3').text()).toBe(panel.title[1]);
    expect(button(wrapper, panel.labels.apply)).toBeUndefined();
    expect(button(wrapper, panel.labels.update).attributes('disabled')).toBeDefined();
    await wrapper.find('input').setValue('Escalations');
    env.valid = false;
    await button(wrapper, panel.labels.update).trigger('click');
    expect(wrapper.emitted(panel.updateEvent)).toBeUndefined();
    env.valid = true;
    await button(wrapper, panel.labels.update).trigger('click');
    expect(wrapper.emitted(panel.updateEvent)[0][1]).toBe('Escalations');
  });

  it('closes on an outside click and on unmount', () => {
    const onClose = vi.fn();
    const wrapper = mountPanel({ onClose });
    expect(env.outside[1]).toEqual({ ignore: [panel.ignore] });
    env.outside[0]();
    expect(onClose).toHaveBeenCalledTimes(1);
    wrapper.unmount();
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
