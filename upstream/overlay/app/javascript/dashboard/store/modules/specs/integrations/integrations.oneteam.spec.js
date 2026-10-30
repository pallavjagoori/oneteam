import IntegrationsAPI from 'dashboard/api/integrations';
import integrations from '../../integrations';
import { apiError, buildStore } from '../../../specs/oneteamStore';

/*
 * OneTeam coverage for the integrations Vuex module, run as a real store:
 * lookups with a default, Slack connect/update/channel listing, hook
 * errors and hooks on apps other than the one being changed.
 */
vi.mock('dashboard/api/integrations', () => ({
  default: Object.fromEntries(
    [
      'get',
      'connectSlack',
      'updateSlack',
      'listAllSlackChannels',
      'delete',
      'showHook',
      'createHook',
      'deleteHook',
    ].map(name => [name, vi.fn()])
  ),
}));

describe('integrations store (OneTeam)', () => {
  let store;
  const flags = () => store.getters['integrations/getUIFlags'];
  const record = id => store.getters['integrations/getIntegration'](id);

  beforeEach(() => {
    store = buildStore({ integrations });
    store.commit('integrations/SET_INTEGRATIONS', [
      { id: 'slack', enabled: false, hooks: [] },
      { id: 'dialogflow', enabled: true, hooks: [{ id: 1 }] },
    ]);
  });

  afterEach(() => vi.clearAllMocks());

  it('returns the given default for an unknown integration', () => {
    expect(store.getters['integrations/getIntegration']('x', null)).toBeNull();
    expect(record('x')).toEqual({});
  });

  it.each([
    ['connectSlack', 'connectSlack', 'isCreatingSlack'],
    ['updateSlack', 'updateSlack', 'isUpdatingSlack'],
  ])(
    '%s stores the Slack app, or reports failure',
    async (action, method, flag) => {
      IntegrationsAPI[method].mockResolvedValueOnce({
        data: { id: 'slack', enabled: true },
      });
      await store.dispatch(`integrations/${action}`, 'code');
      expect(record('slack').enabled).toBe(true);

      IntegrationsAPI[method].mockRejectedValueOnce(apiError('Slack said no'));
      await expect(
        store.dispatch(`integrations/${action}`, 'code')
      ).rejects.toThrow('Slack said no');
      expect(flags()[flag]).toBe(false);
    }
  );

  // Chatwoot quirk (see FINDINGS.md): a successful listing leaves the flag on.
  it('lists Slack channels, returning null on failure', async () => {
    IntegrationsAPI.listAllSlackChannels.mockResolvedValueOnce({
      data: [{ id: 'C1' }],
    });
    await expect(
      store.dispatch('integrations/listAllSlackChannels')
    ).resolves.toEqual([{ id: 'C1' }]);
    expect(flags().isFetchingSlackChannels).toBe(true);

    IntegrationsAPI.listAllSlackChannels.mockRejectedValueOnce(new Error('x'));
    await expect(
      store.dispatch('integrations/listAllSlackChannels')
    ).resolves.toBeNull();
    expect(flags().isFetchingSlackChannels).toBe(false);
  });

  it('clears the deleting flag when a delete fails', async () => {
    IntegrationsAPI.delete.mockRejectedValue(new Error('x'));
    await store.dispatch('integrations/deleteIntegration', 'slack');
    expect(flags().isDeleting).toBe(false);
  });

  it('loads a hook onto its app only', async () => {
    IntegrationsAPI.showHook.mockResolvedValue({
      data: { id: 2, app_id: 'slack' },
    });
    await store.dispatch('integrations/showHook', 2);
    expect(record('slack')).toMatchObject({
      enabled: true,
      hooks: [{ id: 2 }],
    });
    expect(record('dialogflow').hooks).toEqual([{ id: 1 }]);
  });

  it('wraps a failed hook load', async () => {
    IntegrationsAPI.showHook.mockRejectedValue('missing');
    await expect(store.dispatch('integrations/showHook', 2)).rejects.toThrow(
      'missing'
    );
    expect(flags().isFetchingItem).toBe(false);
  });

  it('rethrows a failed hook creation', async () => {
    const error = new Error('invalid');
    IntegrationsAPI.createHook.mockRejectedValue(error);
    await expect(store.dispatch('integrations/createHook', {})).rejects.toBe(
      error
    );
    expect(flags().isCreatingHook).toBe(false);
  });

  it('deletes a hook, leaving other apps alone, and wraps failures', async () => {
    IntegrationsAPI.deleteHook.mockResolvedValueOnce({});
    await store.dispatch('integrations/deleteHook', {
      appId: 'dialogflow',
      hookId: 1,
    });
    expect(record('dialogflow')).toMatchObject({ enabled: false, hooks: [] });
    expect(record('slack').hooks).toEqual([]);

    IntegrationsAPI.deleteHook.mockRejectedValueOnce('locked');
    await expect(
      store.dispatch('integrations/deleteHook', { appId: 'slack', hookId: 3 })
    ).rejects.toThrow('locked');
    expect(flags().isDeletingHook).toBe(false);
  });
});
