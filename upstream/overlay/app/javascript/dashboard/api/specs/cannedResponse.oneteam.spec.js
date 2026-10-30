import cannedResponseAPI from '../cannedResponse';

describe('CannedResponse API (OneTeam)', () => {
  it('caches under the canned_response model name', () => {
    expect(cannedResponseAPI.cacheModelName).toBe('canned_response');
  });

  it('reads the bare array the index endpoint returns', () => {
    const data = [{ id: 1 }];
    expect(cannedResponseAPI.extractDataFromResponse({ data })).toBe(data);
  });

  it('wraps cached data the way axios responses look', () => {
    const data = [{ id: 1 }];
    expect(cannedResponseAPI.marshallData(data)).toEqual({ data });
  });
});
