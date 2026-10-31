/**
 * OneTeam behaviour spec for the custom attributes settings page.
 *
 * Store getters, account and inboxes are faked. Covers the tabs (company
 * only with the feature), switching models, search and empty states,
 * pre-chat and required-for-resolution badges, and the add, edit and
 * delete dialogs with delete alerts.
 */
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import AttributesIndex from '../Index.vue';

const env = vi.hoisted(() => ({}));

vi.mock('@vueuse/core', async importOriginal => {
  const { ref: appRef } = await import('vue');
  return {
    ...(await importOriginal()),
    useToggle: initial => {
      const state = appRef(initial);
      return [
        state,
        value => {
          state.value = typeof value === 'boolean' ? value : !state.value;
        },
      ];
    },
  };
});
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => env.store,
  useStoreGetters: () => env.getters,
  useMapGetter: () => env.inboxes,
}));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({
    currentAccount: env.account,
    isCloudFeatureEnabled: () => env.companies,
  }),
}));

const Header = {
  name: 'BaseSettingsHeader',
  props: ['searchQuery'],
  emits: ['update:searchQuery'],
  template:
    '<header><slot name="count" /><slot name="tabs" /><slot name="actions" /></header>',
};
const TabBar = {
  name: 'TabBar',
  props: ['tabs'],
  emits: ['tabChanged'],
  template: '<nav />',
};
const Item = {
  name: 'AttributeListItem',
  props: ['attribute', 'badges'],
  emits: ['edit', 'delete'],
  template: '<div class="item">{{ attribute.label }}</div>',
};
const AddAttribute = {
  name: 'AddAttribute',
  props: ['onClose', 'selectedAttributeModelTab'],
  template: '<div class="add" />',
};
const EditAttribute = {
  name: 'EditAttribute',
  props: ['selectedAttribute'],
  emits: ['onClose'],
  template: '<div class="edit" />',
};
const Modal = {
  name: 'WootModal',
  props: ['show', 'onClose'],
  template: '<div v-if="show"><slot /></div>',
};
const DeleteModal = {
  name: 'WootConfirmDeleteModal',
  props: ['title', 'confirmText'],
  emits: ['onConfirm', 'onClose'],
  template: '<div class="delete" />',
};

const byModel = {
  conversation_attribute: [
    {
      id: 1,
      attribute_display_name: 'Plan',
      attribute_key: 'plan',
      attribute_model: 'conversation_attribute',
      attribute_display_type: 'text',
    },
    {
      id: 2,
      attribute_display_name: 'Region',
      attribute_key: 'region',
      attribute_model: 'conversation_attribute',
    },
  ],
  contact_attribute: [
    {
      id: 3,
      attribute_display_name: 'Age',
      attribute_key: 'age',
      attribute_model: 'contact_attribute',
    },
  ],
  company_attribute: [],
};

const mountPage = async () => {
  const wrapper = mount(AttributesIndex, {
    global: {
      stubs: {
        SettingsLayout: {
          template:
            '<div><slot name="header" /><slot name="body" /><slot /></div>',
        },
        BaseSettingsHeader: Header,
        TabBar,
        Button: {
          name: 'Button',
          emits: ['click'],
          template: '<button class="add-btn" />',
        },
        AttributeListItem: Item,
        AddAttribute,
        EditAttribute,
        WootModal: Modal,
        WootConfirmDeleteModal: DeleteModal,
      },
    },
  });
  await flushPromises();
  return wrapper;
};

const items = wrapper => wrapper.findAllComponents(Item);
const tabBar = wrapper => wrapper.findComponent(TabBar);

describe('Custom attributes settings behaviour', () => {
  beforeEach(() => {
    env.companies = true;
    env.account = ref({
      settings: { conversation_required_attributes: ['plan'] },
    });
    env.inboxes = ref([
      { pre_chat_form_options: { pre_chat_fields: [{ name: 'region' }] } },
      {
        channel: {
          pre_chat_form_options: { pre_chat_fields: [{ name: 'age' }] },
        },
      },
      {},
    ]);
    env.store = { dispatch: vi.fn().mockResolvedValue() };
    env.getters = {
      'attributes/getUIFlags': ref({ isFetching: false, isUpdating: false }),
      'attributes/getAttributesByModel': ref(model => byModel[model]),
    };
  });

  it('lists conversation attributes with badges and the tabs', async () => {
    const wrapper = await mountPage();
    expect(env.store.dispatch).toHaveBeenCalledWith('attributes/get');
    expect(
      tabBar(wrapper)
        .props('tabs')
        .map(t => t.key)
    ).toEqual([0, 1, 2]);
    expect(wrapper.text()).toContain('ATTRIBUTES_MGMT.COUNT');
    expect(
      items(wrapper).map(i => [i.props('attribute').label, i.props('badges')])
    ).toEqual([
      ['Plan', [{ type: 'resolution' }]],
      ['Region', [{ type: 'pre-chat' }]],
    ]);
  });

  it('switches models, searches and shows empty states', async () => {
    env.companies = false;
    const wrapper = await mountPage();
    expect(tabBar(wrapper).props('tabs')).toHaveLength(2);
    await wrapper.findComponent(Header).vm.$emit('update:searchQuery', 'reg');
    expect(items(wrapper)).toHaveLength(1);
    await wrapper.findComponent(Header).vm.$emit('update:searchQuery', 'zzz');
    expect(wrapper.text()).toContain('ATTRIBUTES_MGMT.NO_RESULTS');

    await tabBar(wrapper).vm.$emit('tabChanged', { key: 1 });
    expect(
      items(wrapper).map(i => [i.props('attribute').label, i.props('badges')])
    ).toEqual([['Age', [{ type: 'pre-chat' }]]]);
    await tabBar(wrapper).vm.$emit('tabChanged', { key: 2 });
    expect(wrapper.text()).toContain('ATTRIBUTES_MGMT.LIST.EMPTY_RESULT.404');
    expect(wrapper.text()).not.toContain('ATTRIBUTES_MGMT.COUNT');
  });

  it('handles accounts and inboxes without settings', async () => {
    env.account.value = null;
    env.inboxes.value = null;
    const wrapper = await mountPage();
    expect(items(wrapper).map(i => i.props('badges'))).toEqual([[], []]);
  });

  it('opens the add dialog for the current tab', async () => {
    const wrapper = await mountPage();
    await tabBar(wrapper).vm.$emit('tabChanged', { key: 1 });
    await wrapper.findComponent({ name: 'Button' }).vm.$emit('click');
    const add = wrapper.findComponent(AddAttribute);
    expect(add.props('selectedAttributeModelTab')).toBe(1);
    add.props('onClose')();
    await flushPromises();
    expect(wrapper.findComponent(AddAttribute).exists()).toBe(false);
  });

  it('edits attributes', async () => {
    const wrapper = await mountPage();
    await items(wrapper)[0].vm.$emit('edit', byModel.conversation_attribute[0]);
    expect(
      wrapper.findComponent(EditAttribute).props('selectedAttribute').id
    ).toBe(1);
    await wrapper.findComponent(EditAttribute).vm.$emit('onClose');
    expect(wrapper.findComponent(EditAttribute).exists()).toBe(false);
  });

  it('deletes attributes with alerts', async () => {
    const wrapper = await mountPage();
    await items(wrapper)[1].vm.$emit(
      'delete',
      byModel.conversation_attribute[1]
    );
    const modal = () => wrapper.findComponent(DeleteModal);
    expect(modal().props('confirmText')).toBe(
      'ATTRIBUTES_MGMT.DELETE.CONFIRM.YES Region'
    );

    env.store.dispatch.mockRejectedValueOnce(
      Object.assign(new Error('x'), { response: { message: 'In use' } })
    );
    modal().vm.$emit('onConfirm');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('In use');
    env.store.dispatch.mockRejectedValueOnce(new Error('x'));
    modal().vm.$emit('onConfirm');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'ATTRIBUTES_MGMT.DELETE.API.ERROR_MESSAGE'
    );

    modal().vm.$emit('onConfirm');
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenLastCalledWith('attributes/delete', 2);
    expect(useAlert).toHaveBeenLastCalledWith(
      'ATTRIBUTES_MGMT.DELETE.API.SUCCESS_MESSAGE'
    );
    expect(modal().exists()).toBe(false);

    await items(wrapper)[0].vm.$emit('delete', { id: 1 });
    expect(modal().props('confirmText')).toBe(
      'ATTRIBUTES_MGMT.DELETE.CONFIRM.YES '
    );
    await modal().vm.$emit('onClose');
    expect(modal().exists()).toBe(false);
  });
});
