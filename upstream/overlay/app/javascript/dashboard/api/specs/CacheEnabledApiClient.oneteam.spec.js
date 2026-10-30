import CacheEnabledApiClient from '../CacheEnabledApiClient';
import { useAxiosMock } from './oneteamAxiosMock';

class LabelsClient extends CacheEnabledApiClient {
  constructor() {
    super('labels', { accountScoped: true });
  }

  // eslint-disable-next-line class-methods-use-this
  get cacheModelName() {
    return 'label';
  }
}

describe('CacheEnabledApiClient (OneTeam)', () => {
  useAxiosMock();

  it('opens the local database before comparing cache keys', async () => {
    const client = new LabelsClient();
    const manager = client.dataManager;
    manager.db = null;
    const initDb = vi.spyOn(manager, 'initDb').mockResolvedValue();
    vi.spyOn(manager, 'getCacheKey').mockResolvedValue('key-1');

    await expect(client.validateCacheKey('key-1')).resolves.toBe(true);
    expect(initDb).toHaveBeenCalled();
  });

  it('refuses to cache when a subclass names no model', () => {
    const client = new CacheEnabledApiClient('things', {});
    expect(() => client.cacheModelName).toThrow(
      'cacheModelName is not defined'
    );
  });
});
