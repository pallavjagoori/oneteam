/**
 * OneTeam spec for the v3 (login and signup) entrypoint.
 */
import { vi } from 'vitest';

vi.mock('../../v3/App.vue', () => ({
  default: { name: 'App', render: () => null },
}));
vi.mock('@sentry/vue', () => ({
  init: vi.fn(),
  browserTracingIntegration: vi.fn(() => 'tracing'),
}));

describe('v3 entrypoint', () => {
  let sentryInit;
  beforeAll(async () => {
    document.body.innerHTML = '<div id="app"></div>';
    window.errorLoggingConfig = 'https://key@sentry.example.test/2';
    const Sentry = await import('@sentry/vue');
    await import('../v3app');
    sentryInit = Sentry.init.mock.calls[0]?.[0];
  });

  afterAll(() => {
    delete window.errorLoggingConfig;
  });

  it('starts Sentry with the configured DSN', () => {
    expect(sentryInit).toMatchObject({
      dsn: 'https://key@sentry.example.test/2',
      integrations: ['tracing'],
    });
  });

  it('mounts the app on window load', () => {
    window.onload();
    // Vue marks the element it mounted on with its app instance.
    // eslint-disable-next-line no-underscore-dangle
    expect(document.getElementById('app').__vue_app__).toBeDefined();
  });
});
