import { afterEach, beforeEach, vi } from 'vitest';

// Shared helper for OneTeam's API client specs.
//
// API clients call the global `axios`. This swaps in a mock whose methods
// resolve with `response`, and puts the browser on an account-scoped URL so
// clients built with `accountScoped: true` include `/accounts/1` in paths.
export const useAxiosMock = (response = { data: {} }) => {
  const mock = {
    get: vi.fn(() => Promise.resolve(response)),
    post: vi.fn(() => Promise.resolve(response)),
    put: vi.fn(() => Promise.resolve(response)),
    patch: vi.fn(() => Promise.resolve(response)),
    delete: vi.fn(() => Promise.resolve(response)),
  };
  const originalAxios = window.axios;

  beforeEach(() => {
    window.axios = mock;
    window.history.pushState({}, '', '/app/accounts/1/dashboard');
  });

  afterEach(() => {
    window.axios = originalAxios;
    window.history.pushState({}, '', '/');
  });

  return mock;
};
