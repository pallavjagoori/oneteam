import * as Sentry from '@sentry/vue';
import ContactAPI from 'dashboard/api/contacts';
import {
  DuplicateContactException,
  ExceptionWithMessage,
} from 'shared/helpers/CustomErrors';
import { actions } from '../../contacts/actions';
import { getters } from '../../contacts/getters';
import { mutations } from '../../contacts/mutations';
import types from '../../../mutation-types';

/*
 * OneTeam coverage for the contacts Vuex module: search paging, form-data
 * uploads with social profiles, import/export/delete errors, contactable
 * inboxes, presence updates and the list mutations.
 */
vi.mock('dashboard/api/contacts', () => ({
  default: Object.fromEntries(
    [
      'search',
      'update',
      'create',
      'importContacts',
      'exportContacts',
      'delete',
      'getContactableInboxes',
      'filter',
    ].map(name => [name, vi.fn()])
  ),
}));
vi.mock('dashboard/helper/AnalyticsHelper', () => ({
  default: { track: vi.fn() },
}));
vi.mock('@sentry/vue', () => ({
  setContext: vi.fn(),
  captureException: vi.fn(),
}));

const withMessage = message => ({ response: { data: { message } } });

describe('contacts store (OneTeam)', () => {
  const commit = vi.fn();

  afterEach(() => vi.clearAllMocks());

  describe('search', () => {
    it('replaces the list, or appends a further page', async () => {
      ContactAPI.search.mockResolvedValue({
        data: { payload: [{ id: 1 }], meta: { count: 1 } },
      });
      await actions.search({ commit }, { search: 'jo', page: 1 });
      expect(commit.mock.calls.map(([type]) => type)).toEqual([
        types.SET_CONTACT_UI_FLAG,
        types.CLEAR_CONTACTS,
        types.SET_CONTACTS,
        types.SET_CONTACT_META,
        types.SET_CONTACT_UI_FLAG,
      ]);

      commit.mockClear();
      await actions.search({ commit }, { search: 'jo', page: 2, append: true });
      expect(commit).not.toHaveBeenCalledWith(types.CLEAR_CONTACTS);
      expect(commit).toHaveBeenCalledWith(types.APPEND_CONTACTS, [{ id: 1 }]);
    });

    it('clears the loading flag on failure', async () => {
      ContactAPI.search.mockRejectedValue(new Error('x'));
      await actions.search({ commit }, { search: 'jo' });
      expect(commit).toHaveBeenLastCalledWith(types.SET_CONTACT_UI_FLAG, {
        isFetching: false,
      });
    });
  });

  describe('form data', () => {
    it('sends set fields, a blank company and every social profile', async () => {
      ContactAPI.update.mockResolvedValue({ data: { payload: { id: 1 } } });
      await actions.update(
        { commit },
        {
          id: 1,
          isFormData: true,
          name: 'Jo',
          email: '',
          companyId: null,
          customAttributes: { tier: 'gold' },
          additionalAttributes: {
            city: 'Pune',
            socialProfiles: { twitter: 'jo', github: 'jo-dev' },
          },
        }
      );
      const form = ContactAPI.update.mock.calls[0][1];
      expect(form.get('name')).toBe('Jo');
      expect(form.has('email')).toBe(false);
      expect(form.get('company_id')).toBe('');
      expect(form.get('additional_attributes[city]')).toBe('Pune');
      expect(form.get('additional_attributes[social_profiles][github]')).toBe(
        'jo-dev'
      );
    });

    it('builds form data for a new contact without additional attributes', async () => {
      ContactAPI.create.mockRejectedValue(withMessage('Bad'));
      await expect(
        actions.create(
          { commit },
          {
            isFormData: true,
            name: 'Jo',
            additionalAttributes: { socialProfiles: {} },
          }
        )
      ).rejects.toBeInstanceOf(ExceptionWithMessage);
      expect(ContactAPI.create.mock.calls[0][0]).toBeInstanceOf(FormData);
    });
  });

  describe('errors', () => {
    it('keeps the default duplicate message when the server sends none', async () => {
      ContactAPI.update.mockRejectedValue({
        response: { status: 422, data: { attributes: ['email'] } },
      });
      const error = await actions
        .update({ commit }, { id: 1, name: 'Jo' })
        .catch(e => e);
      expect(error).toBeInstanceOf(DuplicateContactException);
      expect(error.contactErrorDetail).toBeNull();
      expect(error.data).toEqual(['email']);
    });

    it('raises the server message on a failed import, and ignores others', async () => {
      ContactAPI.importContacts.mockRejectedValueOnce(withMessage('Bad CSV'));
      await expect(actions.import({ commit }, 'file')).rejects.toBeInstanceOf(
        ExceptionWithMessage
      );
      ContactAPI.importContacts.mockRejectedValueOnce(new Error('offline'));
      await expect(actions.import({ commit }, 'file')).resolves.toBeUndefined();
      ContactAPI.importContacts.mockResolvedValueOnce({});
      await actions.import({ commit }, 'file');
      expect(commit).toHaveBeenLastCalledWith(types.SET_CONTACT_UI_FLAG, {
        isImporting: false,
      });
    });

    it.each([
      ['export', 'exportContacts', { payload: [], label: 'vip' }],
      ['delete', 'delete', 1],
    ])(
      '%s raises the server message or the raw error',
      async (action, method, payload) => {
        ContactAPI[method].mockResolvedValueOnce({});
        await actions[action]({ commit }, payload);
        ContactAPI[method].mockRejectedValueOnce(withMessage('Not allowed'));
        await expect(actions[action]({ commit }, payload)).rejects.toThrow(
          'Not allowed'
        );
        ContactAPI[method].mockRejectedValueOnce('offline');
        await expect(actions[action]({ commit }, payload)).rejects.toThrow(
          'offline'
        );
      }
    );
  });

  describe('contactable inboxes', () => {
    it('stores the inboxes on the contact', async () => {
      ContactAPI.getContactableInboxes.mockResolvedValue({
        data: { payload: [{ inbox: { id: 2 } }] },
      });
      await actions.fetchContactableInbox({ commit }, '5');
      expect(commit).toHaveBeenCalledWith(types.SET_CONTACT_ITEM, {
        id: 5,
        contact_inboxes: [{ inbox: { id: 2 } }],
      });
      expect(commit).toHaveBeenLastCalledWith(types.SET_CONTACT_UI_FLAG, {
        isFetchingInboxes: false,
      });
    });

    it('raises the server message or the raw error', async () => {
      ContactAPI.getContactableInboxes.mockRejectedValueOnce(withMessage('No'));
      await expect(
        actions.fetchContactableInbox({ commit }, 1)
      ).rejects.toBeInstanceOf(ExceptionWithMessage);
      ContactAPI.getContactableInboxes.mockRejectedValueOnce('down');
      await expect(
        actions.fetchContactableInbox({ commit }, 1)
      ).rejects.toThrow('down');
    });
  });

  it('passes presence updates on', () => {
    actions.updatePresence({ commit }, { 1: 'online' });
    expect(commit).toHaveBeenCalledWith(types.UPDATE_CONTACTS_PRESENCE, {
      1: 'online',
    });
  });

  it('clears the updating flag if storing the contact fails', async () => {
    const failing = vi.fn(type => {
      if (type === types.EDIT_CONTACT) throw new Error('bad record');
    });
    await actions.updateContact({ commit: failing }, { id: 1 });
    expect(failing).toHaveBeenLastCalledWith(types.SET_CONTACT_UI_FLAG, {
      isUpdating: false,
    });
  });

  describe('filter', () => {
    it('returns results without touching the list when asked', async () => {
      ContactAPI.filter.mockResolvedValue({
        data: { payload: [{ id: 3 }], meta: {} },
      });
      await expect(
        actions.filter({ commit }, { resetState: false })
      ).resolves.toEqual([{ id: 3 }]);
      expect(ContactAPI.filter).toHaveBeenCalledWith(1, undefined, undefined);
      expect(commit).not.toHaveBeenCalledWith(types.CLEAR_CONTACTS);
    });

    it('returns no contacts on failure', async () => {
      ContactAPI.filter.mockRejectedValue(new Error('x'));
      await expect(actions.filter({ commit })).resolves.toEqual([]);
    });
  });

  describe('mutations', () => {
    const fresh = () => ({
      uiFlags: {},
      records: { 1: { id: 1, name: 'Old' } },
      sortOrder: [1],
      meta: {},
    });

    it('merges UI flags and clears the list', () => {
      const state = fresh();
      mutations[types.SET_CONTACT_UI_FLAG](state, { isFetching: true });
      expect(state.uiFlags).toEqual({ isFetching: true });
      mutations[types.CLEAR_CONTACTS](state);
      expect(state).toMatchObject({ records: {}, sortOrder: [] });
    });

    it('stores paging meta, keeping hasMore unless sent', () => {
      const state = fresh();
      mutations[types.SET_CONTACT_META](state, {
        count: 4,
        current_page: 2,
        has_more: true,
      });
      mutations[types.SET_CONTACT_META](state, { count: 5, current_page: 3 });
      expect(state.meta).toEqual({ count: 5, currentPage: 3, hasMore: true });
    });

    it('appends contacts, merging known ones without duplicating order', () => {
      const state = fresh();
      mutations[types.APPEND_CONTACTS](state, [
        { id: 1, email: 'a@x' },
        { id: 2 },
      ]);
      expect(state.records[1]).toEqual({ id: 1, name: 'Old', email: 'a@x' });
      expect(state.sortOrder).toEqual([1, 2]);
    });

    it('updates a known contact without adding it to the order again', () => {
      const state = fresh();
      mutations[types.SET_CONTACT_ITEM](state, { id: 1, email: 'b@x' });
      expect(state.sortOrder).toEqual([1]);
      expect(state.records[1].email).toBe('b@x');
    });

    it('deletes a contact from the records and the order', () => {
      const state = fresh();
      mutations[types.DELETE_CONTACT](state, 1);
      expect(state).toMatchObject({ records: {}, sortOrder: [] });
    });

    it('sets presence, clearing it for contacts not listed', () => {
      const state = fresh();
      state.records[2] = { id: 2, availability_status: 'online' };
      mutations[types.UPDATE_CONTACTS_PRESENCE](state, { 1: 'busy' });
      expect(state.records[1].availability_status).toBe('busy');
      expect(state.records[2].availability_status).toBeNull();
    });

    it('reports a missing presence payload to Sentry', () => {
      const state = fresh();
      mutations[types.UPDATE_CONTACTS_PRESENCE](state, undefined);
      expect(Sentry.captureException).toHaveBeenCalled();
      expect(state.records[1].availability_status).toBeUndefined();
    });
  });

  describe('getters', () => {
    const state = {
      sortOrder: [1],
      records: {
        1: {
          id: 1,
          phone_number: '+1',
          custom_attributes: { plan_name: 'pro' },
        },
      },
      meta: { count: 1 },
      appliedFilters: [{ attribute_key: 'email', filter_operator: 'contains' }],
    };

    it('lists contacts camelized in order', () => {
      expect(getters.getContactsList(state)).toEqual([
        { id: 1, phoneNumber: '+1', customAttributes: { planName: 'pro' } },
      ]);
    });

    it('finds a contact camelized, keeping custom attribute keys', () => {
      expect(getters.getContactById(state)(1)).toEqual({
        id: 1,
        phoneNumber: '+1',
        customAttributes: { plan_name: 'pro' },
      });
      expect(getters.getContactById(state)(9)).toEqual({});
      expect(getters.getContact(state)(9)).toEqual({});
    });

    it('exposes meta and camelized filters', () => {
      expect(getters.getMeta(state)).toEqual({ count: 1 });
      expect(getters.getAppliedContactFiltersV4(state)).toEqual([
        { attributeKey: 'email', filterOperator: 'contains' },
      ]);
    });
  });
});
