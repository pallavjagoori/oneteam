/**
 * OneTeam behaviour spec for one filter condition row.
 *
 * Covers the query operator select, picking the value input for every
 * input type (and operator overrides), resetting values and operator when
 * the attribute changes, async search (debounced, stale, aborted and
 * failed responses), validation with error display and reset, and the
 * remove button.
 */
import { mount, flushPromises } from '@vue/test-utils';
import ConditionRow from '../ConditionRow.vue';

vi.mock('@chatwoot/utils', async importOriginal => ({
  ...(await importOriginal()),
  debounce: fn => fn,
}));

const field = (name, props = []) => ({
  name,
  props: ['modelValue', 'options', ...props],
  emits: ['update:modelValue', 'search'],
  template: `<div class="${name}" />`,
});
const stubs = {
  FilterSelect: field('FilterSelect'),
  MultiSelect: field('MultiSelect'),
  SingleSelect: {
    ...field('SingleSelect'),
    props: {
      modelValue: null,
      options: null,
      asyncSearch: Boolean,
      isSearching: Boolean,
      searchPlaceholder: String,
    },
  },
  MultiTextInput: field('MultiTextInput', ['placeholder']),
  TextArea: field('TextArea', ['maxLength', 'placeholder']),
  Input: field('Input', ['type', 'maxlength', 'placeholder']),
  Button: {
    name: 'Button',
    emits: ['click'],
    template: '<button @click="$emit(\'click\', $event)" />',
  },
};

const withInput = [{ value: 'equal_to', hasInput: true }];
const filterTypes = [
  {
    attributeKey: 'status',
    inputType: 'multiSelect',
    options: [{ id: 'open' }],
    filterOperators: withInput,
  },
  {
    attributeKey: 'team',
    inputType: 'searchSelect',
    options: [{ id: 1 }],
    filterOperators: withInput,
  },
  {
    attributeKey: 'contact',
    inputType: 'asyncSearchSelect',
    searchPlaceholder: 'Find contact',
    searchOptions: vi.fn(),
    filterOperators: withInput,
  },
  {
    attributeKey: 'vip',
    inputType: 'booleanSelect',
    filterOperators: withInput,
  },
  {
    attributeKey: 'emails',
    inputType: 'multiText',
    filterOperators: withInput,
  },
  {
    attributeKey: 'notes',
    inputType: 'longText',
    maxLength: 500,
    placeholder: 'Notes',
    filterOperators: withInput,
  },
  { attributeKey: 'created', inputType: 'date', filterOperators: withInput },
  {
    attributeKey: 'age',
    inputType: 'number',
    filterOperators: [
      { value: 'equal_to', hasInput: true },
      { value: 'days_before', hasInput: true },
      { value: 'is_present', hasInput: false },
      { value: 'contains', hasInput: true, inputOverride: 'multiText' },
    ],
  },
  {
    attributeKey: 'name',
    inputType: 'plainText',
    maxLength: 20,
    filterOperators: withInput,
  },
];

const mountRow = props => {
  let wrapper;
  const listeners = Object.fromEntries(
    ['attributeKey', 'filterOperator', 'values', 'queryOperator'].map(key => [
      `onUpdate:${key}`,
      value => wrapper.setProps({ [key]: value }),
    ])
  );
  wrapper = mount(ConditionRow, {
    props: {
      filterTypes,
      attributeKey: 'name',
      filterOperator: 'equal_to',
      values: '',
      ...listeners,
      ...props,
    },
    global: { stubs },
  });
  return wrapper;
};
const selects = wrapper => wrapper.findAllComponents({ name: 'FilterSelect' });
const only = (wrapper, name) => wrapper.findComponent({ name });

describe('ConditionRow behaviour', () => {
  it('shows the query operator only when asked', async () => {
    expect(selects(mountRow())).toHaveLength(2);
    const wrapper = mountRow({ showQueryOperator: true, queryOperator: 'and' });
    expect(selects(wrapper)).toHaveLength(3);
    expect(
      selects(wrapper)[0]
        .props('options')
        .map(o => o.value)
    ).toEqual(['and', 'or']);
    await selects(wrapper)[0].vm.$emit('update:modelValue', 'or');
    expect(wrapper.props('queryOperator')).toBe('or');
  });

  it('picks the input for each attribute type', () => {
    expect(
      only(
        mountRow({ attributeKey: 'status', values: [] }),
        'MultiSelect'
      ).props('options')
    ).toEqual([{ id: 'open' }]);
    expect(
      only(
        mountRow({ attributeKey: 'team', values: {} }),
        'SingleSelect'
      ).props('options')
    ).toEqual([{ id: 1 }]);
    const contact = only(
      mountRow({ attributeKey: 'contact', values: {} }),
      'SingleSelect'
    );
    expect(contact.props('asyncSearch')).toBe(true);
    expect(contact.props('searchPlaceholder')).toBe('Find contact');
    const vip = only(
      mountRow({ attributeKey: 'vip', values: {} }),
      'SingleSelect'
    );
    expect(vip.props('options').map(o => o.id)).toEqual([true, false]);
    expect(
      only(
        mountRow({ attributeKey: 'emails', values: [] }),
        'MultiTextInput'
      ).props('placeholder')
    ).toBe('FILTER.MULTI_VALUE_INPUT_PLACEHOLDER');
    expect(
      only(
        mountRow({ attributeKey: 'emails', values: ['a'] }),
        'MultiTextInput'
      ).props('placeholder')
    ).toBe('FILTER.MULTI_VALUE_INPUT_PLACEHOLDER_SHORT');
    const notes = only(mountRow({ attributeKey: 'notes' }), 'TextArea');
    expect(notes.props('maxLength')).toBe(500);
    expect(notes.props('placeholder')).toBe('Notes');
    expect(
      only(mountRow({ attributeKey: 'created' }), 'Input').props('type')
    ).toBe('date');
    expect(only(mountRow({ attributeKey: 'age' }), 'Input').props('type')).toBe(
      'number'
    );
    const name = only(mountRow(), 'Input');
    expect(name.props('type')).toBe('text');
    expect(name.props('maxlength')).toBe(20);
    expect(name.props('placeholder')).toBe('FILTER.INPUT_PLACEHOLDER');
  });

  it('follows operators, overrides and operators without input', () => {
    expect(
      only(
        mountRow({
          attributeKey: 'age',
          filterOperator: 'contains',
          values: [],
        }),
        'MultiTextInput'
      ).exists()
    ).toBe(true);
    const absent = mountRow({
      attributeKey: 'age',
      filterOperator: 'is_present',
    });
    expect(only(absent, 'Input').exists()).toBe(false);
    expect(absent.findAll('li > div > div').at(-1).classes()).toContain(
      'contents'
    );
    expect(
      only(
        mountRow({ attributeKey: 'age', filterOperator: 'unknown' }),
        'Input'
      ).exists()
    ).toBe(true);
  });

  it('resets values and operator when the attribute changes', async () => {
    const wrapper = mountRow({
      attributeKey: 'age',
      filterOperator: 'days_before',
      values: '5',
    });
    const attribute = () => selects(wrapper)[0];
    const cases = [
      ['status', []],
      ['emails', []],
      ['team', {}],
      ['contact', {}],
      ['vip', {}],
      ['name', ''],
    ];
    await cases.reduce(async (previous, [key, expected]) => {
      await previous;
      await attribute().vm.$emit('update:modelValue', key);
      expect(wrapper.props('values')).toEqual(expected);
      expect(wrapper.props('filterOperator')).toBe('equal_to');
    }, Promise.resolve());
  });

  it('searches async options and ignores stale or aborted results', async () => {
    const { searchOptions } = filterTypes[2];
    const wrapper = mountRow({ attributeKey: 'contact', values: {} });
    const select = () => only(wrapper, 'SingleSelect');

    let resolveFirst;
    searchOptions.mockImplementationOnce(
      () =>
        new Promise(r => {
          resolveFirst = r;
        })
    );
    select().vm.$emit('search', 'jo');
    await flushPromises();
    expect(select().props('isSearching')).toBe(true);
    searchOptions.mockResolvedValueOnce([{ id: 2, name: 'John' }]);
    select().vm.$emit('search', 'joh');
    await flushPromises();
    expect(select().props('options')).toEqual([{ id: 2, name: 'John' }]);
    expect(select().props('isSearching')).toBe(false);
    resolveFirst([{ id: 1, name: 'Stale' }]);
    await flushPromises();
    expect(select().props('options')).toEqual([{ id: 2, name: 'John' }]);

    searchOptions.mockResolvedValueOnce(null);
    select().vm.$emit('search', 'jane');
    await flushPromises();
    expect(select().props('options')).toEqual([{ id: 2, name: 'John' }]);
    expect(select().props('isSearching')).toBe(false);

    searchOptions.mockRejectedValueOnce(new Error('offline'));
    select().vm.$emit('search', 'x');
    await flushPromises();
    expect(select().props('options')).toEqual([]);

    searchOptions.mockResolvedValueOnce([{ id: 3 }]);
    select().vm.$emit('search', '  ');
    expect(select().props('isSearching')).toBeFalsy();
    await flushPromises();
    expect(select().props('options')).toEqual([{ id: 3 }]);
  });

  it('validates, shows errors and resets them', async () => {
    const wrapper = mountRow();
    expect(wrapper.vm.validate()).toBe(false);
    await flushPromises();
    expect(wrapper.find('span').text()).toBe('FILTER.ERRORS.VALUE_REQUIRED');
    expect(wrapper.find('div').classes()).toContain('animate-wiggle');
    await wrapper.setProps({ values: 'Jane' });
    expect(wrapper.find('span').exists()).toBe(false);
    expect(wrapper.vm.validate()).toBe(true);
    await wrapper.setProps({ values: '' });
    wrapper.vm.validate();
    await flushPromises();
    expect(wrapper.find('span').exists()).toBe(true);
    wrapper.vm.resetValidation();
    await flushPromises();
    expect(wrapper.find('span').exists()).toBe(false);
  });

  it('aligns multi-text rows to the top and emits remove', async () => {
    const wrapper = mountRow({ attributeKey: 'emails', values: [] });
    expect(wrapper.find('div').classes()).toContain('items-start');
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('remove')).toHaveLength(1);
  });
});
