import { useCaptain } from '../useCaptain';
import TasksAPI from 'dashboard/api/captain/tasks';
import { useAlert } from 'dashboard/composables';

/*
 * OneTeam coverage for the parts of useCaptain that Chatwoot's spec leaves
 * out: limits, the enterprise-only limits fetch and how each task method
 * turns an API failure into an alert and an error type.
 */
const ctx = vi.hoisted(() => ({
  account: null,
  isEnterprise: false,
  dispatch: vi.fn(),
}));

vi.mock('dashboard/composables/store.js', () => ({
  useStore: () => ({ dispatch: ctx.dispatch }),
  useMapGetter: name =>
    ({
      'accounts/getUIFlags': { value: { isFetchingLimits: true } },
      getSelectedChat: { value: { id: 5 } },
      'draftMessages/getReplyEditorMode': { value: 'reply' },
    })[name],
  useFunctionGetter: (_, key) => ({
    get value() {
      return `saved ${key.value}`;
    },
  }),
}));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({
    isCloudFeatureEnabled: () => true,
    currentAccount: { value: ctx.account },
  }),
}));
vi.mock('dashboard/composables/useConfig', () => ({
  useConfig: () => ({ isEnterprise: ctx.isEnterprise }),
}));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/api/captain/tasks', () => ({
  default: {
    rewrite: vi.fn(),
    summarize: vi.fn(),
    replySuggestion: vi.fn(),
    followUp: vi.fn(),
  },
}));

const named = name => Object.assign(new Error(name), { name });

describe('useCaptain (OneTeam)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ctx.account = null;
    ctx.isEnterprise = false;
  });

  it('exposes document and response limits in camelCase, or null', () => {
    expect(useCaptain().documentLimits.value).toBeNull();
    ctx.account = {
      limits: {
        captain: {
          documents: { total_count: 10 },
          responses: { current_available: 2 },
        },
      },
    };
    const captain = useCaptain();
    expect(captain.documentLimits.value).toEqual({ totalCount: 10 });
    expect(captain.responseLimits.value).toEqual({ currentAvailable: 2 });
    expect(captain.isFetchingLimits.value).toBe(true);
    ctx.account = { limits: { captain: {} } };
    expect(useCaptain().responseLimits.value).toBeNull();
  });

  it('fetches limits only on enterprise', () => {
    useCaptain().fetchLimits();
    expect(ctx.dispatch).not.toHaveBeenCalled();
    ctx.isEnterprise = true;
    useCaptain().fetchLimits();
    expect(ctx.dispatch).toHaveBeenCalledWith('accounts/limits');
  });

  it('rewrites the draft when no content is given', async () => {
    TasksAPI.rewrite.mockResolvedValue({
      data: { message: 'better', follow_up_context: { id: 1 } },
    });
    await expect(useCaptain().processEvent()).resolves.toEqual({
      message: 'better',
      followUpContext: { id: 1 },
    });
    expect(TasksAPI.rewrite).toHaveBeenCalledWith(
      {
        content: 'saved draft-5-reply',
        operation: 'improve',
        conversationId: 5,
      },
      undefined
    );
  });

  it.each([
    ['rewriteContent', 'rewrite', c => c.rewriteContent('x', 'shorten')],
    ['summarizeConversation', 'summarize', c => c.summarizeConversation()],
    ['getReplySuggestion', 'replySuggestion', c => c.getReplySuggestion()],
  ])('%s reports API failures', async (_, api, call) => {
    const captain = useCaptain();
    TasksAPI[api].mockRejectedValueOnce({
      response: { status: 429, data: { error: 'Limit reached' } },
    });
    await expect(call(captain)).resolves.toEqual({
      message: '',
      errorType: 'http_429',
    });
    expect(useAlert).toHaveBeenCalledWith('Limit reached');

    TasksAPI[api].mockRejectedValueOnce(new Error('offline'));
    await expect(call(captain)).resolves.toMatchObject({
      errorType: 'api_error',
    });
    expect(useAlert).toHaveBeenLastCalledWith(
      'INTEGRATION_SETTINGS.OPEN_AI.GENERATE_ERROR'
    );
  });

  it.each(['AbortError', 'CanceledError'])(
    'stays quiet when a request ends with %s',
    async name => {
      TasksAPI.followUp.mockRejectedValue(named(name));
      await expect(
        useCaptain().followUp({ followUpContext: { id: 1 }, message: 'hi' })
      ).resolves.toEqual({
        message: '',
        followUpContext: { id: 1 },
        errorType: 'aborted',
      });
      expect(useAlert).not.toHaveBeenCalled();
    }
  );
});
