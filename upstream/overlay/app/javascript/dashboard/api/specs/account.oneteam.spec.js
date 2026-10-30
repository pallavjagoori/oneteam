import accountAPI from '../account';
import { useAxiosMock } from './oneteamAxiosMock';

describe('AccountAPI (OneTeam)', () => {
  const axios = useAxiosMock({ data: { cache_keys: { label: 1 } } });

  it('fetches a given account by id', () => {
    accountAPI.get(5);
    expect(axios.get).toHaveBeenCalledWith('/api/v1/accounts/5');
  });

  it('fetches the current account when no id is given', () => {
    accountAPI.get();
    expect(axios.get).toHaveBeenCalledWith('/api/v1/accounts/1/');
  });

  it('creates an account', () => {
    accountAPI.createAccount({ name: 'Acme' });
    expect(axios.post).toHaveBeenCalledWith('/api/v1/accounts', {
      name: 'Acme',
    });
  });

  it('returns the cache keys of the current account', async () => {
    await expect(accountAPI.getCacheKeys()).resolves.toEqual({ label: 1 });
    expect(axios.get).toHaveBeenCalledWith('/api/v1/accounts/1/cache_keys');
  });
});
