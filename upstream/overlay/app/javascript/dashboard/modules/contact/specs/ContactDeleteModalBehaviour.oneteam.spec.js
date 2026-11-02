/**
 * OneTeam behaviour spec for the delete contact confirmation popover.
 *
 * Covers the confirmation text with the contact's name, cancelling,
 * deleting (alert, close, and where the agent lands next: the matching
 * conversation list, the inbox view, the contacts list, or staying on
 * the contacts list), the deleting state and a failed delete (with and
 * without an error message).
 */
import { ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import ContactDeleteModal from '../ContactDeleteModal.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('vuex', async importOriginal => ({
  ...(await importOriginal()),
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
}));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
  useRouter: () => ({ push: env.push }),
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => env.uiFlags,
}));

const hide = vi.fn();
const Popover = {
  name: 'Popover',
  emits: ['hide'],
  template: '<div><slot /><slot name="content" :hide="hide" /></div>',
  setup: () => ({ hide }),
};
const Button = {
  name: 'Button',
  props: ['label', 'isLoading', 'disabled'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};

const mountModal = routeName => {
  env.route = { name: routeName };
  return mount(ContactDeleteModal, {
    props: { contact: { id: 6, name: 'Ann' } },
    global: { stubs: { Popover, Button } },
    slots: { trigger: '<i class="trigger" />' },
  });
};

const confirm = wrapper => wrapper.findAllComponents(Button)[1];

describe('ContactDeleteModal behaviour', () => {
  beforeEach(() => {
    hide.mockClear();
    useAlert.mockClear();
    env.push = vi.fn();
    env.dispatch = vi.fn().mockResolvedValue();
    env.uiFlags = ref({ isDeleting: false });
  });

  it('asks for confirmation and cancels', async () => {
    const wrapper = mountModal('contacts_dashboard');
    expect(wrapper.find('.trigger').exists()).toBe(true);
    expect(wrapper.text()).toContain('DELETE_CONTACT.CONFIRM.MESSAGE Ann?');
    await wrapper.findAllComponents(Button)[0].trigger('click');
    expect(hide).toHaveBeenCalled();
    await wrapper.findComponent(Popover).vm.$emit('hide');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it.each([
    ['inbox_conversation', { name: 'home' }],
    ['inbox_view_conversation', { name: 'inbox_view' }],
    ['contact_profile_dashboard', { name: 'contacts_dashboard' }],
  ])('deletes from %s and moves on', async (routeName, next) => {
    const wrapper = mountModal(routeName);
    await confirm(wrapper).trigger('click');
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('contacts/delete', 6);
    expect(useAlert).toHaveBeenCalledWith('DELETE_CONTACT.API.SUCCESS_MESSAGE');
    expect(hide).toHaveBeenCalled();
    expect(wrapper.emitted('deleted')).toHaveLength(1);
    expect(wrapper.emitted('close')).toHaveLength(1);
    expect(env.push).toHaveBeenCalledWith(next);
  });

  it('stays on the contacts list after deleting there', async () => {
    const wrapper = mountModal('contacts_dashboard');
    await confirm(wrapper).trigger('click');
    await flushPromises();
    expect(env.push).not.toHaveBeenCalled();
  });

  it('shows the deleting state and reports failures', async () => {
    env.uiFlags.value = { isDeleting: true };
    const wrapper = mountModal('contacts_dashboard');
    expect(confirm(wrapper).props()).toMatchObject({
      isLoading: true,
      disabled: true,
    });

    env.dispatch.mockRejectedValueOnce(new Error('Has conversations'));
    await confirm(wrapper).trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('Has conversations');

    env.dispatch.mockRejectedValueOnce({});
    await confirm(wrapper).trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'DELETE_CONTACT.API.ERROR_MESSAGE'
    );
    expect(wrapper.emitted('deleted')).toBeUndefined();
  });
});
