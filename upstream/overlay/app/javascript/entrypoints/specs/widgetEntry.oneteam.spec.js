/**
 * OneTeam spec for the website widget entrypoint: it mounts the widget app,
 * opens the ActionCable connection, and registers the phone number rules
 * used by the pre-chat form.
 */
import { vi } from 'vitest';

const captured = vi.hoisted(() => ({ formkit: null }));

vi.mock('../../widget/App.vue', () => ({
  default: { name: 'App', render: () => null },
}));
vi.mock('../../widget/helpers/actionCable', () => ({
  default: vi.fn(function Connector(app, token) {
    this.app = app;
    this.token = token;
  }),
}));
vi.mock('@formkit/vue', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...actual,
    defaultConfig: config => {
      captured.formkit = config;
      return actual.defaultConfig(config);
    },
  };
});

describe('widget entrypoint', () => {
  beforeAll(async () => {
    document.body.innerHTML = '<div id="app"></div>';
    window.chatwootWebChannel = { locale: 'en' };
    window.chatwootPubsubToken = 'pubsub-token';
    await import('../widget');
  });

  afterAll(() => {
    delete window.WOOT_WIDGET;
    delete window.actionCable;
  });

  it('registers the phone number rules', () => {
    const { startsWithPlus, isValidPhoneNumber } = captured.formkit.rules;
    expect(startsWithPlus({ value: '+1555' })).toBe(true);
    expect(startsWithPlus({ value: '1555' })).toBe(false);
    expect(isValidPhoneNumber({ value: '+14155552671' })).toBe(true);
    expect(isValidPhoneNumber({ value: '+1' })).toBe(false);
  });

  it('mounts the widget and connects to ActionCable on window load', () => {
    window.onload();
    expect(window.WOOT_WIDGET).toBeDefined();
    expect(window.actionCable.app).toBe(window.WOOT_WIDGET);
    expect(window.actionCable.token).toBe('pubsub-token');
  });
});
