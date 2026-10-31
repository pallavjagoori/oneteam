/**
 * OneTeam behaviour spec for the picker anchored to the editor caret.
 *
 * Covers the caret anchor style, placing the card above or below the caret
 * with clamped height, width limits with and without a preview, the side,
 * stacked and hidden preview layouts, LTR and RTL inline offsets, keyboard
 * shortcuts (tab navigation, escape, backspace removing the trigger),
 * selecting items, resetting the selection when items change, slots, and
 * closing on an outside click.
 */
import { computed, h, ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import CaretAnchoredPicker from '../CaretAnchoredPicker.vue';

const env = vi.hoisted(() => ({
  state: {},
  shortcuts: null,
  list: null,
  outside: null,
  resize: null,
  bounds: null,
  window: null,
  scroll: null,
}));

vi.mock('@vueuse/core', async () => {
  const { ref: appRef } = await import('vue');
  return {
    useElementBounding: () => env.bounds,
    useResizeObserver: (target, callback) => {
      env.resize = { target, callback };
    },
    useWindowSize: () => {
      env.window = { width: appRef(1200), height: appRef(800) };
      return env.window;
    },
  };
});
vi.mock('@vueuse/components', () => ({
  vOnClickOutside: {
    mounted: (el, binding) => {
      env.outside = binding.value;
    },
  },
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: name => computed(() => env.state[name]),
}));
vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: shortcuts => {
    env.shortcuts = shortcuts;
  },
}));
vi.mock('dashboard/composables/useKeyboardNavigableList', () => ({
  useKeyboardNavigableList: options => {
    env.list = options;
    return {
      moveSelectionDown: () => {
        options.selectedIndex.value += 1;
      },
      moveSelectionUp: () => {
        options.selectedIndex.value -= 1;
      },
    };
  },
}));

const PreviewPicker = {
  name: 'PreviewPicker',
  props: [
    'items',
    'selectedIndex',
    'search',
    'previewLayout',
    'isLoading',
    'emptyLabel',
    'searchPlaceholder',
  ],
  emits: ['select', 'update:selectedIndex', 'update:search'],
  methods: { scrollSelectedIntoView: () => env.scroll() },
  template: `<div class="picker">
    <slot name="leading" :item="items[0]" />
    <slot name="filters" />
    <slot name="preview" :item="items[0]" />
  </div>`,
};

const items = [{ id: 1 }, { id: 2 }];
const setBounds = ({
  top = 500,
  bottom = 520,
  left = 100,
  right = 900,
  width = 800,
} = {}) => {
  env.bounds = {
    top: ref(top),
    bottom: ref(bottom),
    left: ref(left),
    right: ref(right),
    width: ref(width),
    update: vi.fn(),
  };
};

const mountPicker = ({ props = {}, slots = {} } = {}) =>
  mount(CaretAnchoredPicker, {
    props: { items, ...props },
    slots,
    attachTo: document.body,
    global: {
      stubs: {
        PreviewPicker,
        TeleportWithDirection: { template: '<div><slot /></div>' },
      },
    },
  });
const picker = wrapper => wrapper.findComponent(PreviewPicker);
const style = wrapper => picker(wrapper).attributes('style');
const keyEvent = () => ({ preventDefault: vi.fn() });

describe('CaretAnchoredPicker behaviour', () => {
  let wrapper;
  beforeEach(() => {
    env.state = { 'accounts/isRTL': false };
    env.scroll = vi.fn();
    setBounds();
  });
  afterEach(() => wrapper?.unmount());

  it('anchors to the caret and places the list above when there is more room', () => {
    wrapper = mountPicker({
      props: { caretPosition: { top: 40, height: 18 } },
    });
    expect(wrapper.find('div').attributes('style')).toBe(
      'top: 40px; height: 18px;'
    );
    expect(style(wrapper)).toContain('inset-inline-start: 100px');
    expect(style(wrapper)).toContain('width: 420px');
    expect(style(wrapper)).toContain('max-height: 360px');
    expect(style(wrapper)).toContain('bottom: 308px');
    expect(style(wrapper)).not.toContain('min-height');
    expect(picker(wrapper).props('previewLayout')).toBe('none');
    expect(env.resize.target()).toBe(wrapper.find('div').element.parentElement);
    expect(env.resize.callback).toBe(env.bounds.update);
  });

  it('defaults the caret anchor and places the list below', () => {
    setBounds({ top: 100, bottom: 120 });
    wrapper = mountPicker();
    expect(wrapper.find('div').attributes('style')).toBe(
      'top: 0px; height: 0px;'
    );
    expect(style(wrapper)).toContain('top: 128px');
  });

  it('lays the preview out beside, stacked or not at all', async () => {
    const preview = { preview: ({ item }) => h('p', `preview ${item.id}`) };
    wrapper = mountPicker({ slots: preview });
    expect(picker(wrapper).props('previewLayout')).toBe('side');
    expect(style(wrapper)).toContain('width: 768px');
    expect(style(wrapper)).toContain('min-height: 200px');
    expect(wrapper.text()).toContain('preview 1');
    wrapper.unmount();

    setBounds({ width: 400 });
    wrapper = mountPicker({ slots: preview });
    expect(picker(wrapper).props('previewLayout')).toBe('stacked');
    wrapper.unmount();

    setBounds({ width: 400, top: 200, bottom: 220 });
    wrapper = mountPicker({ slots: preview });
    env.window.height.value = 400;
    await flushPromises();
    expect(picker(wrapper).props('previewLayout')).toBe('none');
  });

  it('keeps the card inside the viewport and measures from the right in RTL', async () => {
    setBounds({ left: 1100, width: 800 });
    wrapper = mountPicker();
    expect(style(wrapper)).toContain('inset-inline-start: 764px');
    env.bounds.left.value = 0;
    await flushPromises();
    expect(style(wrapper)).toContain('inset-inline-start: 16px');
    wrapper.unmount();

    env.state['accounts/isRTL'] = true;
    setBounds({ right: 1000 });
    wrapper = mountPicker();
    expect(style(wrapper)).toContain('inset-inline-start: 200px');
  });

  it('clamps the height to zero without room', async () => {
    setBounds({ top: 0, bottom: 900 });
    wrapper = mountPicker();
    expect(style(wrapper)).toContain('max-height: 0px');
  });

  it('navigates with tab, closes with escape and removes the trigger', async () => {
    wrapper = mountPicker();
    const tab = keyEvent();
    env.shortcuts.Tab.action(tab);
    expect(tab.preventDefault).toHaveBeenCalled();
    await flushPromises();
    expect(picker(wrapper).props('selectedIndex')).toBe(1);
    env.shortcuts['Shift+Tab'].action(keyEvent());
    await flushPromises();
    expect(picker(wrapper).props('selectedIndex')).toBe(0);
    env.shortcuts.Escape.action(keyEvent());
    expect(wrapper.emitted('close')).toHaveLength(1);

    const backspace = keyEvent();
    env.shortcuts.Backspace.action(backspace);
    expect(backspace.preventDefault).toHaveBeenCalled();
    expect(wrapper.emitted('removeTrigger')).toHaveLength(1);
    await picker(wrapper).vm.$emit('update:search', 'ab');
    const typing = keyEvent();
    env.shortcuts.Backspace.action(typing);
    expect(typing.preventDefault).not.toHaveBeenCalled();
    expect(wrapper.emitted('removeTrigger')).toHaveLength(1);
    expect(wrapper.emitted('update:search')).toEqual([['ab']]);
  });

  it('selects items from the list or the keyboard', async () => {
    wrapper = mountPicker();
    await picker(wrapper).vm.$emit('select', 1);
    expect(wrapper.emitted('select')).toEqual([[items[1]]]);
    env.list.onSelect();
    expect(wrapper.emitted('select').at(-1)).toEqual([items[1]]);
    await picker(wrapper).vm.$emit('update:selectedIndex', 5);
    env.list.onSelect();
    expect(wrapper.emitted('select')).toHaveLength(2);
    env.list.adjustScroll();
    expect(env.scroll).toHaveBeenCalled();
  });

  it('resets the selection when items change', async () => {
    wrapper = mountPicker();
    await picker(wrapper).vm.$emit('update:selectedIndex', 1);
    await wrapper.setProps({ items: [{ id: 3 }] });
    await flushPromises();
    expect(picker(wrapper).props('selectedIndex')).toBe(0);
    expect(env.scroll).toHaveBeenCalled();
  });

  it('renders leading and filter slots and closes on outside click', () => {
    wrapper = mountPicker({
      slots: {
        leading: ({ item }) => h('b', `lead ${item.id}`),
        filters: () => h('i', 'filters'),
      },
    });
    expect(wrapper.text()).toContain('lead 1');
    expect(wrapper.text()).toContain('filters');
    env.outside();
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
