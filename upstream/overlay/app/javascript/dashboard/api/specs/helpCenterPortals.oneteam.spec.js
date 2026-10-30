import PortalsAPI from '../helpCenter/portals';
import categoriesAPI from '../helpCenter/categories';
import { useAxiosMock } from './oneteamAxiosMock';

const url = '/api/v1/accounts/1/portals';

describe('PortalsAPI (OneTeam)', () => {
  const axios = useAxiosMock();
  const portalsAPI = new PortalsAPI();

  it('reads, updates and deletes a portal', () => {
    portalsAPI.getPortal({ portalSlug: 'docs', locale: 'en' });
    expect(axios.get).toHaveBeenCalledWith(`${url}/docs?locale=en`);
    portalsAPI.updatePortal({ portalSlug: 'docs', portalObj: { name: 'D' } });
    expect(axios.patch).toHaveBeenCalledWith(`${url}/docs`, { name: 'D' });
    portalsAPI.deletePortal('docs');
    expect(axios.delete).toHaveBeenCalledWith(`${url}/docs`);
  });

  it('deletes the logo', () => {
    portalsAPI.deleteLogo('docs');
    expect(axios.delete).toHaveBeenCalledWith(`${url}/docs/logo`);
  });

  it('sends CNAME instructions and checks SSL', () => {
    portalsAPI.sendCnameInstructions('docs', 'it@example.com');
    expect(axios.post).toHaveBeenCalledWith(`${url}/docs/send_instructions`, {
      email: 'it@example.com',
    });
    portalsAPI.sslStatus('docs');
    expect(axios.get).toHaveBeenCalledWith(`${url}/docs/ssl_status`);
  });
});

// CategoriesAPI extends PortalsAPI, whose constructor ignores arguments, so
// its base URL is the portals URL and category paths are added per call.
describe('CategoriesAPI (OneTeam)', () => {
  const axios = useAxiosMock();

  it('lists categories of a portal in a locale', () => {
    categoriesAPI.get({ portalSlug: 'docs', locale: 'fr' });
    expect(axios.get).toHaveBeenCalledWith(`${url}/docs/categories?locale=fr`);
  });

  it('creates, updates and deletes a category', () => {
    categoriesAPI.create({ portalSlug: 'docs', categoryObj: { name: 'A' } });
    expect(axios.post).toHaveBeenCalledWith(`${url}/docs/categories`, {
      name: 'A',
    });
    categoriesAPI.update({
      portalSlug: 'docs',
      categoryId: 2,
      categoryObj: { name: 'B' },
    });
    expect(axios.patch).toHaveBeenCalledWith(`${url}/docs/categories/2`, {
      name: 'B',
    });
    categoriesAPI.delete({ portalSlug: 'docs', categoryId: 2 });
    expect(axios.delete).toHaveBeenCalledWith(`${url}/docs/categories/2`);
  });

  it('reorders categories', () => {
    categoriesAPI.reorder({ portalSlug: 'docs', reorderedGroup: { 2: 1 } });
    expect(axios.post).toHaveBeenCalledWith(`${url}/docs/categories/reorder`, {
      positions_hash: { 2: 1 },
    });
  });
});
