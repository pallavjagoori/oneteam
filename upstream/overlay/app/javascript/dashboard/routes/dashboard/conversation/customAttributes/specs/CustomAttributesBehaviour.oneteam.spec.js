/**
 * OneTeam behaviour spec for the sidebar custom attributes list.
 *
 * Store getters, UI settings, route and drag list are faked. Covers
 * listing conversation and contact attributes with static elements,
 * the saved order (including hidden static elements), show more and
 * less, the empty state for admins, and updating, deleting and copying
 * values with their alerts.
 */
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import CustomAttributes from '../CustomAttributes.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
}));
vi.mock('@vueuse/core', async importOriginal => {
  const vue = await import('vue');
  return {
    ...(await importOriginal()),
    useToggle: initial => {
      const state = vue.ref(initial);
      return [
        state,
        () => {
          state.value = !state.value;
        },
      ];
    },
  };
});
vi.mock('dashboard/composables/store', () => ({
  useStore: () => env.store,
  useStoreGetters: () => env.getters,
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({
    uiSettings: env.uiSettings,
    updateUISettings: env.updateUISettings,
  }),
}));
vi.mock('dashboard/composables/useAdmin', () => ({
  useAdmin: () => ({ isAdmin: env.isAdmin }),
}));
vi.mock('shared/helpers/clipboard', () => ({ copyTextToClipboard: vi.fn() }));

const Draggable = {
  name: 'Draggable',
  props: ['list', 'disabled'],
  emits: ['start', 'end'],
  template:
    '<div><div v-for="element in list" :key="element.key" class="row"><slot name="item" :element="element" /></div></div>',
};
const Attribute = {
  name: 'CustomAttribute',
  props: ['attributeKey', 'value', 'label'],
  emits: ['update', 'delete', 'copy'],
  template: '<div class="attr">{{ [attributeKey, value].join(`=`) }}</div>',
};
const NextButton = {
  name: 'NextButton',
  props: ['label', 'icon'],
  emits: ['click'],
  template: '<button>{{ label }}</button>',
};

const attribute = key => ({
  id: key,
  attribute_key: key,
  attribute_display_name: key,
});

const mountList = (props = {}) =>
  mount(CustomAttributes, {
    props: { attributeFrom: 'conversation_panel', ...props },
    slots: {
      staticItem:
        '<template #staticItem="{ element }"><b class="static">{{ element.key }}</b></template>',
    },
    global: {
      stubs: {
        Draggable,
        CustomAttribute: Attribute,
        NextButton,
        RouterLink: { template: '<a><slot /></a>' },
      },
    },
  });

const keys = wrapper =>
  wrapper.findAll('.row').map(row => row.text().split('=')[0]);

describe('CustomAttributes behaviour', () => {
  beforeEach(() => {
    env.route = { params: {} };
    env.isAdmin = ref(true);
    env.uiSettings = ref({});
    env.updateUISettings = vi.fn(settings => {
      env.uiSettings.value = { ...env.uiSettings.value, ...settings };
    });
    env.chat = ref({
      id: 11,
      meta: { sender: { id: 3 } },
      custom_attributes: { plan: 'pro' },
    });
    env.attributes = [attribute('plan'), attribute('tier')];
    env.contact = { custom_attributes: { tier: 'gold' } };
    env.getters = {
      getSelectedChat: env.chat,
      'attributes/getAttributesByModel': ref(() => env.attributes),
      'contacts/getContact': ref(id => (id ? env.contact : {})),
    };
    env.store = { dispatch: vi.fn().mockResolvedValue() };
  });

  it('lists conversation attributes and saves the first order', () => {
    const wrapper = mountList({
      staticElements: [{ key: 'static-a', type: 'static_attribute' }],
    });
    expect(wrapper.findAll('.row').map(r => r.text())).toEqual([
      'static-a',
      'plan=pro',
      'tier=',
    ]);
    expect(env.updateUISettings).toHaveBeenCalledWith({
      conversation_elements_order_conversation_panel: [
        'static-a',
        'plan',
        'tier',
      ],
    });
    expect(wrapper.findComponent(Draggable).props('disabled')).toBe(true);
    expect(wrapper.findComponent(NextButton).exists()).toBe(false);
  });

  it('shows contact attributes from the sender, route or prop', () => {
    expect(mountList({ attributeType: 'contact_attribute' }).text()).toContain(
      'tier=gold'
    );
    env.chat.value = { id: 11 };
    env.route.params.contactId = 4;
    expect(mountList({ attributeType: 'contact_attribute' }).text()).toContain(
      'tier=gold'
    );
    env.route.params = {};
    expect(
      mountList({ attributeType: 'contact_attribute', contactId: 5 }).text()
    ).toContain('tier=gold');
    env.contact = {};
    expect(
      mountList({ attributeType: 'contact_attribute', contactId: 5 }).text()
    ).toContain('tier=');
    env.chat.value = { id: 11 };
    expect(mountList().text()).toContain('plan=');
  });

  it('follows the saved order, new items last', () => {
    env.attributes = ['a', 'b', 'c', 'd'].map(attribute);
    env.uiSettings.value = {
      conversation_elements_order_conversation_panel: ['c', 'a'],
    };
    const wrapper = mountList();
    expect(keys(wrapper)).toEqual(['c', 'a', 'b', 'd']);
    expect(env.updateUISettings).not.toHaveBeenCalled();
  });

  it('shows five items until expanded and remembers the choice', async () => {
    env.attributes = ['a', 'b', 'c', 'd', 'e', 'f'].map(attribute);
    const wrapper = mountList();
    expect(keys(wrapper)).toHaveLength(5);
    const toggle = wrapper.findComponent(NextButton);
    expect(toggle.props('label')).toBe('CUSTOM_ATTRIBUTES.SHOW_MORE');
    await toggle.vm.$emit('click');
    expect(keys(wrapper)).toHaveLength(6);
    expect(toggle.props('label')).toBe('CUSTOM_ATTRIBUTES.SHOW_LESS');
    expect(toggle.props('icon')).toBe('i-lucide-chevron-up');
    expect(wrapper.findComponent(Draggable).props('disabled')).toBe(false);
    expect(wrapper.find('.row > div').classes()).toContain('cursor-grab');
    expect(env.updateUISettings).toHaveBeenLastCalledWith({
      show_all_attributes_conversation_panel: true,
    });

    env.uiSettings.value = { show_all_attributes_conversation_panel: true };
    const remembered = mountList();
    await flushPromises();
    expect(keys(remembered)).toHaveLength(6);
  });

  it('saves the dragged order and keeps hidden static elements in place', async () => {
    env.uiSettings.value = {
      conversation_elements_order_conversation_panel: [
        'static-x',
        'tier',
        'plan',
        'static-y',
      ],
    };
    const wrapper = mountList();
    const drag = wrapper.findComponent(Draggable);
    await drag.vm.$emit('start');
    await drag.vm.$emit('end');
    expect(env.updateUISettings).toHaveBeenLastCalledWith({
      conversation_elements_order_conversation_panel: [
        'static-x',
        'tier',
        'plan',
        'static-y',
      ],
    });

    env.uiSettings.value = {};
    const fresh = mountList();
    env.uiSettings.value = {};
    await fresh.findComponent(Draggable).vm.$emit('end');
    expect(env.updateUISettings).toHaveBeenLastCalledWith({
      conversation_elements_order_conversation_panel: ['plan', 'tier'],
    });
  });

  it('shows the empty state with an add link for admins only', () => {
    env.attributes = [];
    expect(mountList().text()).toContain(
      'CONVERSATION_CUSTOM_ATTRIBUTES.ADD_BUTTON_TEXT'
    );
    env.isAdmin.value = false;
    const wrapper = mountList();
    expect(wrapper.text()).toContain(
      'CONVERSATION_CUSTOM_ATTRIBUTES.NO_RECORDS_FOUND'
    );
    expect(wrapper.findComponent(NextButton).exists()).toBe(false);
  });

  it('updates and deletes conversation attributes', async () => {
    const wrapper = mountList();
    const attr = wrapper.findComponent(Attribute);
    attr.vm.$emit('update', 'tier', 'silver');
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenCalledWith('updateCustomAttributes', {
      conversationId: 11,
      customAttributes: { plan: 'pro', tier: 'silver' },
    });
    expect(useAlert).toHaveBeenLastCalledWith(
      'CUSTOM_ATTRIBUTES.FORM.UPDATE.SUCCESS'
    );

    attr.vm.$emit('delete', 'plan');
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenLastCalledWith(
      'updateCustomAttributes',
      {
        conversationId: 11,
        customAttributes: {},
      }
    );
    expect(useAlert).toHaveBeenLastCalledWith(
      'CUSTOM_ATTRIBUTES.FORM.DELETE.SUCCESS'
    );

    env.store.dispatch.mockRejectedValueOnce(
      Object.assign(new Error('x'), { response: { message: 'Bad value' } })
    );
    attr.vm.$emit('update', 'tier', '!');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('Bad value');
    env.store.dispatch.mockRejectedValueOnce(new Error('x'));
    attr.vm.$emit('update', 'tier', '!');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'CUSTOM_ATTRIBUTES.FORM.UPDATE.ERROR'
    );
    env.store.dispatch.mockRejectedValueOnce(
      Object.assign(new Error('x'), { response: { message: 'Locked' } })
    );
    attr.vm.$emit('delete', 'plan');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('Locked');
    env.store.dispatch.mockRejectedValueOnce(new Error('x'));
    attr.vm.$emit('delete', 'plan');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'CUSTOM_ATTRIBUTES.FORM.DELETE.ERROR'
    );
  });

  it('updates and deletes contact attributes and copies values', async () => {
    const wrapper = mountList({
      attributeType: 'contact_attribute',
      contactId: 3,
    });
    const attr = wrapper.findComponent(Attribute);
    attr.vm.$emit('update', 'tier', 'silver');
    attr.vm.$emit('delete', 'tier');
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenCalledWith('contacts/update', {
      id: 3,
      customAttributes: { tier: 'silver' },
    });
    expect(env.store.dispatch).toHaveBeenCalledWith(
      'contacts/deleteCustomAttributes',
      {
        id: 3,
        customAttributes: ['tier'],
      }
    );
    attr.vm.$emit('copy', 'gold');
    await flushPromises();
    expect(copyTextToClipboard).toHaveBeenCalledWith('gold');
    expect(useAlert).toHaveBeenLastCalledWith(
      'CUSTOM_ATTRIBUTES.COPY_SUCCESSFUL'
    );
  });
});
