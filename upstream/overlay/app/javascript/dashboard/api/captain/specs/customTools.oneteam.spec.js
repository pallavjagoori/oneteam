import customToolsAPI from '../customTools';
import { useAxiosMock } from '../../specs/oneteamAxiosMock';

describe('CaptainCustomTools API (OneTeam)', () => {
  const axios = useAxiosMock();
  const url = '/api/v1/accounts/1/captain/custom_tools';

  it('lists tools, page 1 by default', () => {
    customToolsAPI.get();
    expect(axios.get).toHaveBeenCalledWith(url, {
      params: { assistant_id: undefined, page: 1, searchKey: undefined },
      signal: undefined,
    });
  });

  it('shows a tool', () => {
    customToolsAPI.show({ id: 3, assistantId: 2 });
    expect(axios.get).toHaveBeenCalledWith(`${url}/3`, {
      params: { assistant_id: 2 },
    });
  });

  it('creates, updates and tests tools, with or without data', () => {
    customToolsAPI.create({ assistantId: 2, name: 'lookup' });
    expect(axios.post).toHaveBeenCalledWith(url, {
      assistant_id: 2,
      custom_tool: { name: 'lookup' },
    });
    customToolsAPI.create();
    expect(axios.post).toHaveBeenLastCalledWith(url, {
      assistant_id: undefined,
      custom_tool: {},
    });
    customToolsAPI.update(3, { assistantId: 2, name: 'lookup' });
    expect(axios.put).toHaveBeenCalledWith(`${url}/3`, {
      assistant_id: 2,
      custom_tool: { name: 'lookup' },
    });
    customToolsAPI.update(3);
    expect(axios.put).toHaveBeenLastCalledWith(`${url}/3`, {
      assistant_id: undefined,
      custom_tool: {},
    });
    customToolsAPI.test({ assistantId: 2, name: 'lookup' });
    expect(axios.post).toHaveBeenLastCalledWith(`${url}/test`, {
      assistant_id: 2,
      custom_tool: { name: 'lookup' },
    });
    customToolsAPI.test();
    expect(axios.post).toHaveBeenLastCalledWith(`${url}/test`, {
      assistant_id: undefined,
      custom_tool: {},
    });
  });

  it('deletes a tool', () => {
    customToolsAPI.delete({ id: 3, assistantId: 2 });
    expect(axios.delete).toHaveBeenCalledWith(`${url}/3`, {
      params: { assistant_id: 2 },
    });
  });
});
