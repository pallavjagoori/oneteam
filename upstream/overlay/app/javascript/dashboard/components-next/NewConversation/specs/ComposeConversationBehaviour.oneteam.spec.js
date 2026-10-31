/**
 * OneTeam behaviour spec for the compose-conversation popover.
 *
 * The form child is stubbed so the popover's own logic can be checked:
 * contact search, creating or picking a contact and loading its inboxes,
 * picking an inbox, creating the conversation (with success and error
 * alerts), discarding, and preloading a contact from the `contactId` prop.
 */
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import ComposeConversation from '../ComposeConversation.vue';
import { ExceptionWithMessage } from 'shared/helpers/CustomErrors';

const env = vi.hoisted(() => ({}));

vi.mock('@chatwoot/utils', () => ({ debounce: fn => fn }));
vi.mock('dashboard/composables', () => ({
  useAlert: (...args) => env.alert(...args),
}));
vi.mock('shared/helpers/mitt', () => ({
  emitter: { emit: (...args) => env.bus(...args) },
}));
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({
    fetchSignatureFlagFromUISettings: type => `sig:${type}`,
  }),
}));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
  useMapGetter: name => env.getters[name],
}));
vi.mock(
  'dashboard/components-next/NewConversation/helpers/composeConversationHelper',
  () => ({
    createContactSearcher: () => query => env.search(query),
    createNewContact: value => env.create(value),
    fetchContactableInboxes: id => env.fetchInboxes(id),
    processContactableInboxes: inboxes => inboxes.map(i => ({ ...i, p: 1 })),
    mergeInboxDetails: (inboxes, list) =>
      inboxes.map(i => ({ ...i, merged: list.length })),
  })
);

const Popover = {
  name: 'Popover',
  emits: ['show', 'hide'],
  setup(_, { expose }) {
    expose({ hide: () => env.hide() });
  },
  template:
    '<div><slot :is-open="true" /><div class="content"><slot name="content" /></div></div>',
};
const Form = {
  name: 'ComposeNewConversationForm',
  inheritAttrs: false,
  setup: (_, { attrs }) => {
    env.form = attrs;
    return () => null;
  },
};

const mountCompose = (props = {}) =>
  mount(ComposeConversation, {
    props,
    slots: { trigger: '<button class="trigger">{{ params.isOpen }}</button>' },
    global: {
      stubs: { Popover, ComposeNewConversationForm: Form },
    },
  });

const on = (name, ...args) =>
  env.form[`on${name[0].toUpperCase()}${name.slice(1)}`](...args);

describe('ComposeConversation behaviour', () => {
  beforeEach(() => {
    env.alert = vi.fn();
    env.bus = vi.fn();
    env.hide = vi.fn();
    env.dispatch = vi.fn();
    env.search = vi.fn();
    env.create = vi.fn();
    env.fetchInboxes = vi.fn();
    env.contacts = { 7: { id: 7, name: 'Ann', contactInboxes: [{ id: 1 }] } };
    env.getters = {
      'contacts/getContactById': ref(id => env.contacts[id]),
      'contacts/getUIFlags': ref({ isFetching: false }),
      getCurrentUser: ref({ id: 1 }),
      'globalConfig/get': ref({ directUploadsEnabled: true }),
      'contactConversations/getUIFlags': ref({ isCreating: false }),
      getMessageSignature: ref('Sig'),
      'inboxes/getInboxes': ref([{ id: 1 }, { id: 2 }]),
    };
  });

  it('renders the trigger and passes the store state to the form', () => {
    const wrapper = mountCompose();
    expect(wrapper.find('.trigger').text()).toBe('true');
    expect(env.form).toMatchObject({
      contacts: [],
      'contact-id': null,
      'is-loading': false,
      'current-user': { id: 1 },
      'selected-contact': null,
      'target-inbox': null,
      'is-direct-uploads-enabled': true,
      'message-signature': 'Sig',
      'send-with-signature': 'sig:undefined',
    });
  });

  it('notifies the app and refreshes inboxes when opened and closed', () => {
    const wrapper = mountCompose();
    const popover = wrapper.findComponent({ name: 'Popover' });
    popover.vm.$emit('show');
    expect(env.bus).toHaveBeenCalledWith('newConversationModal', true);
    expect(env.dispatch).toHaveBeenCalledWith('inboxes/get');
    popover.vm.$emit('hide');
    expect(env.bus).toHaveBeenCalledWith('newConversationModal', false);
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('searches contacts, ignoring aborted searches and alerting on errors', async () => {
    const wrapper = mountCompose();
    env.search.mockResolvedValueOnce([{ id: 3 }]);
    on('searchContacts', 'an');
    await flushPromises();
    expect(env.form.contacts).toEqual([{ id: 3 }]);
    expect(env.form['is-loading']).toBe(false);

    env.search.mockResolvedValueOnce(null);
    on('searchContacts', 'ann');
    await flushPromises();
    // A superseded search leaves the spinner for the newer one.
    expect(env.form['is-loading']).toBe(true);
    expect(env.form.contacts).toEqual([]);

    env.search.mockRejectedValueOnce(new Error('x'));
    on('searchContacts', 'anne');
    await flushPromises();
    expect(env.form['is-loading']).toBe(false);
    expect(env.alert).toHaveBeenCalledWith(
      'COMPOSE_NEW_CONVERSATION.CONTACT_SEARCH.ERROR_MESSAGE'
    );

    env.search.mockResolvedValueOnce([{ id: 4 }]);
    on('searchContacts', 'b');
    await flushPromises();
    on('resetContactSearch');
    await flushPromises();
    expect(env.form.contacts).toEqual([]);
    wrapper.unmount();
  });

  it('picks a contact and loads its inboxes', async () => {
    mountCompose();
    env.fetchInboxes.mockResolvedValue([{ id: 1 }]);
    on('updateSelectedContact', { value: 5, action: 'contact', id: 5 });
    await flushPromises();
    expect(env.fetchInboxes).toHaveBeenCalledWith(5);
    expect(env.form['selected-contact']).toEqual({
      id: 5,
      contactInboxes: [{ id: 1, merged: 2 }],
    });
    expect(env.form['is-fetching-inboxes']).toBe(false);

    env.fetchInboxes.mockRejectedValue(new Error('x'));
    on('updateSelectedContact', { value: 6, action: 'contact', id: 6 });
    await flushPromises();
    expect(env.form['is-fetching-inboxes']).toBe(false);
    expect(env.form['selected-contact']).toEqual({ id: 6 });

    env.fetchInboxes.mockClear();
    on('updateSelectedContact', { value: 'x', action: 'contact' });
    await flushPromises();
    expect(env.fetchInboxes).not.toHaveBeenCalled();
    expect(env.form['selected-contact']).toEqual({});
  });

  it('creates a new contact, alerting with the API message or a fallback', async () => {
    mountCompose();
    let finish;
    env.create.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    env.fetchInboxes.mockResolvedValue([]);
    on('updateSelectedContact', { value: 'a@x.test', action: 'create' });
    await flushPromises();
    expect(env.form['is-creating-contact']).toBe(true);
    finish({ id: 9 });
    await flushPromises();
    expect(env.create).toHaveBeenCalledWith('a@x.test');
    expect(env.form['is-creating-contact']).toBe(false);
    expect(env.form['selected-contact']).toEqual({
      id: 9,
      contactInboxes: [],
    });

    env.create.mockRejectedValueOnce({
      response: { data: { message: 'Email taken' } },
    });
    on('updateSelectedContact', { value: 'b', action: 'create' });
    await flushPromises();
    expect(env.alert).toHaveBeenLastCalledWith('Email taken');
    expect(env.form['is-creating-contact']).toBe(false);

    env.create.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'email' }] } },
    });
    on('updateSelectedContact', { value: 'c', action: 'create' });
    await flushPromises();
    expect(env.alert).toHaveBeenLastCalledWith(
      'COMPOSE_NEW_CONVERSATION.CONTACT_CREATE.ERROR_MESSAGE'
    );
  });

  it('picks and removes an inbox, clearing the form when removed', async () => {
    mountCompose();
    const state = env.form['form-state'];
    Object.assign(state, { subject: 'S', message: 'M', attachedFiles: [1] });
    on('updateTargetInbox', { id: 2, channelType: 'Channel::Email' });
    await flushPromises();
    expect(env.form['target-inbox']).toEqual({
      id: 2,
      channelType: 'Channel::Email',
    });
    expect(env.form['send-with-signature']).toBe('sig:Channel::Email');
    expect(state.subject).toBe('S');
    on('updateTargetInbox', null);
    await flushPromises();
    expect(state).toMatchObject({
      subject: '',
      message: 'M',
      attachedFiles: [],
    });
  });

  it('clears the selected contact and inbox', async () => {
    mountCompose();
    on('updateSelectedContact', { value: 'x', action: 'contact' });
    on('updateTargetInbox', { id: 2 });
    await flushPromises();
    on('clearSelectedContact');
    await flushPromises();
    expect(env.form['selected-contact']).toBe(null);
    expect(env.form['target-inbox']).toBe(null);
  });

  it('creates the conversation, then closes with a link to it', async () => {
    mountCompose();
    on('updateSelectedContact', { value: 'x', action: 'contact' });
    env.form['form-state'].message = 'Hi';
    env.dispatch.mockResolvedValueOnce({ account_id: 1, id: 42 });
    const result = await on('createConversation', {
      payload: { a: 1 },
      isFromWhatsApp: true,
    });
    await flushPromises();
    expect(result).toBe(true);
    expect(env.dispatch).toHaveBeenCalledWith('contactConversations/create', {
      params: { a: 1 },
      isFromWhatsApp: true,
    });
    expect(env.alert).toHaveBeenCalledWith(
      'COMPOSE_NEW_CONVERSATION.FORM.SUCCESS_MESSAGE',
      {
        type: 'link',
        to: '/app/accounts/1/conversations/42',
        message: 'COMPOSE_NEW_CONVERSATION.FORM.GO_TO_CONVERSATION',
      }
    );
    expect(env.hide).toHaveBeenCalled();
    expect(env.form['form-state'].message).toBe('');
    expect(env.form['selected-contact']).toBe(null);
  });

  it('alerts when creating the conversation fails', async () => {
    mountCompose();
    env.dispatch.mockRejectedValueOnce(new ExceptionWithMessage('No inbox'));
    expect(await on('createConversation', { payload: {} })).toBe(false);
    expect(env.alert).toHaveBeenLastCalledWith('No inbox');
    env.dispatch.mockRejectedValueOnce(new Error('x'));
    expect(await on('createConversation', { payload: {} })).toBe(false);
    expect(env.alert).toHaveBeenLastCalledWith(
      'COMPOSE_NEW_CONVERSATION.FORM.ERROR_MESSAGE'
    );
  });

  it('preloads the contact from contactId and keeps it on discard', async () => {
    const wrapper = mountCompose({ contactId: '7' });
    expect(env.form['selected-contact']).toEqual({
      id: 7,
      name: 'Ann',
      contactInboxes: [{ id: 1, p: 1, merged: 2 }],
    });
    on('discard');
    await flushPromises();
    expect(env.hide).toHaveBeenCalled();
    expect(env.form['selected-contact'].id).toBe(7);

    // Editing the same contact re-merges its inboxes without clearing the form.
    env.form['form-state'].message = 'Keep';
    env.contacts[7] = { id: 7, name: 'Ann B' };
    env.getters['contacts/getContactById'].value = id => env.contacts[id];
    await flushPromises();
    expect(env.form['selected-contact']).toEqual({
      id: 7,
      name: 'Ann B',
      contactInboxes: [],
    });
    expect(env.form['form-state'].message).toBe('Keep');

    // Switching contacts clears the form first.
    env.contacts[8] = { id: 8, contactInboxes: [] };
    await wrapper.setProps({ contactId: '8' });
    await flushPromises();
    expect(env.form['form-state'].message).toBe('');
    expect(env.form['selected-contact'].id).toBe(8);

    // An unknown contact leaves the selection alone.
    await wrapper.setProps({ contactId: '99' });
    await flushPromises();
    expect(env.form['selected-contact'].id).toBe(8);
  });
});
