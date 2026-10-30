import Auth from 'dashboard/api/auth';
import { loadScript } from '../DOMHelpers';
import generatePayload from '../actionQueryGenerator';
import addArrayLast, {
  convertToArticleSlug,
  createPendingMessage,
  formatToTitleCase,
  getTypingUsersText,
  isJSONValid,
  sanitizeVariableSearchKey,
} from '../commons';
import { setDirectUploadAuthHeaders } from '../directUploadsHelper';
import { embeds } from '../markdownEmbeds';
import {
  filterItemsByPermission,
  getUserRole,
  hasPermissions,
} from '../permissionsHelper';
import {
  allKeysRequired,
  buildTemplateParameters,
  getTemplateKey,
  isValidTemplateMediaUrl,
  normalizeTemplateParameters,
  replaceTemplateVariables,
} from '../templateHelper';
import { uploadExternalImage, uploadFile } from '../uploadHelper';

vi.mock('dashboard/api/auth', () => ({ default: { getAuthData: vi.fn() } }));

describe('DOMHelpers.loadScript (OneTeam)', () => {
  afterEach(() => {
    document.head.innerHTML = '';
  });

  it('rejects an empty source', async () => {
    await expect(loadScript('  ', {})).rejects.toThrow(
      'Invalid source URL provided'
    );
    await expect(loadScript(42, {})).rejects.toThrow();
  });

  it('rejects with the script source when loading fails', async () => {
    const promise = loadScript('https://cdn.example.com/x.js', {});
    document.head.querySelector('script').dispatchEvent(new Event('error'));
    const error = await promise.catch(e => e);
    expect(error.name).toBe('ScriptLoaderError');
    expect(error.message).toBe('Failed to load script');
    expect(error.src).toBe('https://cdn.example.com/x.js');
    expect(error.getErrorDetails()).toBe(
      'Failed to load script from source: https://cdn.example.com/x.js'
    );
  });

  it('waits for a script that is already on the page but still loading', async () => {
    const src = 'https://cdn.example.com/y.js';
    const existing = document.createElement('script');
    existing.src = src;
    document.head.appendChild(existing);
    const promise = loadScript(src, {});
    existing.dispatchEvent(new Event('abort'));
    await expect(promise).rejects.toThrow('Failed to load script');
  });
});

describe('actionQueryGenerator (OneTeam)', () => {
  it('turns every kind of action parameter into a list', () => {
    expect(
      generatePayload([
        { action_name: 'a', action_params: [] },
        { action_name: 'b', action_params: [1, 2] },
        { action_name: 'c', action_params: ['x'] },
        { action_name: 'd', action_params: [{ id: 5 }, { id: 6 }] },
        { action_name: 'e', action_params: { id: 7 } },
        { action_name: 'f', action_params: { note: 'hi' } },
        { action_name: 'g', action_params: undefined },
        { action_name: 'h', action_params: 'text' },
      ]).map(item => item.action_params)
    ).toEqual([[], [1, 2], ['x'], [5, 6], [7], [{ note: 'hi' }], [], ['text']]);
  });

  // Chatwoot behaviour worth knowing when porting: null is typeof 'object',
  // so it reaches the object branch and throws instead of becoming [].
  it('throws on null parameters', () => {
    expect(() =>
      generatePayload([{ action_name: 'x', action_params: null }])
    ).toThrow(TypeError);
  });
});

describe('commons (OneTeam)', () => {
  it('adds Array.prototype.last once', () => {
    const original = Array.prototype.last;
    delete Array.prototype.last;
    addArrayLast();
    expect([1, 2, 3].last()).toBe(3);
    const added = Array.prototype.last;
    addArrayLast();
    expect(Array.prototype.last).toBe(added);
    // eslint-disable-next-line no-extend-native
    if (original) Array.prototype.last = original;
  });

  it('checks JSON', () => {
    expect(isJSONValid('{"a":1}')).toBe(true);
    expect(isJSONValid('{a')).toBe(false);
  });

  it('describes who is typing, with no users by default', () => {
    expect(() => getTypingUsersText()).toThrow();
    expect(getTypingUsersText([{ name: 'A' }, { name: 'B' }])).toEqual([
      'TYPING.TWO',
      { user: 'A', secondUser: 'B' },
    ]);
  });

  it('creates a pending message with or without content and a file', () => {
    const withFile = createPendingMessage({
      pendingMessageContent: 'shown',
      file: {},
      conversationId: 4,
    });
    expect(withFile.content).toBe('shown');
    expect(withFile.attachments).toEqual([{ id: withFile.id }]);
    expect(withFile.conversation_id).toBe(4);
    expect(createPendingMessage({ message: 'm' }).content).toBe('m');
    const empty = createPendingMessage({});
    expect(empty.content).toBeNull();
    expect(empty.attachments).toBeNull();
  });

  it('builds slugs and cleans search keys', () => {
    expect(convertToArticleSlug('  Café Menu! ')).toBe('cafe-menu');
    expect(sanitizeVariableSearchKey()).toBe('');
    expect(formatToTitleCase(undefined)).toBe('');
  });
});

describe('directUploadsHelper (OneTeam)', () => {
  it('adds the auth headers when signed in', () => {
    Auth.getAuthData.mockReturnValue({
      'access-token': 'a',
      'token-type': 'Bearer',
      client: 'c',
      expiry: 'e',
      uid: 'u',
    });
    const xhr = { setRequestHeader: vi.fn() };
    setDirectUploadAuthHeaders(xhr);
    expect(xhr.setRequestHeader.mock.calls).toEqual([
      ['access-token', 'a'],
      ['token-type', 'Bearer'],
      ['client', 'c'],
      ['expiry', 'e'],
      ['uid', 'u'],
    ]);
  });

  it('adds nothing when signed out', () => {
    const xhr = { setRequestHeader: vi.fn() };
    Auth.getAuthData.mockReturnValue(false);
    setDirectUploadAuthHeaders(xhr);
    Auth.getAuthData.mockReturnValue({});
    setDirectUploadAuthHeaders(xhr);
    expect(xhr.setRequestHeader).not.toHaveBeenCalled();
  });
});

describe('markdownEmbeds (OneTeam)', () => {
  it('lists previewable embeds with compiled patterns', () => {
    expect(embeds.length).toBeGreaterThan(0);
    expect(embeds.map(embed => embed.key)).not.toContain('github_gist');
    embeds.forEach(embed => {
      expect(embed.regex).toBeInstanceOf(RegExp);
      expect(typeof embed.hideSource).toBe('boolean');
    });
  });
});

describe('permissionsHelper (OneTeam)', () => {
  it('handles missing permission lists', () => {
    expect(hasPermissions()).toBe(false);
  });

  it('reports the user role', () => {
    const user = {
      accounts: [
        { id: 1, custom_role_id: 3 },
        { id: 2, role: 'administrator' },
        { id: 3 },
      ],
    };
    expect(getUserRole(user, 1)).toBe('custom_role');
    expect(getUserRole(user, 2)).toBe('administrator');
    expect(getUserRole(user, 3)).toBe('agent');
    expect(getUserRole(user, 9)).toBe('agent');
  });

  it('keeps items the user may see, with the default transform', () => {
    const items = {
      open: { permissions: [] },
      admin: { permissions: ['administrator'] },
      agent: { permissions: ['agent'] },
    };
    expect(
      filterItemsByPermission(items, ['agent'], item => item.permissions)
    ).toEqual([
      { key: 'open', permissions: [] },
      { key: 'agent', permissions: ['agent'] },
    ]);
  });
});

describe('templateHelper (OneTeam)', () => {
  it('requires every key to have a value', () => {
    expect(allKeysRequired({ a: 'x', b: 'y' })).toBe(true);
    expect(allKeysRequired({ a: 'x', b: '' })).toBe(false);
  });

  it('fills template variables, keeping unknown ones', () => {
    expect(
      replaceTemplateVariables('Hi {{1}}, order {{2}}', { body: { 1: 'Jo' } })
    ).toBe('Hi Jo, order {{2}}');
    expect(replaceTemplateVariables('Hi {{1}}', {})).toBe('Hi {{1}}');
  });

  it('builds parameters through the shared helper', () => {
    expect(
      buildTemplateParameters({ components: [{ type: 'BODY', text: 'Hi' }] })
    ).toBeTypeOf('object');
  });

  it('keys templates by ID, or by name and language', () => {
    expect(getTemplateKey({ id: 5 })).toBe(5);
    expect(getTemplateKey({ name: 'welcome', language: 'en' })).toBe(
      'welcome:en'
    );
  });

  it('accepts an empty or http(s) media URL only', () => {
    expect(isValidTemplateMediaUrl('')).toBe(true);
    expect(isValidTemplateMediaUrl('https://example.com/a.png')).toBe(true);
    expect(isValidTemplateMediaUrl('ftp://example.com/a.png')).toBe(false);
  });

  describe('normalizeTemplateParameters', () => {
    it('keeps parameters that are already in component form', () => {
      const params = {
        body: { 1: 'a' },
        header: null,
        buttons: [null, { type: 'url' }],
      };
      expect(normalizeTemplateParameters(params)).toBe(params);
      expect(normalizeTemplateParameters({ footer: {} })).toEqual({
        footer: {},
      });
    });

    it('converts a legacy list or map into body parameters', () => {
      expect(normalizeTemplateParameters(['a', null])).toEqual({
        body: { 1: 'a', 2: '' },
      });
      expect(
        normalizeTemplateParameters({ name: 'Jo', age: undefined })
      ).toEqual({ body: { name: 'Jo', age: '' } });
      expect(normalizeTemplateParameters()).toEqual({});
    });

    it('treats invalid component shapes as legacy maps', () => {
      expect(normalizeTemplateParameters({ body: ['x'] })).toEqual({
        body: { body: 'x' },
      });
      expect(normalizeTemplateParameters({ body: {}, buttons: 'x' })).toEqual({
        body: { body: '[object Object]', buttons: 'x' },
      });
      expect(
        normalizeTemplateParameters({
          body: {},
          buttons: [{ text: 'no type' }],
        })
      ).toMatchObject({ body: { body: '[object Object]' } });
      expect(
        normalizeTemplateParameters({ body: {}, buttons: ['plain'] })
      ).toMatchObject({ body: { body: '[object Object]' } });
    });
  });
});

describe('uploadHelper (OneTeam)', () => {
  const originalAxios = window.axios;
  const response = { data: { file_url: 'u', blob_key: 'k', blob_id: 1 } };

  beforeEach(() => {
    window.axios = { post: vi.fn(() => Promise.resolve(response)) };
    window.history.pushState({}, '', '/app/accounts/7/dashboard');
  });

  afterEach(() => {
    window.axios = originalAxios;
    window.history.pushState({}, '', '/');
  });

  it('uploads to the account in the URL and reports progress', async () => {
    const onProgress = vi.fn();
    await expect(
      uploadFile(new File(['x'], 'a.txt'), undefined, onProgress)
    ).resolves.toEqual({ fileUrl: 'u', blobKey: 'k', blobId: 1 });
    const [url, , options] = window.axios.post.mock.calls[0];
    expect(url).toBe('/api/v1/accounts/7/upload');
    options.onUploadProgress({ loaded: 5, total: 10 });
    options.onUploadProgress({ loaded: 5, total: 0 });
    options.onUploadProgress({ loaded: 20, total: 10 });
    expect(onProgress.mock.calls).toEqual([[0.5], [1]]);
  });

  it('ignores progress without a callback', async () => {
    await uploadFile(new File(['x'], 'a.txt'), 3);
    const [url, , options] = window.axios.post.mock.calls[0];
    expect(url).toBe('/api/v1/accounts/3/upload');
    options.onUploadProgress({ loaded: 1, total: 2 });
  });

  it('uploads an external image to the account in the URL', async () => {
    await expect(uploadExternalImage('https://x/y.png')).resolves.toEqual({
      fileUrl: 'u',
      blobKey: 'k',
      blobId: 1,
    });
    expect(window.axios.post).toHaveBeenCalledWith(
      '/api/v1/accounts/7/upload',
      { external_url: 'https://x/y.png' },
      { headers: { 'Content-Type': 'application/json' }, signal: undefined }
    );
  });
});
