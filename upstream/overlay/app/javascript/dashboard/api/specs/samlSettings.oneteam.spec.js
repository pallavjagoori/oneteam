import samlSettingsAPI from '../samlSettings';
import { useAxiosMock } from './oneteamAxiosMock';

describe('SamlSettingsAPI (OneTeam)', () => {
  const axios = useAxiosMock();
  const url = '/api/v1/accounts/1/saml_settings';
  const settings = { sso_url: 'https://idp.example.com' };

  it('fetches the settings', () => {
    samlSettingsAPI.get();
    expect(axios.get).toHaveBeenCalledWith(url);
  });

  it('creates the settings', () => {
    samlSettingsAPI.create(settings);
    expect(axios.post).toHaveBeenCalledWith(url, { saml_settings: settings });
  });

  it('updates the settings', () => {
    samlSettingsAPI.update(settings);
    expect(axios.put).toHaveBeenCalledWith(url, { saml_settings: settings });
  });

  it('deletes the settings', () => {
    samlSettingsAPI.delete();
    expect(axios.delete).toHaveBeenCalledWith(url);
  });

  it('refreshes the metadata', () => {
    samlSettingsAPI.refresh();
    expect(axios.post).toHaveBeenCalledWith(`${url}/refresh`);
  });
});
