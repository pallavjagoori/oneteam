import ApiClient from '../ApiClient';
import { useAxiosMock } from './oneteamAxiosMock';

describe('ApiClient (OneTeam)', () => {
  const axios = useAxiosMock();

  describe('URLs', () => {
    it('scopes the URL to the account in the current route', () => {
      const client = new ApiClient('labels', { accountScoped: true });
      expect(client.url).toBe('/api/v1/accounts/1/labels');
    });

    it('leaves out the account outside account routes', () => {
      window.history.pushState({}, '', '/app/login');
      const client = new ApiClient('labels', { accountScoped: true });
      expect(client.accountIdFromRoute).toBe('');
      expect(client.url).toBe('/api/v1/labels');
    });

    it('prefixes enterprise endpoints and honours the API version', () => {
      const client = new ApiClient('reports', {
        accountScoped: true,
        enterprise: true,
        apiVersion: 'v2',
      });
      expect(client.url).toBe('/enterprise/api/v2/accounts/1/reports');
    });

    it('works without options', () => {
      expect(new ApiClient('profile').url).toBe('/api/v1/profile');
    });
  });

  describe('CRUD calls', () => {
    const client = new ApiClient('labels', { accountScoped: true });
    const url = '/api/v1/accounts/1/labels';

    it('lists records', () => {
      client.get();
      expect(axios.get).toHaveBeenCalledWith(url);
    });

    it('shows a record', () => {
      client.show(2);
      expect(axios.get).toHaveBeenCalledWith(`${url}/2`);
    });

    it('creates a record', () => {
      client.create({ title: 'vip' });
      expect(axios.post).toHaveBeenCalledWith(url, { title: 'vip' });
    });

    it('updates a record', () => {
      client.update(2, { title: 'vip' });
      expect(axios.patch).toHaveBeenCalledWith(`${url}/2`, { title: 'vip' });
    });

    it('deletes a record', () => {
      client.delete(2);
      expect(axios.delete).toHaveBeenCalledWith(`${url}/2`);
    });
  });
});
