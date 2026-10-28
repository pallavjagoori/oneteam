import toolsManifestAPI from '../toolsManifest';
import { useAxiosMock } from '../../specs/oneteamAxiosMock';

describe('CaptainToolsManifest API (OneTeam)', () => {
  const axios = useAxiosMock();
  const url = '/api/v1/accounts/1/captain/tools_manifest';
  const signal = new AbortController().signal;

  it('lists installed tools, with or without a signal', () => {
    toolsManifestAPI.installed({ assistantId: 2 }, { signal });
    expect(axios.get).toHaveBeenCalledWith(`${url}/installed`, {
      params: { assistant_id: 2 },
      signal,
    });
    toolsManifestAPI.installed({ assistantId: 2 });
    expect(axios.get).toHaveBeenLastCalledWith(`${url}/installed`, {
      params: { assistant_id: 2 },
      signal: undefined,
    });
  });

  it('previews a manifest, with or without a signal', () => {
    toolsManifestAPI.preview({ assistantId: 2, source: 'src' }, { signal });
    expect(axios.post).toHaveBeenCalledWith(
      `${url}/preview`,
      { assistant_id: 2, source: 'src' },
      { signal }
    );
    toolsManifestAPI.preview({ assistantId: 2, source: 'src' });
    expect(axios.post).toHaveBeenLastCalledWith(
      `${url}/preview`,
      { assistant_id: 2, source: 'src' },
      { signal: undefined }
    );
  });

  it('installs a manifest', () => {
    toolsManifestAPI.install({
      assistantId: 2,
      source: 'src',
      revision: 'r1',
      configuration: { key: 'v' },
    });
    expect(axios.post).toHaveBeenCalledWith(`${url}/install`, {
      assistant_id: 2,
      source: 'src',
      revision: 'r1',
      configuration: { key: 'v' },
    });
  });
});
