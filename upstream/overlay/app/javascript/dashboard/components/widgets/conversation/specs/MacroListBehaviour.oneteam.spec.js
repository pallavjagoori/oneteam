/**
 * OneTeam behaviour spec for the macro picker in the reply box.
 *
 * Covers loading macros only when none are cached, filtering by the
 * search (including an initial search and nameless macros), the action
 * count, previewing resolved actions with optional values, selecting a
 * macro, and forwarding close and remove-trigger events.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import MacroList from '../MacroList.vue';

const macros = ref([]);
const dispatch = vi.fn();

vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch }),
  useMapGetter: () => ref({ isFetching: true }),
}));
vi.mock('dashboard/composables/useOrderedMacros', () => ({
  useOrderedMacros: () => ({ orderedMacros: macros }),
}));
vi.mock('dashboard/composables/useMacros', () => ({
  useMacros: () => ({
    resolveMacroActions: () => [
      { actionName: 'ADD_LABEL', actionValue: 'vip' },
      { actionName: 'RESOLVE_CONVERSATION' },
    ],
  }),
}));

const Picker = {
  name: 'CaretAnchoredPicker',
  props: ['items', 'search', 'isLoading'],
  emits: ['select', 'close', 'removeTrigger', 'update:search'],
  template:
    '<div><slot name="preview" :item="items[0]" /><slot name="preview" :item="null" /></div>',
};
const mountList = searchKey =>
  mount(MacroList, {
    props: { searchKey },
    global: { stubs: { CaretAnchoredPicker: Picker } },
  });

describe('MacroList behaviour', () => {
  it('filters, previews and selects macros', async () => {
    macros.value = [
      { id: 1, name: 'Close VIP', actions: [{}, {}] },
      { id: 2, name: 'Escalate', actions: [] },
      { id: 3, actions: [] },
    ];
    const wrapper = mountList(' vip ');
    expect(dispatch).not.toHaveBeenCalled();
    const picker = wrapper.findComponent(Picker);
    expect(picker.props('isLoading')).toBe(true);
    expect(picker.props('items')).toEqual([
      {
        id: 1,
        macro: macros.value[0],
        label: 'Close VIP',
        title: 'Close VIP',
        subtitle: 'CONVERSATION.PICKER.MACRO.ACTION_COUNT',
      },
    ]);
    expect(wrapper.text()).toContain('MACROS.ACTIONS.ADD_LABEL');
    expect(wrapper.text()).toContain('vip');
    expect(wrapper.text()).toContain('MACROS.ACTIONS.RESOLVE_CONVERSATION');

    await picker.vm.$emit('update:search', '');
    expect(picker.props('items')).toHaveLength(2);
    picker.vm.$emit('select', picker.props('items')[1]);
    picker.vm.$emit('close');
    picker.vm.$emit('removeTrigger');
    expect(wrapper.emitted('selectMacro')).toEqual([[macros.value[1]]]);
    expect(wrapper.emitted('close')).toHaveLength(1);
    expect(wrapper.emitted('removeTrigger')).toHaveLength(1);
  });

  it('loads macros when none are cached', () => {
    macros.value = [];
    mount(MacroList, {
      global: { stubs: { CaretAnchoredPicker: { template: '<div />' } } },
    });
    expect(dispatch).toHaveBeenCalledWith('macros/get');
  });
});
