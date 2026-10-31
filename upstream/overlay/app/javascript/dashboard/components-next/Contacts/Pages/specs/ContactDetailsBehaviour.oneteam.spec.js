/**
 * OneTeam behaviour spec for the contact details page body.
 *
 * Covers the header (name, identifier, created and last activity times),
 * the avatar (thumbnail, upload preview, upload and delete outcomes),
 * saving the form (payload without custom attributes, refresh from the
 * store, contactable inboxes, failures, button state), and the delete
 * contact dialog with its redirect.
 */
import { computed } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import ContactDetails from '../ContactDetails.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('shared/helpers/timeHelper', () => ({ dynamicTime: t => `ago(${t})` }));
vi.mock('shared/composables/useExactTimestamp', () => ({
  useExactTimestamp: () => t => `exact(${t})`,
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => computed(() => env.uiFlags),
  useStore: () => ({
    dispatch: (...args) => env.dispatch(...args),
    getters: { 'contacts/getContactById': id => env.stored[id] },
  }),
}));

const Avatar = {
  name: 'Avatar',
  props: ['src', 'name'],
  emits: ['upload', 'delete'],
  template: '<div class="avatar" />',
};
const ContactsForm = {
  name: 'ContactsForm',
  props: ['contactData', 'isDetailsView'],
  emits: ['update'],
  data: () => ({ state: { name: 'Form name' }, isFormInvalid: false }),
  template: '<div class="form" />',
};
const Button = {
  name: 'Button',
  props: { label: String, isLoading: Boolean, disabled: Boolean },
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};
const DeleteDialog = {
  name: 'ConfirmContactDeleteDialog',
  props: ['selectedContact'],
  emits: ['goToContactsList'],
  data: () => ({ dialogRef: { open: () => env.opened.push(true) } }),
  template: '<div class="dialog" />',
};

const contact = {
  id: 4,
  name: 'Ada',
  identifier: 'ada-1',
  createdAt: 100,
  lastActivityAt: 200,
  thumbnail: 'https://cdn/ada.png',
  customAttributes: { plan: 'pro' },
};

const mountDetails = (selectedContact = contact) =>
  mount(ContactDetails, {
    props: { selectedContact },
    global: {
      directives: {
        tooltip: {
          updated: (el, binding) => env.tooltips.push(binding.value.content),
        },
      },
      stubs: {
        Avatar,
        ContactsForm,
        Button,
        ConfirmContactDeleteDialog: DeleteDialog,
        ContactLabels: { props: ['contactId'], template: '<div />' },
        Policy: { template: '<div><slot /></div>' },
      },
    },
  });

describe('Contact details behaviour', () => {
  beforeEach(() => {
    env.uiFlags = { isUpdating: false };
    env.dispatch = vi.fn();
    env.opened = [];
    env.tooltips = [];
    env.stored = { 4: { ...contact, name: 'Ada Stored' } };
  });

  it('shows the contact header and avatar', async () => {
    const wrapper = mountDetails();
    await flushPromises();
    expect(wrapper.find('h3').text()).toBe('Ada');
    expect(wrapper.text()).toContain('ada-1');
    expect(env.tooltips.slice(-2)).toEqual(['exact(100)', 'exact(200)']);
    expect(wrapper.findComponent(Avatar).props()).toEqual({
      src: 'https://cdn/ada.png',
      name: 'Ada',
    });
  });

  it('handles a contact without identifier, times or avatar', async () => {
    const wrapper = mountDetails({ id: 5 });
    await flushPromises();
    expect(wrapper.find('.i-ph-user-gear').exists()).toBe(false);
    expect(wrapper.findComponent(Avatar).props()).toEqual({
      src: '',
      name: '',
    });
  });

  it('saves the form without custom attributes and refreshes it', async () => {
    const wrapper = mountDetails();
    await flushPromises();
    await wrapper
      .findComponent(ContactsForm)
      .vm.$emit('update', { email: 'a@b.co' });
    await wrapper.findAll('button')[0].trigger('click');
    await flushPromises();
    expect(env.dispatch).toHaveBeenNthCalledWith(1, 'contacts/update', {
      id: 4,
      name: 'Ada',
      identifier: 'ada-1',
      createdAt: 100,
      lastActivityAt: 200,
      thumbnail: 'https://cdn/ada.png',
      email: 'a@b.co',
      resolveLegacyCompany: true,
    });
    expect(env.dispatch).toHaveBeenNthCalledWith(
      2,
      'contacts/fetchContactableInbox',
      4
    );
    expect(wrapper.findComponent(ContactsForm).props('contactData').name).toBe(
      'Ada Stored'
    );
    expect(useAlert).toHaveBeenCalledWith(
      'CONTACTS_LAYOUT.CARD.EDIT_DETAILS_FORM.SUCCESS_MESSAGE'
    );
    env.dispatch.mockRejectedValueOnce(new Error('x'));
    await wrapper.findAll('button')[0].trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'CONTACTS_LAYOUT.CARD.EDIT_DETAILS_FORM.ERROR_MESSAGE'
    );
  });

  it('disables saving while updating', () => {
    env.uiFlags = { isUpdating: true };
    const wrapper = mountDetails();
    expect(wrapper.findAllComponents(Button)[0].props()).toMatchObject({
      isLoading: true,
      disabled: true,
    });
  });

  it('uploads an avatar with the current form state', async () => {
    const wrapper = mountDetails();
    const avatar = wrapper.findComponent(Avatar);
    await avatar.vm.$emit('upload', { file: 'file', url: 'blob:preview' });
    await flushPromises();
    expect(avatar.props('src')).toBe('blob:preview');
    expect(env.dispatch).toHaveBeenCalledWith('contacts/update', {
      name: 'Form name',
      avatar: 'file',
      isFormData: true,
    });
    expect(useAlert).toHaveBeenCalledWith(
      'CONTACTS_LAYOUT.DETAILS.AVATAR.UPLOAD.SUCCESS_MESSAGE'
    );
    env.dispatch.mockRejectedValueOnce(new Error('x'));
    await avatar.vm.$emit('upload', { file: 'file', url: 'blob:2' });
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'CONTACTS_LAYOUT.DETAILS.AVATAR.UPLOAD.ERROR_MESSAGE'
    );
  });

  it('deletes the avatar and reports failures', async () => {
    const wrapper = mountDetails();
    await flushPromises();
    const avatar = wrapper.findComponent(Avatar);
    await avatar.vm.$emit('delete');
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('contacts/deleteAvatar', 4);
    expect(avatar.props('src')).toBe('');
    env.dispatch.mockRejectedValueOnce(new Error('Locked'));
    await avatar.vm.$emit('delete');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('Locked');
    env.dispatch.mockRejectedValueOnce({});
    await avatar.vm.$emit('delete');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'CONTACTS_LAYOUT.DETAILS.AVATAR.DELETE.ERROR_MESSAGE'
    );
  });

  it('clears the avatar locally for a contact without an id', async () => {
    const wrapper = mountDetails({ name: 'Draft', thumbnail: 'x' });
    await flushPromises();
    await wrapper.findComponent(Avatar).vm.$emit('delete');
    await flushPromises();
    expect(env.dispatch).not.toHaveBeenCalled();
    expect(wrapper.findComponent(Avatar).props('src')).toBe('');
  });

  it('opens the delete dialog and forwards the redirect', async () => {
    const wrapper = mountDetails();
    await wrapper.findAll('button')[1].trigger('click');
    expect(env.opened).toHaveLength(1);
    await wrapper.findComponent(DeleteDialog).vm.$emit('goToContactsList');
    expect(wrapper.emitted('goToContactsList')).toHaveLength(1);
  });
});
