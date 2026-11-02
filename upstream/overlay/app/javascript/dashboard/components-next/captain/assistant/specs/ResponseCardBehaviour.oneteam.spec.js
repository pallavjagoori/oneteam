/**
 * OneTeam behaviour spec for a Captain FAQ response card.
 *
 * Covers the action menu (with "approve" only for pending responses,
 * closing on click-away and after an action), the inline action buttons,
 * selection and hover events, the source of the response (document,
 * user, or conversation link), the assistant name for approved
 * responses, the conversation-usage button, and the compact and
 * menu-less layouts.
 */
import { mount } from '@vue/test-utils';
import ResponseCard from '../ResponseCard.vue';

const env = vi.hoisted(() => ({ canManage: true, clickaway: null }));

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
vi.mock('dashboard/composables/usePolicy', () => ({
  usePolicy: () => ({ checkPermissions: () => env.canManage }),
}));

const Button = {
  name: 'Button',
  props: ['label', 'icon', 'disabled'],
  emits: ['click'],
  template:
    '<button :data-icon="icon" :disabled="disabled" @click="$emit(\'click\', $event)">{{ label }}</button>',
};
const DropdownMenu = {
  name: 'DropdownMenu',
  props: ['menuItems'],
  emits: ['action'],
  template: '<ul class="menu" />',
};
const Checkbox = {
  name: 'Checkbox',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<input type="checkbox" class="check" />',
};
const CardLayout = {
  emits: ['mouseenter', 'mouseleave'],
  template:
    '<div class="card" @mouseenter="$emit(\'mouseenter\')" @mouseleave="$emit(\'mouseleave\')"><slot /></div>',
};

const mountCard = (props = {}) =>
  mount(ResponseCard, {
    props: {
      id: 42,
      question: 'How long do refunds take?',
      answer: 'Five business days.',
      assistant: { name: 'Acme bot' },
      createdAt: 1_700_000_000,
      updatedAt: 0,
      ...props,
    },
    global: {
      directives: {
        onClickaway: {
          mounted: (el, binding) => {
            env.clickaway = binding.value;
          },
        },
        tooltip: {},
      },
      stubs: {
        Button,
        NextButton: Button,
        DropdownMenu,
        Checkbox,
        CardLayout,
        Policy: { template: '<div><slot /></div>' },
        Icon: { props: ['icon'], template: '<i :class="icon" />' },
      },
    },
  });

describe('ResponseCard behaviour', () => {
  beforeEach(() => {
    env.canManage = true;
  });

  it('offers approve for pending responses in the menu', async () => {
    const wrapper = mountCard({ status: 'pending' });
    expect(wrapper.find('.menu').exists()).toBe(false);
    await wrapper
      .find('[data-icon="i-lucide-ellipsis-vertical"]')
      .trigger('click');
    const menu = wrapper.findComponent(DropdownMenu);
    expect(menu.props('menuItems').map(i => i.action)).toEqual([
      'approve',
      'edit',
      'delete',
    ]);
    await menu.vm.$emit('action', { action: 'approve', value: 'approve' });
    expect(wrapper.emitted('action')[0][0]).toEqual({
      action: 'approve',
      value: 'approve',
      id: 42,
    });
    expect(wrapper.find('.menu').exists()).toBe(false);

    await wrapper
      .find('[data-icon="i-lucide-ellipsis-vertical"]')
      .trigger('click');
    env.clickaway();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.menu').exists()).toBe(false);
    expect(wrapper.find('.i-woot-captain').exists()).toBe(false);
  });

  it('lists edit and delete only for approved responses', async () => {
    const wrapper = mountCard();
    await wrapper
      .find('[data-icon="i-lucide-ellipsis-vertical"]')
      .trigger('click');
    expect(
      wrapper
        .findComponent(DropdownMenu)
        .props('menuItems')
        .map(i => i.action)
    ).toEqual(['edit', 'delete']);
    expect(wrapper.text()).toContain('Acme bot');
  });

  it('runs the inline actions', async () => {
    const wrapper = mountCard({ status: 'pending', showActions: true });
    const click = icon =>
      wrapper.find(`[data-icon="${icon}"]`).trigger('click');
    await click('i-lucide-circle-check-big');
    await click('i-lucide-pencil-line');
    await click('i-lucide-trash');
    expect(wrapper.emitted('action').map(([e]) => e.action)).toEqual([
      'approve',
      'edit',
      'delete',
    ]);

    const approved = mountCard({ showActions: true, assistant: null });
    expect(
      approved.find('[data-icon="i-lucide-circle-check-big"]').exists()
    ).toBe(false);
    expect(approved.find('.i-woot-captain').exists()).toBe(true);
  });

  it('selects and reports hovering', async () => {
    const wrapper = mountCard({ selectable: true, isSelected: true });
    const checkbox = wrapper.findComponent(Checkbox);
    expect(checkbox.props('modelValue')).toBe(true);
    await checkbox.vm.$emit('update:modelValue', false);
    expect(wrapper.emitted('select')[0]).toEqual([42]);
    await wrapper.find('.card').trigger('mouseenter');
    await wrapper.find('.card').trigger('mouseleave');
    expect(wrapper.emitted('hover')).toEqual([[true], [false]]);
  });

  it('shows where the response came from', async () => {
    const doc = mountCard({
      documentable: { id: 1, type: 'Captain::Document', name: 'Refund policy' },
    });
    expect(doc.find('.i-ph-files-light').exists()).toBe(true);
    expect(doc.find('[title="Refund policy"]').text()).toBe('Refund policy');

    const convo = mountCard({
      documentable: { id: 8, type: 'Conversation', display_id: 77 },
    });
    expect(convo.find('.i-ph-chat-circle-dots').exists()).toBe(true);
    await convo.find('[role="button"]').trigger('click');
    expect(convo.emitted('navigate')[0][0]).toEqual({
      id: 8,
      type: 'Conversation',
    });

    const other = mountCard({ documentable: { id: 2, type: 'Other' } });
    expect(other.find('[role="button"]').exists()).toBe(false);
    expect(other.find('.i-ph-user-circle-plus').exists()).toBe(false);
  });

  it('opens conversations that used a user-added response', async () => {
    const user = { id: 3, type: 'User', available_name: 'Ann' };
    const wrapper = mountCard({
      documentable: user,
      usedInConversationsCount: 4,
    });
    expect(wrapper.find('.i-ph-user-circle-plus').exists()).toBe(true);
    expect(wrapper.find('[title="Ann"]').exists()).toBe(true);
    const usage = wrapper.find('[data-icon="i-lucide-messages-square"]');
    expect(usage.text()).toBe('4');
    await usage.trigger('click');
    expect(wrapper.emitted('viewConversations')[0]).toEqual([42]);

    const unused = mountCard({
      documentable: user,
      usedInConversationsCount: 0,
    });
    const usageButton = unused
      .findAllComponents(Button)
      .find(b => b.props('icon') === 'i-lucide-messages-square');
    expect(usageButton.props('disabled')).toBe(true);
    await usageButton.vm.$emit('click', { stopPropagation: () => {} });
    expect(unused.emitted('viewConversations')).toBeUndefined();

    expect(
      mountCard({ documentable: user })
        .find('[data-icon="i-lucide-messages-square"]')
        .exists()
    ).toBe(false);
    env.canManage = false;
    expect(
      mountCard({ documentable: user, usedInConversationsCount: 4 })
        .find('[data-icon="i-lucide-messages-square"]')
        .exists()
    ).toBe(false);
  });

  it('hides the menu and footer when compact or without a menu', () => {
    const compact = mountCard({ compact: true });
    expect(
      compact.find('[data-icon="i-lucide-ellipsis-vertical"]').exists()
    ).toBe(false);
    expect(compact.find('.i-ph-calendar-dot').exists()).toBe(false);
    const noMenu = mountCard({ showMenu: false, updatedAt: 1_700_000_500 });
    expect(
      noMenu.find('[data-icon="i-lucide-ellipsis-vertical"]').exists()
    ).toBe(false);
    expect(noMenu.find('.i-ph-calendar-dot').exists()).toBe(true);
  });
});
