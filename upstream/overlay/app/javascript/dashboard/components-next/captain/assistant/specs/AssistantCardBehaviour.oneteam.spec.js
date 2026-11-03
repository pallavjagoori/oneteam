/**
 * OneTeam behaviour spec for the Captain assistant card.
 *
 * Covers the name, description fallback and relative update time, the
 * actions menu for agents and administrators, choosing an action, and
 * closing the menu by clicking away.
 */
import { mount } from '@vue/test-utils';
import AssistantCard from '../AssistantCard.vue';

const env = vi.hoisted(() => ({ admin: false }));
let clickaway;

vi.mock('@vueuse/core', async importOriginal => {
  const { ref: appRef } = await import('vue');
  return {
    ...(await importOriginal()),
    useToggle: () => {
      const state = appRef(false);
      return [
        state,
        value => {
          state.value = typeof value === 'boolean' ? value : !state.value;
        },
      ];
    },
  };
});
vi.mock('dashboard/composables/usePolicy', () => ({
  usePolicy: () => ({ checkPermissions: () => env.admin }),
}));
vi.mock('shared/helpers/timeHelper', () => ({
  dynamicTime: time => `t${time}`,
}));
vi.mock('shared/composables/useExactTimestamp', () => ({
  useExactTimestamp: () => time => `exact${time}`,
}));

const DropdownMenu = {
  name: 'DropdownMenu',
  props: ['menuItems'],
  emits: ['action'],
  template: '<ul />',
};

const mountCard = (props = {}) =>
  mount(AssistantCard, {
    props: { id: 3, name: 'Helper', description: '', updatedAt: 5, ...props },
    global: {
      stubs: {
        CardLayout: { template: '<div><slot /></div>' },
        DropdownMenu,
        Button: {
          emits: ['click'],
          template: '<button @click="$emit(\'click\')" />',
        },
      },
      directives: {
        tooltip: {},
        'on-clickaway': {
          mounted: (el, { value }) => {
            clickaway = value;
          },
        },
      },
    },
  });

describe('AssistantCard behaviour', () => {
  beforeEach(() => {
    env.admin = false;
  });

  it('shows details with a description fallback', () => {
    const wrapper = mountCard();
    expect(wrapper.text()).toContain('Helper');
    expect(wrapper.text()).toContain('Description not available');
    expect(wrapper.text()).toContain('t5');
    expect(mountCard({ description: 'Answers FAQs' }).text()).toContain(
      'Answers FAQs'
    );
  });

  it('lists actions by role and emits the chosen one', async () => {
    const wrapper = mountCard();
    await wrapper.find('button').trigger('click');
    const menu = wrapper.findComponent(DropdownMenu);
    expect(menu.props('menuItems').map(item => item.action)).toEqual([
      'viewConnectedInboxes',
    ]);
    await menu.vm.$emit('action', { action: 'edit', value: 'edit' });
    expect(wrapper.emitted('action')).toEqual([
      [{ action: 'edit', value: 'edit', id: 3 }],
    ]);
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);

    env.admin = true;
    const admin = mountCard();
    await admin.find('button').trigger('click');
    expect(
      admin
        .findComponent(DropdownMenu)
        .props('menuItems')
        .map(item => item.action)
    ).toEqual(['viewConnectedInboxes', 'edit', 'delete']);
    clickaway();
    await admin.vm.$nextTick();
    expect(admin.findComponent(DropdownMenu).exists()).toBe(false);
  });
});
