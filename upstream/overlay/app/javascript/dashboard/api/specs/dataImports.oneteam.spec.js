import dataImportsAPI from '../dataImports';
import { useAxiosMock } from './oneteamAxiosMock';

describe('DataImportsAPI (OneTeam)', () => {
  const axios = useAxiosMock();
  const url = '/api/v1/accounts/1/data_imports';

  it.each(['start', 'retry', 'abandon'])('%s an import', action => {
    dataImportsAPI[action](5);
    expect(axios.post).toHaveBeenCalledWith(`${url}/5/${action}`);
  });

  it('shows an import with params', () => {
    dataImportsAPI.show(5, { page: 2 });
    expect(axios.get).toHaveBeenCalledWith(`${url}/5`, {
      params: { page: 2 },
    });
  });

  it('shows an import without params', () => {
    dataImportsAPI.show(5);
    expect(axios.get).toHaveBeenCalledWith(`${url}/5`, { params: {} });
  });

  it('validates a source', () => {
    dataImportsAPI.validateSource({ source: 'intercom' });
    expect(axios.post).toHaveBeenCalledWith(`${url}/validate_source`, {
      source: 'intercom',
    });
  });

  it('downloads skip logs as a blob', () => {
    dataImportsAPI.downloadSkipLogs(5);
    expect(axios.get).toHaveBeenCalledWith(`${url}/5/skip_logs.csv`, {
      responseType: 'blob',
    });
  });

  it('downloads error logs as a blob', () => {
    dataImportsAPI.downloadErrorLogs(5);
    expect(axios.get).toHaveBeenCalledWith(`${url}/5/error_logs.csv`, {
      responseType: 'blob',
    });
  });
});
