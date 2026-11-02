/**
 * OneTeam behaviour spec for the bulk "assign team" picker on the
 * conversation list.
 *
 * Covers the "None" entry plus one entry per team with its selected
 * state, picking a team, None or an unknown team, the assign and
 * unassign confirmation footers, cancelling, confirming (blocked while an
 * update runs) and dismissing on an outside click.
 */
import { computed } from 'vue';
import { mount } from '@vue/test-utils';
import BulkTeamActions from '../BulkTeamActions.vue';

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
  props: ['label', 'disabled'],
  emits: ['click'],
  template: '<button :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
};
const DropdownMenu = {
  name: 'DropdownMenu',
  props: ['menuItems'],
  emits: ['action'],
  template: '<div class="menu"><slot name="footer" /></div>',
};
const I18nT = {
  name: 'I18nT',
  props: ['keypath'],
  template: '<p :data-key="keypath"><slot name="n" /><slot name="teamName" /></p>',
};

const teams = [
  { id: 4, name: 'Billing' },
  { id: 5, name: 'Support' },
];

const mountActions = (conversationCount = 3) =>
  mount(BulkTeamActions, {
    props: { conversationCount },
    global: { stubs: { NextButton, DropdownMenu, I18nT }, directives: { tooltip: {} } },
  });
const menu = wrapper => wrapper.findComponent(DropdownMenu);
const items = wrapper => menu(wrapper).props('menuItems');
const footerButton = (wrapper, label) => wrapper.findAll('.menu button').find(b => b.text() === label);
const open = wrapper => wrapper.find('button').trigger('click');

describe('Bulk team actions behaviour', () => {
  beforeEach(() => {
    env.outside = null;
    env.state = { 'teams/getTeams': teams, 'bulkActions/getUIFlags': { isUpdating: false } };
  });

  it('lists teams and confirms assigning one', async () => {
    const wrapper = mountActions();
    await open(wrapper);
    expect(items(wrapper).map(i => i.value)).toEqual(['none', 4, 5]);
    expect(wrapper.find('[data-key]').exists()).toBe(false);
    menu(wrapper).vm.$emit('action', { value: 5 });
    await wrapper.vm.$nextTick();
    expect(items(wrapper)[2].isSelected).toBe(true);
    const label = wrapper.find('[data-key]');
    expect(label.attributes('data-key')).toBe('BULK_ACTION.TEAMS.ASSIGN_TEAM_CONFIRMATION_LABEL');
    expect(label.text()).toContain('Support');
    await footerButton(wrapper, 'BULK_ACTION.YES').trigger('click');
    expect(wrapper.emitted('select')).toEqual([[teams[1]]]);
    expect(menu(wrapper).exists()).toBe(false);
    await open(wrapper);
    await open(wrapper);
    expect(menu(wrapper).exists()).toBe(false);
  });

  it('confirms unassigning with None or an unknown team, and cancels', async () => {
    const wrapper = mountActions(2);
    await open(wrapper);
    menu(wrapper).vm.$emit('action', { value: 'none' });
    await wrapper.vm.$nextTick();
    expect(items(wrapper)[0].isSelected).toBe(true);
    expect(wrapper.find('[data-key]').attributes('data-key')).toBe(
      'BULK_ACTION.TEAMS.UNASSIGN_TEAM_CONFIRMATION_LABEL'
    );
    await footerButton(wrapper, 'BULK_ACTION.CANCEL').trigger('click');
    expect(wrapper.find('[data-key]').exists()).toBe(false);
    menu(wrapper).vm.$emit('action', { value: 99 });
    await wrapper.vm.$nextTick();
    await footerButton(wrapper, 'BULK_ACTION.YES').trigger('click');
    expect(wrapper.emitted('select')).toEqual([[{ id: 0, name: 'BULK_ACTION.TEAMS.NONE' }]]);
  });

  it('blocks confirming while updating and dismisses on outside click', async () => {
    env.state['bulkActions/getUIFlags'] = { isUpdating: true };
    const wrapper = mountActions();
    await open(wrapper);
    menu(wrapper).vm.$emit('action', { value: 4 });
    await wrapper.vm.$nextTick();
    const yes = footerButton(wrapper, 'BULK_ACTION.YES');
    expect(yes.attributes('disabled')).toBeDefined();
    yes.element.disabled = false;
    await yes.trigger('click');
    expect(wrapper.emitted('select')).toBeUndefined();
    env.outside[0]();
    await wrapper.vm.$nextTick();
    expect(menu(wrapper).exists()).toBe(false);
    await open(wrapper);
    expect(wrapper.find('[data-key]').exists()).toBe(false);
  });
});
