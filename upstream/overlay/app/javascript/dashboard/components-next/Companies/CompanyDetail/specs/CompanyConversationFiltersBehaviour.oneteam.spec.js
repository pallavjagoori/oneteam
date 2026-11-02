/**
 * OneTeam behaviour spec for the company conversation filter popover.
 *
 * Covers loading agents, the button label with and without active
 * filters, opening and closing the popover (button and outside click),
 * offering only the simple filters the context provides (without the
 * "all" option), showing the selected value, setting, replacing and
 * clearing a filter, and clearing all filters.
 */
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import CompanyConversationFilters from '../CompanyConversationFilters.vue';

const dispatch = vi.fn();
let outside;

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key, args) => (args ? `${key} ${args.count}` : key),
  }),
}));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch }),
}));
vi.mock('@vueuse/core', () => ({
  useToggle: () => {
    const state = ref(false);
    return [
      state,
      value => {
        state.value = typeof value === 'boolean' ? value : !state.value;
      },
    ];
  },
}));
vi.mock('@vueuse/components', () => ({
  vOnClickOutside: {
    mounted(_, binding) {
      outside = binding.value;
    },
  },
}));
vi.mock('dashboard/components-next/filter/provider', () => ({
  useConversationFilterContext: () => ({
    attributeFilterTypes: ref([
      {
        attributeKey: 'status',
        label: 'Status',
        options: [{ id: 'all' }, { id: 'open' }, { id: 'resolved' }],
      },
      { attributeKey: 'browser', label: 'Browser', options: [] },
      { attributeKey: 'labels', label: 'Labels', options: [{ id: 'vip' }] },
    ]),
  }),
}));

const Button = {
  name: 'Button',
  props: { label: String, faded: Boolean },
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};
const SingleSelect = {
  name: 'SingleSelect',
  props: ['modelValue', 'options', 'placeholder'],
  emits: ['update:modelValue'],
  template: '<div class="select" />',
};

let wrapper;
const mountFilters = (modelValue = []) =>
  mount(CompanyConversationFilters, {
    props: {
      modelValue,
      'onUpdate:modelValue': value => wrapper.setProps({ modelValue: value }),
    },
    global: { stubs: { Button, SingleSelect } },
  });
const toggle = () => wrapper.findAll('button')[0];
const selects = () => wrapper.findAllComponents(SingleSelect);

describe('CompanyConversationFilters behaviour', () => {
  it('loads agents and opens and closes the popover', async () => {
    wrapper = mountFilters();
    expect(dispatch).toHaveBeenCalledWith('agents/get');
    expect(toggle().text()).toBe(
      'COMPANIES.DETAIL.CONVERSATION_FILTERS.BUTTON'
    );
    expect(wrapper.findComponent(Button).props('faded')).toBe(true);
    expect(selects()).toHaveLength(0);

    await toggle().trigger('click');
    expect(selects()).toHaveLength(2);
    await toggle().trigger('click');
    expect(selects()).toHaveLength(0);

    await toggle().trigger('click');
    outside[0]();
    await wrapper.vm.$nextTick();
    expect(selects()).toHaveLength(0);
    expect(outside[1].ignore).toHaveLength(1);
  });

  it('offers simple filters and sets, replaces and clears them', async () => {
    wrapper = mountFilters();
    await toggle().trigger('click');
    const [status, labels] = selects();
    expect(wrapper.text()).toContain('Status');
    expect(wrapper.text()).not.toContain('Browser');
    expect(status.props('options')).toEqual([
      { id: 'open' },
      { id: 'resolved' },
    ]);
    expect(status.props('modelValue')).toBeUndefined();

    await status.vm.$emit('update:modelValue', { id: 'open' });
    await labels.vm.$emit('update:modelValue', { id: 'vip' });
    await selects()[0].vm.$emit('update:modelValue', { id: 'resolved' });
    expect(wrapper.props('modelValue')).toEqual([
      {
        attributeKey: 'labels',
        filterOperator: 'equal_to',
        values: [{ id: 'vip' }],
        queryOperator: 'and',
      },
      {
        attributeKey: 'status',
        filterOperator: 'equal_to',
        values: [{ id: 'resolved' }],
        queryOperator: 'and',
      },
    ]);
    expect(selects()[0].props('modelValue')).toEqual({ id: 'resolved' });
    expect(toggle().text()).toBe(
      'COMPANIES.DETAIL.CONVERSATION_FILTERS.BUTTON_WITH_COUNT 2'
    );
    expect(wrapper.findComponent(Button).props('faded')).toBe(false);

    await selects()[1].vm.$emit('update:modelValue', null);
    expect(wrapper.props('modelValue').map(f => f.attributeKey)).toEqual([
      'status',
    ]);

    const clear = wrapper.findAll('button').at(-1);
    expect(clear.text()).toBe('FILTER.CLEAR_BUTTON_LABEL');
    await clear.trigger('click');
    expect(wrapper.props('modelValue')).toEqual([]);
    expect(wrapper.findAll('button')).toHaveLength(1);
  });

  it('shows the first value of a filter without values as none', async () => {
    wrapper = mountFilters([{ attributeKey: 'status' }]);
    await toggle().trigger('click');
    expect(selects()[0].props('modelValue')).toBeUndefined();
    expect(
      mount(CompanyConversationFilters, {
        global: { stubs: { Button, SingleSelect } },
      }).text()
    ).toBe('COMPANIES.DETAIL.CONVERSATION_FILTERS.BUTTON');
  });
});
