import { useTrack } from 'dashboard/composables';
import { CAPTAIN_EVENTS } from 'dashboard/helper/AnalyticsHelper/events';
import { useCopilotReply } from '../useCopilotReply';

/*
 * OneTeam coverage for the Copilot reply composable used by the reply box.
 * Captain's processEvent and followUp are fakes; the tests check the editor
 * state after each outcome (content, empty, error, abort, exception) and
 * which analytics event is tracked for it.
 */
const captain = vi.hoisted(() => ({
  processEvent: vi.fn(),
  followUp: vi.fn(),
  updateUISettings: vi.fn(),
}));

vi.mock('dashboard/composables/useCaptain', async () => {
  const { ref: vueRef } = await import('vue');
  return {
    useCaptain: () => ({
      processEvent: captain.processEvent,
      followUp: captain.followUp,
      currentChat: vueRef({ id: 7 }),
    }),
  };
});
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({ updateUISettings: captain.updateUISettings }),
}));
vi.mock('dashboard/composables', () => ({ useTrack: vi.fn() }));

const failure = (reason, extra = {}) => [
  CAPTAIN_EVENTS.GENERATION_FAILED,
  expect.objectContaining({ conversationId: 7, reason, ...extra }),
];

// A request whose promise the test settles after aborting it.
const pending = () => {
  let settle;
  const promise = new Promise((resolve, reject) => {
    settle = { resolve, reject };
  });
  return { promise, settle: () => settle };
};

describe('useCopilotReply (OneTeam)', () => {
  let copilot;

  beforeEach(() => {
    vi.clearAllMocks();
    copilot = useCopilotReply();
  });

  it('opens the Copilot panel for ask_copilot instead of generating', async () => {
    await copilot.execute('ask_copilot');
    expect(captain.updateUISettings).toHaveBeenCalledWith({
      is_contact_sidebar_open: false,
      is_copilot_panel_open: true,
    });
    expect(captain.processEvent).not.toHaveBeenCalled();
  });

  it('shows generated content and tracks a rewrite as used', async () => {
    captain.processEvent.mockResolvedValue({
      message: 'Better text',
      followUpContext: { id: 1 },
    });
    await copilot.execute('improve', 'text');
    expect(copilot.generatedContent.value).toBe('Better text');
    expect(copilot.showEditor.value).toBe(true);
    expect(copilot.isGenerating.value).toBe(false);
    expect(copilot.isActive.value).toBe(true);
    expect(copilot.editorTransitionKey.value).toBe('copilot');
    expect(copilot.isButtonDisabled.value).toBe(true);
    copilot.setContentReady();
    expect(copilot.isButtonDisabled.value).toBe(false);
    expect(useTrack).toHaveBeenCalledWith(CAPTAIN_EVENTS.REWRITE_USED, {
      conversationId: 7,
      operation: 'improve',
    });
  });

  it.each([
    ['summarize', 'SUMMARIZE'],
    ['reply_suggestion', 'REPLY_SUGGESTION'],
  ])('tracks %s under its own events', async (action, prefix) => {
    captain.processEvent.mockResolvedValue({ message: 'x' });
    await copilot.execute(action, '');
    expect(useTrack).toHaveBeenCalledWith(CAPTAIN_EVENTS[`${prefix}_USED`], {
      conversationId: 7,
    });
    expect(copilot.accept()).toBe('x');
    expect(useTrack).toHaveBeenCalledWith(CAPTAIN_EVENTS[`${prefix}_APPLIED`], {
      conversationId: 7,
      followUpCount: 0,
    });
  });

  it('tracks an error type, an empty answer and a thrown error as failures', async () => {
    captain.processEvent.mockResolvedValueOnce({ errorType: 'api_error' });
    await copilot.execute('improve', '');
    expect(useTrack).toHaveBeenLastCalledWith(
      ...failure('api_error', { stage: 'initial', operation: 'improve' })
    );

    captain.processEvent.mockResolvedValueOnce({});
    await copilot.execute('improve', '');
    expect(useTrack).toHaveBeenLastCalledWith(...failure('empty_response'));

    captain.processEvent.mockRejectedValueOnce(new TypeError('boom'));
    await copilot.execute('improve', '');
    expect(useTrack).toHaveBeenLastCalledWith(...failure('TypeError'));

    captain.processEvent.mockRejectedValueOnce(undefined);
    await copilot.execute('improve', '');
    expect(useTrack).toHaveBeenLastCalledWith(...failure('exception'));
    expect(copilot.isGenerating.value).toBe(false);
  });

  it.each(['AbortError', 'CanceledError'])(
    'stays quiet when the request ends with %s',
    async name => {
      captain.processEvent.mockRejectedValue(
        Object.assign(new Error(), { name })
      );
      await copilot.execute('improve', '');
      expect(useTrack).not.toHaveBeenCalled();
    }
  );

  it('stops generating when Captain reports the request as aborted', async () => {
    captain.processEvent.mockResolvedValue({ errorType: 'aborted' });
    await copilot.execute('improve', '');
    expect(copilot.isGenerating.value).toBe(false);
    expect(useTrack).not.toHaveBeenCalled();
  });

  it('ignores the answer of a request that a newer one replaced', async () => {
    const first = pending();
    captain.processEvent.mockReturnValueOnce(first.promise);
    const running = copilot.execute('improve', '');
    captain.processEvent.mockReturnValueOnce(
      Promise.resolve({ errorType: 'aborted' })
    );
    // The second request aborts the first, then itself reports "aborted"
    // while still current.
    await copilot.execute('shorten', '');
    first.settle().resolve({ message: 'late' });
    await running;
    expect(copilot.generatedContent.value).toBe('');

    const third = pending();
    captain.processEvent.mockReturnValueOnce(third.promise);
    const again = copilot.execute('improve', '');
    copilot.reset();
    third.settle().reject(new Error('after abort'));
    await again;
    expect(useTrack).not.toHaveBeenCalled();
  });

  it('keeps generating when an older request reports aborted after a newer one started', async () => {
    const first = pending();
    captain.processEvent.mockReturnValueOnce(first.promise);
    const running = copilot.execute('improve', '');
    // A follow-up swaps in a new controller without aborting the first one.
    copilot.followUpContext.value = { id: 1 };
    const second = pending();
    captain.followUp.mockReturnValueOnce(second.promise);
    const newer = copilot.sendFollowUp('shorter');
    first.settle().resolve({ errorType: 'aborted' });
    await running;
    expect(copilot.isGenerating.value).toBe(true);
    second.settle().resolve({ message: 'done', followUpContext: {} });
    await newer;
    expect(copilot.generatedContent.value).toBe('done');
  });

  describe('follow-ups', () => {
    beforeEach(async () => {
      captain.processEvent.mockResolvedValue({
        message: 'draft',
        followUpContext: { id: 1 },
      });
      await copilot.execute('improve', 'text');
      useTrack.mockClear();
    });

    it('does nothing without context or with a blank message', async () => {
      await copilot.sendFollowUp('   ');
      copilot.followUpContext.value = null;
      await copilot.sendFollowUp('shorter');
      expect(captain.followUp).not.toHaveBeenCalled();
    });

    it('replaces the draft and counts follow-ups in the applied event', async () => {
      captain.followUp.mockResolvedValue({
        message: 'shorter draft',
        followUpContext: { id: 2 },
      });
      await copilot.sendFollowUp('shorter');
      expect(useTrack).toHaveBeenCalledWith(CAPTAIN_EVENTS.FOLLOW_UP_SENT, {
        conversationId: 7,
      });
      expect(copilot.generatedContent.value).toBe('shorter draft');
      expect(copilot.followUpContext.value).toEqual({ id: 2 });
      copilot.reset();
      expect(useTrack).toHaveBeenLastCalledWith(
        CAPTAIN_EVENTS.REWRITE_DISMISSED,
        { conversationId: 7, operation: 'improve', followUpCount: 1 }
      );
    });

    it('tracks follow-up failures with the follow-up count', async () => {
      captain.followUp.mockResolvedValueOnce({ errorType: 'http_500' });
      await copilot.sendFollowUp('a');
      expect(useTrack).toHaveBeenLastCalledWith(
        ...failure('http_500', { stage: 'follow_up', followUpCount: 1 })
      );

      captain.followUp.mockResolvedValueOnce({});
      await copilot.sendFollowUp('b');
      expect(useTrack).toHaveBeenLastCalledWith(
        ...failure('empty_response', { followUpCount: 2 })
      );

      captain.followUp.mockRejectedValueOnce(new RangeError('x'));
      await copilot.sendFollowUp('c');
      expect(useTrack).toHaveBeenLastCalledWith(...failure('RangeError'));

      captain.followUp.mockRejectedValueOnce(null);
      await copilot.sendFollowUp('d');
      expect(useTrack).toHaveBeenLastCalledWith(...failure('exception'));
      expect(copilot.generatedContent.value).toBe('draft');
    });

    it('stays quiet when a follow-up is cancelled or aborted', async () => {
      captain.followUp.mockRejectedValueOnce(
        Object.assign(new Error(), { name: 'CanceledError' })
      );
      await copilot.sendFollowUp('a');
      captain.followUp.mockResolvedValueOnce({ errorType: 'aborted' });
      await copilot.sendFollowUp('b');
      expect(copilot.isGenerating.value).toBe(false);
      expect(useTrack).not.toHaveBeenCalledWith(
        CAPTAIN_EVENTS.GENERATION_FAILED,
        expect.anything()
      );
    });

    it('drops a follow-up answer once the editor was reset', async () => {
      const answer = pending();
      captain.followUp.mockReturnValueOnce(answer.promise);
      const running = copilot.sendFollowUp('a');
      copilot.reset();
      answer.settle().resolve({ message: 'late' });
      await running;
      expect(copilot.generatedContent.value).toBe('');

      captain.processEvent.mockResolvedValue({
        message: 'draft',
        followUpContext: { id: 1 },
      });
      await copilot.execute('improve', '');
      const failing = pending();
      captain.followUp.mockReturnValueOnce(failing.promise);
      const failed = copilot.sendFollowUp('b');
      copilot.reset(false);
      failing.settle().reject(new Error('after abort'));
      await failed;
      expect(useTrack).not.toHaveBeenCalledWith(
        CAPTAIN_EVENTS.GENERATION_FAILED,
        expect.anything()
      );
    });

    it('keeps generating when an older follow-up reports aborted', async () => {
      const older = pending();
      captain.followUp.mockReturnValueOnce(older.promise);
      const first = copilot.sendFollowUp('a');
      const newer = pending();
      captain.followUp.mockReturnValueOnce(newer.promise);
      const second = copilot.sendFollowUp('b');
      older.settle().resolve({ errorType: 'aborted' });
      await first;
      expect(copilot.isGenerating.value).toBe(true);
      newer.settle().resolve({ message: 'final', followUpContext: {} });
      await second;
      expect(copilot.generatedContent.value).toBe('final');
    });
  });

  it('toggles the editor and accepts without an action', () => {
    copilot.toggleEditor();
    expect(copilot.showEditor.value).toBe(true);
    expect(copilot.editorTransitionKey.value).toBe('copilot');
    copilot.toggleEditor();
    expect(copilot.editorTransitionKey.value).toBe('rich');
    expect(copilot.accept()).toBe('');
    copilot.reset();
    expect(useTrack).not.toHaveBeenCalled();
  });
});
