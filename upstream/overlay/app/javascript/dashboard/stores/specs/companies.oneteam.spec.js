import { setActivePinia, createPinia } from 'pinia';
import CompanyAPI from 'dashboard/api/companies';
import { useCompaniesStore } from '../companies';
import { apiError } from '../../store/specs/oneteamStore';

/*
 * OneTeam coverage for the Pinia companies store: list/search/CRUD, the
 * company detail tabs (contacts, notes, conversations), contact search and
 * the request tokens that drop answers for a company the user already left.
 */
vi.mock('dashboard/api/companies', () => ({
  default: Object.fromEntries(
    [
      'get',
      'show',
      'create',
      'update',
      'delete',
      'search',
      'enrich',
      'destroyAvatar',
      'listContacts',
      'listNotes',
      'listConversations',
      'filterConversations',
      'searchContacts',
      'createContact',
      'removeContact',
      'destroyCustomAttributes',
    ].map(name => [name, vi.fn()])
  ),
}));

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const reply = (payload, meta) => ({ data: { payload, meta } });

describe('companies store (OneTeam)', () => {
  let store;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    store = useCompaniesStore();
  });

  describe('list and search', () => {
    it('loads a page of companies with camelized keys and normalized meta', async () => {
      CompanyAPI.get.mockResolvedValue(
        reply(
          [{ id: 1, contacts_count: 2, custom_attributes: { tier_x: 1 } }],
          {
            total_count: '7',
            page: '2',
          }
        )
      );
      await expect(store.get()).resolves.toEqual([
        { id: 1, contactsCount: 2, customAttributes: { tier_x: 1 } },
      ]);
      expect(CompanyAPI.get).toHaveBeenCalledWith({ page: 1, sort: 'name' });
      expect(store.getCompaniesList).toHaveLength(1);
      expect(store.meta).toMatchObject({ totalCount: 7, page: 2 });
      expect(store.uiFlags.fetchingList).toBe(false);
    });

    it('falls back to count/current_page, then to defaults, for meta', async () => {
      CompanyAPI.get.mockResolvedValueOnce(
        reply([], { count: 3, current_page: 4 })
      );
      await store.get({ page: 4, sort: '-name' });
      expect(store.meta).toMatchObject({ totalCount: 3, page: 4 });

      CompanyAPI.get.mockResolvedValueOnce(reply(null));
      await store.get();
      expect(store.records).toEqual({});
      expect(store.meta).toEqual({ totalCount: 0, page: 1 });

      CompanyAPI.get.mockResolvedValueOnce(reply([], { totalCount: 5 }));
      await store.get();
      expect(store.meta.totalCount).toBe(5);
    });

    it('reports a failed list load', async () => {
      CompanyAPI.get.mockRejectedValue(apiError('No list'));
      await expect(store.get()).rejects.toThrow('No list');
      expect(store.uiFlags.fetchingList).toBe(false);
    });

    it('searches companies', async () => {
      CompanyAPI.search.mockResolvedValue(reply([{ id: 3 }], { count: 1 }));
      await expect(store.search({ search: 'acme' })).resolves.toEqual([
        { id: 3 },
      ]);
      expect(CompanyAPI.search).toHaveBeenCalledWith('acme', 1, 'name');
      CompanyAPI.search.mockRejectedValue(apiError('No search'));
      await expect(
        store.search({ search: 'acme', page: 2, sort: 'created_at' })
      ).rejects.toThrow('No search');
      expect(store.uiFlags.fetchingList).toBe(false);
    });
  });

  describe('single company', () => {
    it('shows a company and makes it active', async () => {
      CompanyAPI.show.mockResolvedValue(reply({ id: 5, name: 'Acme' }));
      await store.show('5');
      expect(store.activeCompanyId).toBe(5);
      expect(store.getRecord(5).name).toBe('Acme');
      expect(store.uiFlags.fetchingItem).toBe(false);
    });

    it('drops a company that loads after the user moved to another one', async () => {
      const request = deferred();
      CompanyAPI.show.mockReturnValue(request.promise);
      const pending = store.show(5);
      store.setActiveCompanyId(6);
      request.resolve(reply({ id: 5 }));
      await expect(pending).resolves.toEqual({ id: 5 });
      expect(store.records).toEqual([]);
    });

    it('reports a failed load', async () => {
      CompanyAPI.show.mockRejectedValue(apiError('Gone'));
      await expect(store.show(5)).rejects.toThrow('Gone');
      expect(store.uiFlags.fetchingItem).toBe(false);
    });

    it('creates a company with a JSON body when there is no avatar', async () => {
      CompanyAPI.create.mockResolvedValue(reply({ id: 8, name: 'New' }));
      await store.create({ name: 'New', websiteUrl: 'x.io' });
      expect(CompanyAPI.create).toHaveBeenCalledWith({
        company: { name: 'New', website_url: 'x.io' },
      });
      expect(store.getRecord(8).name).toBe('New');
      expect(store.uiFlags.creatingItem).toBe(false);
    });

    it('reports a failed create', async () => {
      CompanyAPI.create.mockRejectedValue(apiError('Invalid'));
      await expect(store.create({ name: '' })).rejects.toThrow('Invalid');
      expect(store.uiFlags.creatingItem).toBe(false);
    });

    it('sends nested values as multipart fields and skips empty ones', async () => {
      CompanyAPI.update.mockResolvedValue(reply({ id: 1 }));
      const avatar = new Blob(['img']);
      await store.update({
        id: 1,
        avatar,
        name: 'Acme',
        description: '',
        domain: null,
        additionalAttributes: { location: { city: 'Pune' }, size: 10 },
      });
      const form = CompanyAPI.update.mock.calls[0][1];
      expect(form).toBeInstanceOf(FormData);
      expect(form.get('company[name]')).toBe('Acme');
      expect(form.has('company[description]')).toBe(false);
      expect(form.has('company[domain]')).toBe(false);
      expect(form.get('company[additional_attributes][location][city]')).toBe(
        'Pune'
      );
      expect(form.get('company[additional_attributes][size]')).toBe('10');
      expect(form.get('company[avatar]')).toBeInstanceOf(Blob);
    });

    it('reports a failed update', async () => {
      CompanyAPI.update.mockRejectedValue(apiError('Locked'));
      await expect(store.update({ id: 1, name: 'x' })).rejects.toThrow(
        'Locked'
      );
      expect(store.uiFlags.updatingItem).toBe(false);
    });

    it('deletes a company and clears its detail view when it was open', async () => {
      store.records = [{ id: 1 }, { id: 2 }];
      store.setActiveCompanyId(1);
      store.companyNotes = [{ id: 9 }];
      store.setUIFlag({ fetchingList: true, fetchingNotes: true });
      CompanyAPI.delete.mockResolvedValue({});

      await expect(store.delete('1')).resolves.toBe(1);
      expect(store.records).toEqual([{ id: 2 }]);
      expect(store.activeCompanyId).toBeNull();
      expect(store.companyNotes).toEqual([]);
      expect(store.uiFlags.fetchingList).toBe(true);
      expect(store.uiFlags.fetchingNotes).toBe(false);
    });

    it('keeps the open company when another one is deleted', async () => {
      store.records = [{ id: 1 }, { id: 2 }];
      store.setActiveCompanyId(1);
      CompanyAPI.delete.mockResolvedValue({});
      await store.delete(2);
      expect(store.activeCompanyId).toBe(1);
    });

    it('reports a failed delete', async () => {
      CompanyAPI.delete.mockRejectedValue(apiError('In use'));
      await expect(store.delete(1)).rejects.toThrow('In use');
      expect(store.uiFlags.deletingItem).toBe(false);
    });

    it('enriches a company, passing errors on untouched', async () => {
      store.records = [{ id: 1, name: 'Old' }];
      CompanyAPI.enrich.mockResolvedValueOnce(reply({ id: 1, name: 'New' }));
      await store.enrich(1);
      expect(store.records).toEqual([{ id: 1, name: 'New' }]);

      const error = new Error('quota');
      CompanyAPI.enrich.mockRejectedValueOnce(error);
      await expect(store.enrich(1)).rejects.toBe(error);
      expect(store.uiFlags.enrichingItem).toBe(false);
    });

    it('removes the avatar', async () => {
      CompanyAPI.destroyAvatar.mockResolvedValueOnce(reply({ id: 1 }));
      await expect(store.deleteCompanyAvatar(1)).resolves.toEqual({ id: 1 });
      expect(store.activeCompanyId).toBe(1);

      CompanyAPI.destroyAvatar.mockRejectedValueOnce(apiError('Nope'));
      await expect(store.deleteCompanyAvatar(1)).rejects.toThrow('Nope');
      expect(store.uiFlags.deletingAvatar).toBe(false);
    });

    it('reports a failed custom attribute removal', async () => {
      CompanyAPI.destroyCustomAttributes.mockRejectedValue(apiError('Nope'));
      await expect(
        store.deleteCustomAttributes({ id: 1, customAttributes: ['tier'] })
      ).rejects.toThrow('Nope');
      expect(store.uiFlags.deletingCustomAttributes).toBe(false);
    });
  });

  describe('company contacts', () => {
    it('loads contacts and refreshes the company contact count', async () => {
      store.records = [{ id: 1, contactsCount: 0 }];
      CompanyAPI.listContacts.mockResolvedValue(
        reply([{ id: 7, phone_number: '+1' }], { count: 4 })
      );
      await store.getCompanyContacts(1);
      expect(CompanyAPI.listContacts).toHaveBeenCalledWith(1, 1, undefined);
      expect(store.activeCompanyId).toBe(1);
      expect(store.companyContacts).toEqual([{ id: 7, phoneNumber: '+1' }]);
      expect(store.companyContactsMeta.totalCount).toBe(4);
      expect(store.getRecord(1).contactsCount).toBe(4);
      expect(store.uiFlags.fetchingContacts).toBe(false);
    });

    it('keeps the contact count for a filtered list or an unknown company', async () => {
      store.records = [{ id: 1, contactsCount: 9 }];
      CompanyAPI.listContacts.mockResolvedValue(reply([], { count: 1 }));
      await store.getCompanyContacts(1, 1, 'jo');
      expect(store.getRecord(1).contactsCount).toBe(9);

      store.resetCompanyDetailState();
      await store.getCompanyContacts(2);
      expect(store.records).toEqual([{ id: 1, contactsCount: 9 }]);
    });

    it('drops contacts of a company the user left', async () => {
      const request = deferred();
      CompanyAPI.listContacts.mockReturnValue(request.promise);
      const pending = store.getCompanyContacts(1);
      store.setActiveCompanyId(2);
      request.resolve(reply([{ id: 7 }]));
      await expect(pending).resolves.toEqual([{ id: 7 }]);
      expect(store.companyContacts).toEqual([]);
    });

    it('keeps the loading flag while a newer contacts request runs', async () => {
      const first = deferred();
      const second = deferred();
      CompanyAPI.listContacts
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise);
      const older = store.getCompanyContacts(1, 1);
      const newer = store.getCompanyContacts(1, 2);
      first.resolve(reply([{ id: 1 }]));
      await older;
      expect(store.companyContacts).toEqual([]);
      expect(store.uiFlags.fetchingContacts).toBe(true);
      second.resolve(reply([{ id: 2 }]));
      await newer;
      expect(store.companyContacts).toEqual([{ id: 2 }]);
      expect(store.uiFlags.fetchingContacts).toBe(false);
    });

    it('reports a failed contacts load', async () => {
      CompanyAPI.listContacts.mockRejectedValue(apiError('Down'));
      await expect(store.getCompanyContacts(1)).rejects.toThrow('Down');
      expect(store.uiFlags.fetchingContacts).toBe(false);
    });

    it('does not refresh contacts after attaching if the user left the company', async () => {
      store.setActiveCompanyId(1);
      const request = deferred();
      CompanyAPI.createContact.mockReturnValue(request.promise);
      const pending = store.attachContactToCompany(1, 7);
      store.setActiveCompanyId(2);
      request.resolve(reply({ id: 7 }));
      await expect(pending).resolves.toEqual({ id: 7 });
      expect(CompanyAPI.listContacts).not.toHaveBeenCalled();
    });

    it('keeps search results if the user leaves while contacts refresh', async () => {
      store.setActiveCompanyId(1);
      store.contactSearchResults = [{ id: 7 }];
      CompanyAPI.createContact.mockResolvedValue(reply({ id: 7 }));
      CompanyAPI.listContacts.mockImplementation(async () => {
        store.setActiveCompanyId(2);
        return reply([]);
      });
      await store.attachContactToCompany(1, 7);
      expect(store.contactSearchResults).toEqual([{ id: 7 }]);
    });

    it('reports a failed attach', async () => {
      CompanyAPI.createContact.mockRejectedValue(apiError('Taken'));
      await expect(store.attachContactToCompany(1, 7)).rejects.toThrow('Taken');
      expect(store.uiFlags.creatingContact).toBe(false);
    });

    it('removes a contact and reloads the requested, current or first page', async () => {
      CompanyAPI.removeContact.mockResolvedValue({});
      CompanyAPI.listContacts.mockResolvedValue(reply([], { page: 3 }));

      await expect(store.removeContactFromCompany(1, '7', 2)).resolves.toBe(7);
      expect(CompanyAPI.listContacts).toHaveBeenLastCalledWith(1, 2, undefined);

      await store.removeContactFromCompany(1, 7);
      expect(CompanyAPI.listContacts).toHaveBeenLastCalledWith(1, 3, undefined);

      store.companyContactsMeta = undefined;
      await store.removeContactFromCompany(1, 7);
      expect(CompanyAPI.listContacts).toHaveBeenLastCalledWith(1, 1, undefined);
    });

    it('skips the reload when the user left, and reports failures', async () => {
      store.setActiveCompanyId(1);
      const request = deferred();
      CompanyAPI.removeContact.mockReturnValueOnce(request.promise);
      const pending = store.removeContactFromCompany(1, 7);
      store.setActiveCompanyId(2);
      request.resolve({});
      await pending;
      expect(CompanyAPI.listContacts).not.toHaveBeenCalled();

      CompanyAPI.removeContact.mockRejectedValueOnce(apiError('Nope'));
      await expect(store.removeContactFromCompany(2, 7)).rejects.toThrow(
        'Nope'
      );
      expect(store.uiFlags.removingContact).toBe(false);
    });
  });

  describe('company notes', () => {
    it('loads the first page and appends later pages', async () => {
      CompanyAPI.listNotes
        .mockResolvedValueOnce(reply([{ id: 1, created_at: 1 }], { count: 2 }))
        .mockResolvedValueOnce(reply(null));
      await store.getCompanyNotes(1);
      expect(store.companyNotes).toEqual([{ id: 1, createdAt: 1 }]);
      expect(store.companyNotesMeta).toEqual({ count: 2 });

      await expect(store.getCompanyNotes(1, 2, 'q')).resolves.toEqual([]);
      expect(CompanyAPI.listNotes).toHaveBeenLastCalledWith(1, 2, 'q');
      expect(store.companyNotes).toHaveLength(1);
      expect(store.companyNotesMeta).toEqual({});
      expect(store.uiFlags.fetchingNotes).toBe(false);
    });

    it('drops notes of a company the user left and keeps its flags alone', async () => {
      const request = deferred();
      CompanyAPI.listNotes.mockReturnValue(request.promise);
      const pending = store.getCompanyNotes(1);
      store.setActiveCompanyId(2);
      request.resolve(reply([{ id: 1 }]));
      await pending;
      expect(store.companyNotes).toEqual([]);
      expect(store.uiFlags.fetchingNotes).toBe(true);
    });

    it('reports a failed notes load', async () => {
      CompanyAPI.listNotes.mockRejectedValue(apiError('Down'));
      await expect(store.getCompanyNotes(1)).rejects.toThrow('Down');
      expect(store.uiFlags.fetchingNotes).toBe(false);
    });
  });

  describe('company conversations', () => {
    it('lists conversations in API shape and appends later pages', async () => {
      CompanyAPI.listConversations
        .mockResolvedValueOnce(
          reply([{ id: 1, inbox_id: 2 }], { all_count: 2 })
        )
        .mockResolvedValueOnce(reply(null));
      await store.getCompanyConversations(1);
      expect(store.companyConversations).toEqual([{ id: 1, inbox_id: 2 }]);
      expect(store.companyConversationsMeta).toEqual({ allCount: 2 });

      await store.getCompanyConversations(1, 2);
      expect(store.companyConversations).toHaveLength(1);
      expect(store.companyConversationsMeta).toEqual({});
      expect(store.uiFlags.fetchingConversations).toBe(false);
    });

    it('uses the filter endpoint when filters are set', async () => {
      CompanyAPI.filterConversations.mockResolvedValue(reply([{ id: 3 }]));
      await store.getCompanyConversations(1, 1, [
        {
          attributeKey: 'status',
          filterOperator: 'equal_to',
          values: ['open'],
          queryOperator: 'and',
        },
      ]);
      expect(CompanyAPI.filterConversations).toHaveBeenCalledWith(
        1,
        expect.any(Array),
        1
      );
      expect(CompanyAPI.listConversations).not.toHaveBeenCalled();
    });

    it('drops conversations of a company the user left', async () => {
      const request = deferred();
      CompanyAPI.listConversations.mockReturnValue(request.promise);
      const pending = store.getCompanyConversations(1);
      store.setActiveCompanyId(2);
      request.resolve(reply([{ id: 1 }]));
      await pending;
      expect(store.companyConversations).toEqual([]);
      expect(store.uiFlags.fetchingConversations).toBe(true);
    });

    it('reports a failed conversations load', async () => {
      CompanyAPI.listConversations.mockRejectedValue(apiError('Down'));
      await expect(store.getCompanyConversations(1)).rejects.toThrow('Down');
      expect(store.uiFlags.fetchingConversations).toBe(false);
    });
  });

  describe('contact search', () => {
    it('clears results for a blank or missing query', async () => {
      store.contactSearchResults = [{ id: 1 }];
      await expect(
        store.searchCompanyContactCandidates({ companyId: 1, search: '  ' })
      ).resolves.toEqual([]);
      await store.searchCompanyContactCandidates({ companyId: 1 });
      expect(store.contactSearchResults).toEqual([]);
      expect(CompanyAPI.searchContacts).not.toHaveBeenCalled();
    });

    it('stores trimmed-query results', async () => {
      CompanyAPI.searchContacts.mockResolvedValue(
        reply([{ id: 4 }], { count: 1 })
      );
      await store.searchCompanyContactCandidates({
        companyId: 1,
        search: ' jo ',
        page: 2,
      });
      expect(CompanyAPI.searchContacts).toHaveBeenCalledWith(1, 'jo', 2);
      expect(store.contactSearchResults).toEqual([{ id: 4 }]);
      expect(store.contactSearchMeta.totalCount).toBe(1);
      expect(store.uiFlags.searchingContacts).toBe(false);

      CompanyAPI.searchContacts.mockResolvedValue(reply(null));
      await store.searchCompanyContactCandidates({ companyId: 1, search: 'x' });
      expect(store.contactSearchResults).toEqual({});
    });

    it('drops results for an old query, an old request or another company', async () => {
      const cases = [
        () => {
          store.activeContactSearchQuery = 'other';
        },
        () => {
          store.contactSearchRequestToken += 1;
        },
        () => store.setActiveCompanyId(2),
      ];
      // eslint-disable-next-line no-restricted-syntax
      for (const interrupt of cases) {
        store.resetCompanyDetailState();
        const request = deferred();
        CompanyAPI.searchContacts.mockReturnValueOnce(request.promise);
        const pending = store.searchCompanyContactCandidates({
          companyId: 1,
          search: 'jo',
        });
        interrupt();
        request.resolve(reply([{ id: 4 }]));
        // eslint-disable-next-line no-await-in-loop
        await expect(pending).resolves.toEqual([{ id: 4 }]);
        expect(store.contactSearchResults).toEqual([]);
      }
    });

    it('reports a failed search', async () => {
      CompanyAPI.searchContacts.mockRejectedValue(apiError('Down'));
      await expect(
        store.searchCompanyContactCandidates({ companyId: 1, search: 'jo' })
      ).rejects.toThrow('Down');
      expect(store.uiFlags.searchingContacts).toBe(false);
    });
  });
});
