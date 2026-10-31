/**
 * OneTeam behaviour spec for the bulk label picker used on conversation
 * and contact lists.
 *
 * Covers the assign and remove variants (labels, icons, sizes), filtering
 * to applied labels when removing, selecting and unselecting labels with
 * the check mark, applying (only with a selection), dismissing on an
 * outside click, and the disabled/loading button.
 */
import { computed } from 'vue';
import { mount } from '@vue/test-utils';
import BulkLabelActions from '../BulkLabelActions.vue';

const env = vi.hoisted(() => ({ state: {}, outside: null }));

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: name => computed(() => env.state[name]),
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
      env.outside = binding.value;
    },
  },
}));

const NextButton = {
  name: 'NextButton',
  props: ['label', 'icon', 'size', 'disabled', 'isLoading'],
  emits: ['click'],
  template:
    '<button :data-icon="icon" :data-size="size" :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
};
const DropdownMenu = {
  name: 'DropdownMenu',
  props: ['menuItems', 'searchPlaceholder'],
  emits: ['action'],
  template: `<div class="menu">
    <div v-for="item in menuItems" :key="item.id" class="item">
      <slot name="thumbnail" :item="item" />
      <slot name="trailing-icon" :item="item" />
    </div>
    <slot name="footer" />
  </div>`,
};
const Icon = { name: 'Icon', props: ['icon'], template: '<i :class="icon" />' };

const labels = [
  { id: 1, title: 'vip', color: '#f00' },
  { id: 2, title: 'lead', color: '#0f0' },
];

const mountActions = props =>
  mount(BulkLabelActions, {
    props,
    global: {
      stubs: { NextButton, DropdownMenu, Icon },
      directives: {
        tooltip: {
          mounted: (el, b) => {
            el.dataset.tip = b.value;
          },
        },
      },
    },
  });
const trigger = wrapper => wrapper.findAll('button')[0];
const menu = wrapper => wrapper.findComponent(DropdownMenu);
const apply = wrapper => wrapper.find('.menu button');

describe('BulkLabelActions behaviour', () => {
  beforeEach(() => {
    env.state = { 'labels/getLabels': labels };
    env.outside = null;
  });

  it('assigns labels on conversations', async () => {
    const wrapper = mountActions();
    expect(trigger(wrapper).text()).toBe('');
    expect(trigger(wrapper).attributes('data-icon')).toBe('i-lucide-tag');
    expect(trigger(wrapper).attributes('data-size')).toBe('xs');
    expect(trigger(wrapper).attributes('data-tip')).toBe(
      'BULK_ACTION.LABELS.ASSIGN_LABELS'
    );
    expect(menu(wrapper).exists()).toBe(false);
    await trigger(wrapper).trigger('click');
    expect(menu(wrapper).props('menuItems')).toEqual([
      {
        action: 'select',
        value: 'vip',
        label: 'vip',
        color: '#f00',
        id: 1,
        isSelected: false,
      },
      {
        action: 'select',
        value: 'lead',
        label: 'lead',
        color: '#0f0',
        id: 2,
        isSelected: false,
      },
    ]);
    expect(wrapper.find('.menu span').attributes('style')).toContain(
      'background-color'
    );
    expect(apply(wrapper).text()).toBe(
      'BULK_ACTION.LABELS.ASSIGN_SELECTED_LABELS'
    );
    expect(apply(wrapper).attributes('disabled')).toBeDefined();
    await apply(wrapper).trigger('click');
    expect(wrapper.emitted('assign')).toBeUndefined();

    await menu(wrapper).vm.$emit('action', { value: 'vip' });
    await menu(wrapper).vm.$emit('action', { value: 'lead' });
    await menu(wrapper).vm.$emit('action', { value: 'lead' });
    expect(wrapper.findAll('i.i-lucide-check')).toHaveLength(1);
    expect(menu(wrapper).props('menuItems')[0].isSelected).toBe(true);
    await apply(wrapper).trigger('click');
    expect(wrapper.emitted('assign')).toEqual([[['vip']]]);
    expect(menu(wrapper).exists()).toBe(false);
  });

  it('removes only applied labels on contacts', async () => {
    const wrapper = mountActions({
      type: 'contact',
      action: 'remove',
      appliedLabels: ['lead'],
    });
    expect(trigger(wrapper).text()).toBe('CONTACTS_BULK_ACTIONS.REMOVE_LABELS');
    expect(trigger(wrapper).attributes('data-icon')).toBe('i-woot-tag-remove');
    expect(trigger(wrapper).attributes('data-size')).toBe('sm');
    expect(trigger(wrapper).attributes('data-tip')).toBe(
      'BULK_ACTION.LABELS.REMOVE_LABELS'
    );
    await trigger(wrapper).trigger('click');
    expect(
      menu(wrapper)
        .props('menuItems')
        .map(i => i.value)
    ).toEqual(['lead']);
    expect(apply(wrapper).text()).toBe(
      'BULK_ACTION.LABELS.REMOVE_SELECTED_LABELS'
    );
    await menu(wrapper).vm.$emit('action', { value: 'lead' });
    await apply(wrapper).trigger('click');
    expect(wrapper.emitted('remove')).toEqual([[['lead']]]);
  });

  it('labels the contact assign button and lists all labels when removing without applied labels', async () => {
    expect(trigger(mountActions({ type: 'contact' })).text()).toBe(
      'CONTACTS_BULK_ACTIONS.ASSIGN_LABELS'
    );
    const wrapper = mountActions({ action: 'remove' });
    await trigger(wrapper).trigger('click');
    expect(menu(wrapper).props('menuItems')).toHaveLength(2);
  });

  it('clears the selection when dismissed by an outside click', async () => {
    const wrapper = mountActions();
    await trigger(wrapper).trigger('click');
    await menu(wrapper).vm.$emit('action', { value: 'vip' });
    const [dismiss, options] = env.outside;
    expect(options.ignore).toHaveLength(1);
    dismiss();
    await wrapper.vm.$nextTick();
    expect(menu(wrapper).exists()).toBe(false);
    await trigger(wrapper).trigger('click');
    expect(wrapper.findAll('i.i-lucide-check')).toHaveLength(0);
  });

  it('disables the button while loading or disabled', () => {
    expect(
      trigger(mountActions({ isLoading: true })).attributes('disabled')
    ).toBeDefined();
    expect(
      trigger(mountActions({ disabled: true })).attributes('disabled')
    ).toBeDefined();
    expect(trigger(mountActions()).attributes('disabled')).toBeUndefined();
  });
});
