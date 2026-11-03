/**
 * OneTeam behaviour spec for the contact sidebar ContactCustomAttributeItem.
 *
 * Covers picking the attribute component by display type, updating and
 * deleting the attribute, and the success and error alerts.
 */
import { mount, flushPromises } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import ContactCustomAttributeItem from '../ContactCustomAttributeItem.vue';

const store = vi.hoisted(() => ({ dispatch: vi.fn() }));

vi.mock('dashboard/composables/store', () => ({ useStore: () => store }));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { contactId: 12 } }),
}));

/**
 * Builds a named attribute stub.
 *
 * @param {string} name component name
 * @returns {object} stub component
 */
const attributeStub = name => ({
  name,
  props: { attribute: Object, isEditingView: Boolean },
  emits: ['update', 'delete'],
  template: `<div class="${name}" />`,
});

const stubs = {
  ListAttribute: attributeStub('ListAttribute'),
  CheckboxAttribute: attributeStub('CheckboxAttribute'),
  DateAttribute: attributeStub('DateAttribute'),
  OtherAttribute: attributeStub('OtherAttribute'),
};

/**
 * Mounts the item.
 *
 * @param {string} type attribute display type
 * @param {boolean} [isEditingView] editing view flag
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountItem = (type, isEditingView = false) =>
  mount(ContactCustomAttributeItem, {
    props: {
      attribute: {
        attributeKey: 'plan',
        attributeDisplayName: 'Plan',
        attributeDisplayType: type,
      },
      isEditingView,
    },
    global: { stubs },
  });

const child = wrapper => wrapper.findComponent(stubs.OtherAttribute);

describe('ContactCustomAttributeItem behaviour', () => {
  it.each([
    ['list', 'ListAttribute'],
    ['checkbox', 'CheckboxAttribute'],
    ['date', 'DateAttribute'],
    ['text', 'OtherAttribute'],
  ])('renders %s with %s', (type, name) => {
    const wrapper = mountItem(type);
    expect(wrapper.find(`.${name}`).exists()).toBe(true);
    expect(wrapper.text()).toContain('Plan');
  });

  it('updates the attribute and alerts success', async () => {
    store.dispatch.mockResolvedValue({});
    const wrapper = mountItem('text', true);
    expect(wrapper.classes()).toContain('min-h-10');
    child(wrapper).vm.$emit('update', 'pro');
    await flushPromises();
    expect(store.dispatch).toHaveBeenCalledWith('contacts/update', {
      id: 12,
      customAttributes: { plan: 'pro' },
    });
    expect(useAlert).toHaveBeenCalledWith(
      'CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.API.SUCCESS_MESSAGE'
    );
  });

  it('deletes the attribute and alerts success', async () => {
    store.dispatch.mockResolvedValue({});
    const wrapper = mountItem('text');
    expect(wrapper.classes()).toContain('min-h-11');
    child(wrapper).vm.$emit('delete');
    await flushPromises();
    expect(store.dispatch).toHaveBeenCalledWith(
      'contacts/deleteCustomAttributes',
      { id: 12, customAttributes: ['plan'] }
    );
    expect(useAlert).toHaveBeenCalledWith(
      'CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.API.DELETE_SUCCESS_MESSAGE'
    );
  });

  it('alerts the API message or a default on failure', async () => {
    store.dispatch.mockRejectedValueOnce({ response: { message: 'Locked' } });
    store.dispatch.mockRejectedValueOnce(new Error('x'));
    store.dispatch.mockRejectedValueOnce({ response: { message: 'Gone' } });
    store.dispatch.mockRejectedValueOnce(new Error('y'));
    const wrapper = mountItem('text');
    child(wrapper).vm.$emit('update', 'a');
    await flushPromises();
    child(wrapper).vm.$emit('update', 'b');
    await flushPromises();
    child(wrapper).vm.$emit('delete');
    await flushPromises();
    child(wrapper).vm.$emit('delete');
    await flushPromises();
    expect(useAlert.mock.calls.map(call => call[0])).toEqual([
      'Locked',
      'CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.API.UPDATE_ERROR',
      'Gone',
      'CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.API.DELETE_ERROR',
    ]);
  });
});
