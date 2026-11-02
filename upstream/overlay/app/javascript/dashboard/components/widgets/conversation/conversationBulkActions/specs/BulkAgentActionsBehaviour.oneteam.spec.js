/**
 * OneTeam behaviour spec for the bulk "assign agent" picker on the
 * conversation list.
 *
 * Covers opening the dropdown (fetching assignable agents only when
 * opening with inboxes selected), the "None" entry plus one entry per
 * agent with its selected state, picking an agent, None or an unknown
 * agent, the assign and unassign confirmation footers, cancelling,
 * confirming (blocked while an update runs) and dismissing on an outside
 * click.
 */
import { computed } from 'vue';
import { mount } from '@vue/test-utils';
import BulkAgentActions from '../BulkAgentActions.vue';

const env = vi.hoisted(() => ({ state: {}, outside: null, dispatch: null }));

vi.mock('vuex', () => ({ useStore: () => ({ dispatch: env.dispatch }) }));
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
  props: ['keypath'],
  template: '<p :data-key="keypath"><slot name="n" /><slot name="agentName" /></p>',
};

const agents = [
  { id: 7, name: 'Asha', thumbnail: 'a.png' },
  { id: 8, name: 'Ben', thumbnail: '' },
];

const mountActions = props =>
  mount(BulkAgentActions, {
    props,
    global: {
      stubs: { NextButton, DropdownMenu, I18nT },
      directives: { tooltip: {} },
    },
  });
const menu = wrapper => wrapper.findComponent(DropdownMenu);
const items = wrapper => menu(wrapper).props('menuItems');
const footerButton = (wrapper, label) =>
  wrapper.findAll('.menu button').find(b => b.text() === label);

describe('Bulk agent actions behaviour', () => {
  beforeEach(() => {
    env.dispatch = vi.fn();
    env.outside = null;
    env.state = {
      'inboxAssignableAgents/getUIFlags': { isFetching: true },
      'bulkActions/getUIFlags': { isUpdating: false },
      'inboxAssignableAgents/getAssignableAgents': ids =>
        ids === '1,2' ? agents : [],
    };
  });

  it('fetches agents only when opening with selected inboxes', async () => {
    const wrapper = mountActions({ selectedInboxes: [1, 2] });
    await wrapper.find('button').trigger('click');
    expect(env.dispatch).toHaveBeenCalledWith('inboxAssignableAgents/fetch', [1, 2]);
    expect(menu(wrapper).props('isLoading')).toBe(true);
    expect(items(wrapper).map(i => i.value)).toEqual(['none', 7, 8]);
    expect(items(wrapper)[1].thumbnail).toEqual({ name: 'Asha', src: 'a.png' });
    await wrapper.find('button').trigger('click');
    expect(menu(wrapper).exists()).toBe(false);
    expect(env.dispatch).toHaveBeenCalledTimes(1);

    const empty = mountActions({});
    await empty.find('button').trigger('click');
    expect(env.dispatch).toHaveBeenCalledTimes(1);
    expect(items(empty)).toHaveLength(1);
  });

  it('confirms assigning a chosen agent', async () => {
    const wrapper = mountActions({ selectedInboxes: [1, 2], conversationCount: 3 });
    await wrapper.find('button').trigger('click');
    expect(wrapper.find('[data-key]').exists()).toBe(false);
    menu(wrapper).vm.$emit('action', { value: 8 });
    await wrapper.vm.$nextTick();
    expect(items(wrapper).find(i => i.value === 8).isSelected).toBe(true);
    const label = wrapper.find('[data-key]');
    expect(label.attributes('data-key')).toBe('BULK_ACTION.ASSIGN_AGENT_CONFIRMATION_LABEL');
    expect(label.text()).toContain('3');
    expect(label.text()).toContain('Ben');
    await footerButton(wrapper, 'BULK_ACTION.YES').trigger('click');
    expect(wrapper.emitted('select')).toEqual([[agents[1]]]);
    expect(menu(wrapper).exists()).toBe(false);
  });

  it('confirms unassigning with None or an unknown agent, and cancels', async () => {
    const wrapper = mountActions({ selectedInboxes: [1, 2], conversationCount: 2 });
    await wrapper.find('button').trigger('click');
    menu(wrapper).vm.$emit('action', { value: 'none' });
    await wrapper.vm.$nextTick();
    expect(items(wrapper)[0].isSelected).toBe(true);
    expect(wrapper.find('[data-key]').attributes('data-key')).toBe(
      'BULK_ACTION.UNASSIGN_AGENT_CONFIRMATION_LABEL'
    );
    await footerButton(wrapper, 'BULK_ACTION.CANCEL').trigger('click');
    expect(wrapper.find('[data-key]').exists()).toBe(false);

    menu(wrapper).vm.$emit('action', { value: 99 });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-key]').attributes('data-key')).toBe(
      'BULK_ACTION.UNASSIGN_AGENT_CONFIRMATION_LABEL'
    );
    await footerButton(wrapper, 'BULK_ACTION.YES').trigger('click');
    expect(wrapper.emitted('select')).toEqual([[{ id: null, name: 'BULK_ACTION.NONE' }]]);
  });

  it('blocks confirming while updating and dismisses on outside click', async () => {
    env.state['bulkActions/getUIFlags'] = { isUpdating: true };
    const wrapper = mountActions({ selectedInboxes: [1, 2] });
    await wrapper.find('button').trigger('click');
    menu(wrapper).vm.$emit('action', { value: 7 });
    await wrapper.vm.$nextTick();
    const yes = footerButton(wrapper, 'BULK_ACTION.YES');
    expect(yes.attributes('disabled')).toBeDefined();
    yes.element.disabled = false;
    await yes.trigger('click');
    expect(wrapper.emitted('select')).toBeUndefined();
    env.outside[0]();
    await wrapper.vm.$nextTick();
    expect(menu(wrapper).exists()).toBe(false);
    await wrapper.find('button').trigger('click');
    expect(wrapper.find('[data-key]').exists()).toBe(false);
  });
});
