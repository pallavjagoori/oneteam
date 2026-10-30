import { createStore } from 'vuex';
import * as Vuex from 'vuex';
import createAxios from '../APIHelper';
import Auth from '../../api/auth';
import createWootState from '../states';
import { getRandomColor } from '../labelColor';
import { getHelpUrlForFeature } from '../featureHelper';
import { buildFacebookLoginScopes } from '../facebookScopes';
import {
  initFaviconSwitcher,
  showBadgeOnFavicon,
} from '../AudioAlerts/faviconHelper';

vi.mock('../../api/auth', () => ({
  default: { hasAuthCookie: vi.fn(), getAuthData: vi.fn() },
}));

describe('APIHelper (OneTeam)', () => {
  const fakeAxios = () => {
    const instance = {
      defaults: { headers: { common: {} } },
      interceptors: { response: { use: vi.fn() } },
    };
    return { instance, create: vi.fn(() => instance) };
  };

  afterEach(() => {
    delete window.chatwootConfig;
  });

  it('builds a client on the API host with the saved auth headers', () => {
    window.chatwootConfig = { apiHost: 'https://api.example.com' };
    Auth.hasAuthCookie.mockReturnValue(true);
    Auth.getAuthData.mockReturnValue({
      'access-token': 'a',
      'token-type': 'Bearer',
      client: 'c',
      expiry: 'e',
      uid: 'u',
    });
    const axios = fakeAxios();
    expect(createAxios(axios)).toBe(axios.instance);
    expect(axios.create).toHaveBeenCalledWith({
      baseURL: 'https://api.example.com/',
    });
    expect(axios.instance.defaults.headers.common).toEqual({
      'access-token': 'a',
      'token-type': 'Bearer',
      client: 'c',
      expiry: 'e',
      uid: 'u',
    });
  });

  it('builds a client without headers when signed out, passing errors on', async () => {
    Auth.hasAuthCookie.mockReturnValue(false);
    const axios = fakeAxios();
    createAxios(axios);
    expect(axios.create).toHaveBeenCalledWith({ baseURL: '/' });
    expect(axios.instance.defaults.headers.common).toEqual({});

    const [onSuccess, onError] =
      axios.instance.interceptors.response.use.mock.calls[0];
    expect(onSuccess('ok')).toBe('ok');
    await expect(onError('boom')).rejects.toBe('boom');
  });
});

describe('states (OneTeam)', () => {
  it('tracks authentication and the current chat', () => {
    const store = createWootState({
      ...Vuex,
      Store: function Store(options) {
        return createStore(options);
      },
    });
    store.commit('authenticate');
    expect(store.state.authenticated).toBe(true);
    store.commit('logout');
    expect(store.state.authenticated).toBe(false);
    store.commit('setCurrentChat', { id: 1 });
    expect(store.getters.currentChat).toEqual({ id: 1 });
  });
});

describe('labelColor (OneTeam)', () => {
  it('returns a random hex colour', () => {
    expect(getRandomColor()).toMatch(/^#[0-9A-F]{6}$/);
  });
});

describe('featureHelper (OneTeam)', () => {
  it('looks up a help URL by feature name', () => {
    expect(getHelpUrlForFeature('no_such_feature')).toBeUndefined();
  });
});

describe('facebookScopes (OneTeam)', () => {
  it('leaves out Instagram scopes by default', () => {
    expect(buildFacebookLoginScopes()).not.toContain('instagram');
    expect(
      buildFacebookLoginScopes({ includeInstagramScopes: true })
    ).toContain('instagram_basic');
  });
});

describe('faviconHelper (OneTeam)', () => {
  // jsdom does not implement <link sizes>, so the favicons are plain objects.
  let favicon;

  beforeEach(() => {
    favicon = { sizes: ['32x32'], href: '/favicon-32x32.png' };
    vi.spyOn(document, 'querySelectorAll').mockReturnValue([favicon]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('switches to the badge icon', () => {
    showBadgeOnFavicon();
    expect(favicon.href).toBe('/favicon-badge-32x32.png');
  });

  it('switches back when the page becomes visible again', () => {
    const listeners = [];
    vi.spyOn(document, 'addEventListener').mockImplementation((_, fn) =>
      listeners.push(fn)
    );
    initFaviconSwitcher();
    favicon.href = '/favicon-badge-32x32.png';
    const visibility = vi.spyOn(document, 'visibilityState', 'get');

    visibility.mockReturnValue('hidden');
    listeners.forEach(fn => fn());
    expect(favicon.href).toBe('/favicon-badge-32x32.png');

    visibility.mockReturnValue('visible');
    listeners.forEach(fn => fn());
    expect(favicon.href).toBe('/favicon-32x32.png');
  });
});
