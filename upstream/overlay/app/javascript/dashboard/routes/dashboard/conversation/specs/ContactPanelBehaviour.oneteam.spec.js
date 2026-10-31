/**
 * OneTeam behaviour spec for the conversation contact side panel.
 *
 * Covers loading data on mount, rendering each sidebar section in the
 * saved order, hiding sections behind features and integrations
 * (Linear, Shopify, Stripe, previous conversations scoped to the
 * contact), toggling sections, reloading when the contact changes,
 * saving a new order after dragging, and closing the panel.
 */
import { computed, reactive, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import ContactPanel from '../ContactPanel.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables/store', () => ({
  useStore: () => env.store,
  useMapGetter: name => computed(() => env.state[name]),
  useFunctionGetter: (name, arg) => computed(() => env.state.integrations[arg]),
}));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({
    isCloudFeatureEnabled: flag => env.state.cloudFlags.includes(flag),
  }),
}));
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => env.ui,
}));

const SECTIONS = [
  'conversation_actions',
  'conversation_participants',
  'conversation_info',
  'contact_attributes',
  'previous_conversation',
  'macros',
  'linear_issues',
  'shopify_orders',
  'stripe_customer',
  'contact_notes',
  'shared_files',
  'unknown_section',
];

const Draggable = {
  name: 'Draggable',
  props: ['list'],
  emits: ['start', 'end'],
  template:
    '<div><template v-for="element in list" :key="element.name"><slot name="item" :element="element" /></template></div>',
};
const Accordion = {
  name: 'AccordionItem',
  props: ['title', 'isOpen'],
  emits: ['toggle'],
  template: '<section :data-title="title"><slot /></section>',
};
const named = name => ({
  name,
  props: [
    'contactId',
    'conversationId',
    'contactEmail',
    'conversationAttributes',
    'contactAttributes',
  ],
  template: `<i class="${name}" />`,
});
const Header = {
  name: 'SidebarActionsHeader',
  emits: ['close'],
  template: '<header />',
};

const mountPanel = async (
  overrides = {},
  open = ['is_stripe_customer_open']
) => {
  env.store = { dispatch: vi.fn() };
  env.state = reactive({
    getSelectedChat: { meta: { channel: 'Channel::Email', sender: { id: 7 } } },
    'conversationMetadata/getConversationMetadata': () => ({
      additional_attributes: { browser: 'x' },
    }),
    'contacts/getContact': id => ({
      id,
      email: 'a@b.c',
      additional_attributes: { city: 'Pune' },
    }),
    getAppliedContactFilter: null,
    integrations: {
      shopify: { enabled: true },
      linear: { id: 'linear', enabled: true },
      stripe: { enabled: true },
    },
    cloudFlags: ['linear_integration', 'stripe_integration'],
    ...overrides,
  });
  env.open = reactive(new Set(open));
  env.ui = {
    updateUISettings: vi.fn(),
    isContactSidebarItemOpen: key => env.open.has(key),
    conversationSidebarItemsOrder: ref(SECTIONS.map(name => ({ name }))),
    toggleSidebarUIState: vi.fn(),
    isOnExpandedLayout: ref(false),
  };
  const stubs = {
    Draggable,
    AccordionItem: Accordion,
    SidebarActionsHeader: Header,
    WootFeatureToggle: { template: '<div class="feature"><slot /></div>' },
  };
  [
    'ContactInfo',
    'ConversationAction',
    'ConversationParticipant',
    'ConversationInfo',
    'CustomAttributes',
    'ContactConversations',
    'MacrosList',
    'LinearSetupCTA',
    'LinearIssuesList',
    'ShopifyOrdersList',
    'StripeCustomer',
    'ContactNotes',
    'SharedFiles',
  ].forEach(name => {
    stubs[name] = named(name);
  });
  const wrapper = mount(ContactPanel, {
    props: { conversationId: 12, inboxId: 3 },
    global: { stubs, mocks: { $t: key => key } },
  });
  await flushPromises();
  return wrapper;
};

const titles = wrapper =>
  wrapper.findAllComponents(Accordion).map(a => a.props('title'));

describe('Contact panel behaviour', () => {
  it('loads data and renders every section in order', async () => {
    const wrapper = await mountPanel();
    expect(env.store.dispatch.mock.calls).toEqual([
      ['contacts/show', { id: 7 }],
      ['attributes/get', 0],
      ['integrations/get'],
    ]);
    expect(titles(wrapper)).toEqual([
      'CONVERSATION_SIDEBAR.ACCORDION.CONVERSATION_ACTIONS',
      'CONVERSATION_PARTICIPANTS.SIDEBAR_TITLE',
      'CONVERSATION_SIDEBAR.ACCORDION.CONVERSATION_INFO',
      'CONVERSATION_SIDEBAR.ACCORDION.CONTACT_ATTRIBUTES',
      'CONVERSATION_SIDEBAR.ACCORDION.PREVIOUS_CONVERSATION',
      'CONVERSATION_SIDEBAR.ACCORDION.MACROS',
      'CONVERSATION_SIDEBAR.ACCORDION.LINEAR_ISSUES',
      'CONVERSATION_SIDEBAR.ACCORDION.SHOPIFY_ORDERS',
      'STRIPE_INTEGRATION.TITLE',
      'CONVERSATION_SIDEBAR.ACCORDION.CONTACT_NOTES',
      'CONVERSATION_SIDEBAR.ACCORDION.SHARED_FILES',
    ]);
    expect(
      wrapper.findComponent({ name: 'ConversationInfo' }).props()
    ).toMatchObject({
      conversationAttributes: { browser: 'x' },
      contactAttributes: { city: 'Pune' },
    });
    expect(
      wrapper.findComponent({ name: 'StripeCustomer' }).props('contactEmail')
    ).toBe('a@b.c');
    expect(wrapper.find('.LinearIssuesList').exists()).toBe(true);
    expect(wrapper.find('.LinearSetupCTA').exists()).toBe(false);
  });

  it('toggles each section by its own key', async () => {
    const wrapper = await mountPanel();
    wrapper
      .findAllComponents(Accordion)
      .forEach(a => a.vm.$emit('toggle', true));
    expect(env.ui.toggleSidebarUIState.mock.calls.map(([key]) => key)).toEqual([
      'is_conv_actions_open',
      'is_conv_participants_open',
      'is_conv_details_open',
      'is_contact_attributes_open',
      'is_previous_conv_open',
      'is_macro_open',
      'is_linear_issues_open',
      'is_shopify_orders_open',
      'is_stripe_customer_open',
      'is_contact_notes_open',
      'is_shared_files_open',
    ]);
  });

  it('hides sections behind features, integrations and filters', async () => {
    const wrapper = await mountPanel({
      integrations: {
        shopify: { enabled: false },
        linear: { id: 'linear', enabled: false },
        stripe: { enabled: false },
      },
      getAppliedContactFilter: { id: 7 },
    });
    expect(titles(wrapper)).not.toContain(
      'CONVERSATION_SIDEBAR.ACCORDION.PREVIOUS_CONVERSATION'
    );
    expect(titles(wrapper)).not.toContain(
      'CONVERSATION_SIDEBAR.ACCORDION.SHOPIFY_ORDERS'
    );
    expect(titles(wrapper)).not.toContain('STRIPE_INTEGRATION.TITLE');
    expect(wrapper.find('.LinearSetupCTA').exists()).toBe(true);

    const noLinear = await mountPanel({
      integrations: {
        shopify: { enabled: true },
        linear: null,
        stripe: { enabled: true },
      },
      cloudFlags: [],
    });
    expect(titles(noLinear)).not.toContain(
      'CONVERSATION_SIDEBAR.ACCORDION.LINEAR_ISSUES'
    );
    expect(titles(noLinear)).not.toContain('STRIPE_INTEGRATION.TITLE');
    const noClient = await mountPanel({
      integrations: {
        shopify: { enabled: true },
        linear: { enabled: true },
        stripe: { enabled: true },
      },
    });
    expect(titles(noClient)).not.toContain(
      'CONVERSATION_SIDEBAR.ACCORDION.LINEAR_ISSUES'
    );
  });

  it('keeps previous conversations on the expanded layout and hides Stripe details while closed', async () => {
    const wrapper = await mountPanel(
      { getAppliedContactFilter: { id: 7 } },
      []
    );
    env.ui.isOnExpandedLayout.value = true;
    await flushPromises();
    expect(titles(wrapper)).toContain(
      'CONVERSATION_SIDEBAR.ACCORDION.PREVIOUS_CONVERSATION'
    );
    expect(wrapper.find('.StripeCustomer').exists()).toBe(false);
  });

  it('skips the contact without a sender and reloads when it changes', async () => {
    const wrapper = await mountPanel({
      getSelectedChat: { meta: {} },
      'contacts/getContact': () => ({}),
    });
    expect(env.store.dispatch).not.toHaveBeenCalledWith(
      'contacts/show',
      expect.anything()
    );
    expect(titles(wrapper)).not.toContain(
      'CONVERSATION_SIDEBAR.ACCORDION.PREVIOUS_CONVERSATION'
    );
    expect(
      wrapper.findComponent({ name: 'ConversationInfo' }).props()
    ).toMatchObject({ conversationAttributes: {}, contactAttributes: {} });

    env.state['conversationMetadata/getConversationMetadata'] = () => ({});
    env.state.getSelectedChat = { meta: { sender: { id: 9 } } };
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenCalledWith('contacts/show', { id: 9 });
    env.store.dispatch.mockClear();
    env.state.getSelectedChat = { meta: { sender: { id: 9 }, channel: 'x' } };
    env.state.getSelectedChat = { meta: {} };
    await flushPromises();
    expect(env.store.dispatch).not.toHaveBeenCalled();
  });

  it('saves the order after dragging and closes the panel', async () => {
    const wrapper = await mountPanel();
    await wrapper.findComponent(Draggable).vm.$emit('start');
    await wrapper.findComponent(Draggable).vm.$emit('end');
    expect(env.ui.updateUISettings).toHaveBeenCalledWith({
      conversation_sidebar_items_order: SECTIONS.map(name => ({ name })),
    });
    await wrapper.findComponent(Header).vm.$emit('close');
    expect(env.ui.updateUISettings).toHaveBeenLastCalledWith({
      is_contact_sidebar_open: false,
      is_copilot_panel_open: false,
    });
  });
});
