/**
 * OneTeam behaviour spec for the compose-conversation inbox selector.
 *
 * Covers the chosen inbox (removable or fixed), the loading spinner, the
 * select button's error colour and disabled state, opening the inbox
 * menu, picking an inbox, and closing on an outside click.
 */
import { mount } from '@vue/test-utils';
import InboxSelector from '../InboxSelector.vue';

const env = vi.hoisted(() => ({ outside: null }));

vi.mock('@vueuse/components', () => ({
  vOnClickOutside: (el, binding) => {
    env.outside = binding.value;
  },
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const Button = {
  name: 'NextButton',
  props: { label: String, color: String, disabled: Boolean, icon: String },
  emits: ['click'],
  template: '<button :data-icon="icon" @click="$emit(\'click\')" />',
};
const DropdownMenu = {
  name: 'DropdownMenu',
  props: ['menuItems'],
  emits: ['action'],
  template: '<ul />',
};

/**
 * Mounts the selector.
 *
 * @param {object} props Selector props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountSelector = props =>
  mount(InboxSelector, {
    props: { showInboxesDropdown: false, ...props },
    global: { stubs: { Button, DropdownMenu, Spinner: { template: '<s />' } } },
  });

describe('InboxSelector behaviour', () => {
  it('shows a removable chosen inbox', async () => {
    const wrapper = mountSelector({
      targetInbox: { name: 'Support', email: 'a@x.test' },
    });
    expect(wrapper.text()).toContain('Support');
    await wrapper.get('[data-icon="i-lucide-x"]').trigger('click');
    expect(wrapper.emitted('updateInbox')).toEqual([[null]]);
    await wrapper.setProps({ removable: false });
    expect(wrapper.find('button').exists()).toBe(false);
    expect(wrapper.find('.px-3').exists()).toBe(true);
  });

  it('opens the menu, picks an inbox and closes outside', async () => {
    const inboxes = [{ value: 1, label: 'Email' }];
    const wrapper = mountSelector({
      selectedContact: { id: 1 },
      contactableInboxesList: inboxes,
    });
    const button = wrapper.getComponent(Button);
    expect(button.props()).toMatchObject({ color: 'slate', disabled: false });
    await button.trigger('click');
    expect(wrapper.emitted('toggleDropdown')).toEqual([[true]]);
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);
    await wrapper.setProps({ showInboxesDropdown: true });
    const menu = wrapper.getComponent(DropdownMenu);
    expect(menu.props('menuItems')).toEqual(inboxes);
    menu.vm.$emit('action', inboxes[0]);
    expect(wrapper.emitted('handleInboxAction')).toEqual([[inboxes[0]]]);
    env.outside();
    expect(wrapper.emitted('toggleDropdown')[1]).toEqual([false]);
  });

  it('shows errors, a disabled button and the loading spinner', async () => {
    const wrapper = mountSelector({
      hasErrors: true,
      showInboxesDropdown: true,
      contactableInboxesList: null,
    });
    expect(wrapper.getComponent(Button).props()).toMatchObject({
      color: 'ruby',
      disabled: true,
    });
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);
    await wrapper.setProps({ isFetchingInboxes: true });
    expect(wrapper.find('s').exists()).toBe(true);
    expect(wrapper.findComponent(Button).exists()).toBe(false);
  });
});
