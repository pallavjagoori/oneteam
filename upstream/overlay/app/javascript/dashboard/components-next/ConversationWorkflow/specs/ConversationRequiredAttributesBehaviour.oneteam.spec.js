/**
 * OneTeam behaviour spec for the "required conversation attributes"
 * workflow card.
 *
 * Covers hiding the card off cloud when the feature is off, the cloud
 * paywall (upgrade link, super admin flag), listing required attributes
 * and the empty state, adding one from the dropdown (ignoring blank or
 * busy picks), removing one, save success and error alerts, closing the
 * dropdown on outside clicks, and the card's click event.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { computed, reactive, ref } from 'vue';
import { useAlert } from 'dashboard/composables';
import ConversationRequiredAttributes from '../ConversationRequiredAttributes.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: name => computed(() => env.state[name]),
}));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => env.account,
}));
vi.mock('vue-router', () => ({ useRouter: () => env.router }));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  useToggle: initial => {
    const state = ref(initial);
    const toggle = value => {
      state.value = typeof value === 'boolean' ? value : !state.value;
    };
    return [state, toggle];
  },
}));

const Button = {
  name: 'Button',
  props: ['label', 'isLoading', 'disabled'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\', $event)">{{ label }}</button>',
};
const DropdownMenu = {
  name: 'DropdownMenu',
  props: ['menuItems', 'showSearch', 'searchPlaceholder'],
  emits: ['action'],
  template: '<div class="menu" />',
};
const Item = {
  name: 'ConversationRequiredAttributeItem',
  props: ['attribute'],
  emits: ['delete'],
  template: '<div class="item">{{ attribute.label }}</div>',
};
const Empty = {
  name: 'ConversationRequiredEmpty',
  template: '<div class="empty" />',
};
const Paywall = {
  name: 'BasePaywallModal',
  props: ['featurePrefix', 'i18nKey', 'isOnChatwootCloud', 'isSuperAdmin'],
  emits: ['upgrade'],
  template: '<div class="paywall" />',
};

const attributes = [
  {
    attributeKey: 'plan',
    attributeDisplayName: 'Plan',
    attributeDisplayType: 'list',
  },
  {
    attributeKey: 'order',
    attributeDisplayName: 'Order',
    attributeDisplayType: 'text',
  },
];

const setup = ({ required, cloud = false, userType = 'User', attrs } = {}) => {
  env.state = reactive({
    'attributes/getConversationAttributes': attrs,
    getCurrentUser: { type: userType },
  });
  env.account = {
    currentAccount: ref(
      required
        ? { settings: { conversation_required_attributes: required } }
        : {}
    ),
    accountId: ref(3),
    isOnChatwootCloud: ref(cloud),
    updateAccount: vi.fn().mockResolvedValue(),
  };
  env.router = { push: vi.fn() };
};

const mountCard = (props = { isEnabled: true }) =>
  mount(ConversationRequiredAttributes, {
    props,
    global: {
      stubs: {
        Button,
        DropdownMenu,
        ConversationRequiredAttributeItem: Item,
        ConversationRequiredEmpty: Empty,
        BasePaywallModal: Paywall,
      },
      directives: {
        onClickaway: {
          mounted: (el, binding) => {
            env.clickaway = binding.value;
          },
        },
      },
      mocks: { $t: key => key },
    },
  });
const openMenu = async wrapper => {
  await wrapper.findComponent(Button).trigger('click');
  return wrapper.findComponent(DropdownMenu);
};

describe('ConversationRequiredAttributes behaviour', () => {
  it('hides the card when the feature is off outside the cloud', () => {
    setup({ attrs: attributes });
    expect(mountCard({ isEnabled: false }).html()).not.toContain('h3');
  });

  it('shows the paywall on the cloud and links to billing', () => {
    setup({ cloud: true, userType: 'SuperAdmin', attrs: attributes });
    const wrapper = mountCard({ isEnabled: false });
    const paywall = wrapper.findComponent(Paywall);
    expect(paywall.props()).toMatchObject({
      i18nKey: 'PAYWALL',
      isOnChatwootCloud: true,
      isSuperAdmin: true,
    });
    expect(wrapper.findComponent(Button).exists()).toBe(false);
    paywall.vm.$emit('upgrade');
    expect(env.router.push).toHaveBeenCalledWith({
      name: 'billing_settings_index',
      params: { accountId: 3 },
    });
  });

  it('shows the empty state without attributes or settings', () => {
    setup({});
    const wrapper = mountCard();
    expect(wrapper.find('.empty').exists()).toBe(true);
    expect(wrapper.findComponent(Button).props('disabled')).toBe(true);
  });

  it('lists required attributes, skipping deleted ones', () => {
    setup({ required: ['plan', 'gone'], attrs: attributes });
    const wrapper = mountCard();
    expect(wrapper.findAll('.item').map(i => i.text())).toEqual(['Plan']);
    expect(wrapper.find('.empty').exists()).toBe(false);
  });

  it('adds an attribute from the dropdown', async () => {
    setup({ required: ['plan'], attrs: attributes });
    const wrapper = mountCard();
    const menu = await openMenu(wrapper);
    expect(menu.props('menuItems')).toEqual([
      expect.objectContaining({ value: 'order', label: 'Order', type: 'text' }),
    ]);
    menu.vm.$emit('action', { value: 'order' });
    await flushPromises();
    expect(env.account.updateAccount).toHaveBeenCalledWith(
      { conversation_required_attributes: ['plan', 'order'] },
      { silent: true }
    );
    expect(useAlert).toHaveBeenCalledWith(
      'CONVERSATION_WORKFLOW.REQUIRED_ATTRIBUTES.SAVE.SUCCESS'
    );
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);
  });

  it('ignores blank picks and picks while saving', async () => {
    setup({ attrs: attributes });
    let finish;
    env.account.updateAccount.mockReturnValue(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    const wrapper = mountCard();
    const menu = await openMenu(wrapper);
    menu.vm.$emit('action', {});
    expect(env.account.updateAccount).not.toHaveBeenCalled();
    menu.vm.$emit('action', { value: 'plan' });
    menu.vm.$emit('action', { value: 'order' });
    await flushPromises();
    expect(wrapper.findComponent(Button).props('isLoading')).toBe(true);
    expect(env.account.updateAccount).toHaveBeenCalledTimes(1);
    finish();
    await flushPromises();
  });

  it('removes an attribute, ignoring removals while saving', async () => {
    setup({ required: ['plan', 'order'], attrs: attributes });
    let finish;
    env.account.updateAccount.mockReturnValue(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    const wrapper = mountCard();
    const [plan, order] = wrapper.findAllComponents(Item);
    plan.vm.$emit('delete', plan.props('attribute'));
    order.vm.$emit('delete', order.props('attribute'));
    expect(env.account.updateAccount).toHaveBeenCalledTimes(1);
    expect(env.account.updateAccount.mock.calls[0][0]).toEqual({
      conversation_required_attributes: ['order'],
    });
    finish();
    await flushPromises();
  });

  it('alerts when saving fails', async () => {
    setup({ attrs: attributes });
    env.account.updateAccount.mockRejectedValue(new Error('nope'));
    const wrapper = mountCard();
    const menu = await openMenu(wrapper);
    menu.vm.$emit('action', { value: 'plan' });
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'CONVERSATION_WORKFLOW.REQUIRED_ATTRIBUTES.SAVE.ERROR'
    );
  });

  it('closes the dropdown on outside clicks and emits card clicks', async () => {
    setup({ attrs: attributes });
    const wrapper = mountCard();
    await openMenu(wrapper);
    env.clickaway();
    await flushPromises();
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);
    await wrapper.find('div').trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);
  });
});
