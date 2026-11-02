/**
 * OneTeam behaviour spec for the bulk "run macro" picker on the
 * conversation list.
 *
 * Covers loading macros when the picker opens (not when it closes), the
 * loading state, picking a macro and its confirmation footer, cancelling,
 * running it (blocked while one is running) and dismissing on an outside
 * click.
 */
import { computed, ref } from 'vue';
import { mount } from '@vue/test-utils';
import BulkMacroActions from '../BulkMacroActions.vue';

const env = vi.hoisted(() => ({
  uiFlags: {},
  macros: null,
  dispatch: null,
  outside: null,
}));

vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
  useMapGetter: () => computed(() => env.uiFlags),
}));
vi.mock('dashboard/composables/useOrderedMacros', () => ({
  useOrderedMacros: () => ({ orderedMacros: env.macros }),
}));
vi.mock('@vueuse/core', async importOriginal => {
  const { ref: appRef } = await import('vue');
  return {
    ...(await importOriginal()),
    useToggle: initial => {
      const state = appRef(initial);
      const toggle = value => {
        state.value = typeof value === 'boolean' ? value : !state.value;
      };
      return [state, toggle];
    },
  };
});
vi.mock('@vueuse/components', () => ({
  vOnClickOutside: {
    mounted: (el, binding) => {
      [env.outside] = binding.value;
    },
  },
}));

const Button = {
  name: 'Button',
  props: ['label', 'disabled', 'isLoading'],
  emits: ['click'],
  template:
    '<button :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
};
const DropdownMenu = {
  name: 'DropdownMenu',
  props: ['menuItems', 'isLoading'],
  emits: ['action'],
  template: '<div class="menu"><slot name="footer" /></div>',
};
const I18nT = {
  name: 'I18nT',
  props: ['keypath', 'plural'],
  template:
    '<p :data-key="keypath"><slot name="n" /> <slot name="macroName" /></p>',
};

const mountActions = () =>
  mount(BulkMacroActions, {
    props: { conversationCount: 3 },
    global: {
      stubs: { Button, DropdownMenu, I18nT },
      directives: { tooltip: {} },
    },
  });
const menu = wrapper => wrapper.findComponent(DropdownMenu);
const footerButton = (wrapper, label) =>
  wrapper.findAll('.menu button').find(b => b.text() === label);
const toggle = wrapper => wrapper.find('button').trigger('click');

describe('Bulk macro actions behaviour', () => {
  beforeEach(() => {
    env.outside = null;
    env.uiFlags = { isFetching: false, isExecuting: false };
    env.macros = ref([
      { id: 1, name: 'Close spam' },
      { id: 2, name: 'Escalate' },
    ]);
    env.dispatch = vi.fn();
  });

  it('loads macros on open and runs the picked one', async () => {
    const wrapper = mountActions();
    await toggle(wrapper);
    expect(env.dispatch).toHaveBeenCalledWith('macros/get');
    expect(wrapper.find('button').classes()).toContain('bg-n-alpha-2');
    expect(menu(wrapper).props('menuItems')).toEqual([
      { action: 'select', value: 1, label: 'Close spam', isSelected: false },
      { action: 'select', value: 2, label: 'Escalate', isSelected: false },
    ]);
    expect(wrapper.find('[data-key]').exists()).toBe(false);

    await menu(wrapper).vm.$emit('action', { value: 2 });
    expect(menu(wrapper).props('menuItems')[1].isSelected).toBe(true);
    const label = wrapper.find('[data-key]');
    expect(label.text()).toBe('3 Escalate');

    await footerButton(wrapper, 'BULK_ACTION.CANCEL').trigger('click');
    expect(wrapper.find('[data-key]').exists()).toBe(false);

    await menu(wrapper).vm.$emit('action', { value: 1 });
    await footerButton(wrapper, 'BULK_ACTION.YES').trigger('click');
    expect(wrapper.emitted('execute')[0]).toEqual([
      { id: 1, name: 'Close spam' },
    ]);
    expect(menu(wrapper).exists()).toBe(false);
  });

  it('closes without reloading and dismisses on outside click', async () => {
    const wrapper = mountActions();
    await toggle(wrapper);
    await toggle(wrapper);
    expect(env.dispatch).toHaveBeenCalledTimes(1);
    expect(menu(wrapper).exists()).toBe(false);

    await toggle(wrapper);
    await menu(wrapper).vm.$emit('action', { value: 1 });
    env.outside();
    await wrapper.vm.$nextTick();
    expect(menu(wrapper).exists()).toBe(false);
    await toggle(wrapper);
    expect(wrapper.find('[data-key]').exists()).toBe(false);
  });

  it('shows loading and blocks running while a macro runs', async () => {
    env.uiFlags = { isFetching: true, isExecuting: true };
    env.macros.value = [];
    const wrapper = mountActions();
    await toggle(wrapper);
    expect(menu(wrapper).props('isLoading')).toBe(true);

    env.macros.value = [{ id: 1, name: 'Close spam' }];
    await wrapper.vm.$nextTick();
    expect(menu(wrapper).props('isLoading')).toBe(false);
    await menu(wrapper).vm.$emit('action', { value: 1 });
    const run = footerButton(wrapper, 'BULK_ACTION.YES');
    expect(run.attributes('disabled')).toBeDefined();
    wrapper.findAllComponents(Button).at(-1).vm.$emit('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('execute')).toBeUndefined();
  });
});
