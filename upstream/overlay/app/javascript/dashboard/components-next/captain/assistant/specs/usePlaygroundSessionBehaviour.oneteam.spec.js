/**
 * OneTeam behaviour spec for the Captain playground session composable.
 *
 * Exercises the composable directly with a mocked store, covering the
 * client id fallback, scenario toggling and validation, saving temporary
 * scenarios, guidelines and guardrails (success, already saved, errors
 * with and without messages, and the assistant switching mid-request),
 * initialization failures and missing data, and saving playground
 * knowledge as a document.
 */
import { nextTick, ref } from 'vue';
import { usePlaygroundSession } from '../usePlaygroundSession';

const env = vi.hoisted(() => ({
  dispatch: vi.fn(),
  alerts: [],
  faq: vi.fn(),
}));

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('dashboard/composables', () => ({
  useAlert: message => env.alerts.push(message),
}));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: env.dispatch }),
}));
vi.mock('dashboard/composables/useAdmin', () => ({
  useAdmin: () => ({ isAdmin: ref(true) }),
}));
vi.mock('dashboard/api/captain/assistant', () => ({
  default: { getFaqStats: (...args) => env.faq(...args) },
}));

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const setup = () => {
  const assistantId = ref(1);
  return { assistantId, session: usePlaygroundSession({ assistantId }) };
};

const scenario = {
  title: ' T ',
  description: ' D ',
  instruction: ' I ',
};

describe('usePlaygroundSession behaviour', () => {
  beforeEach(() => {
    env.dispatch = vi.fn();
    env.alerts = [];
    env.faq = vi.fn().mockResolvedValue({ data: { documents: 2, faqs: '3' } });
  });

  it('builds client ids without crypto and toggles scenarios', () => {
    const original = globalThis.crypto;
    vi.stubGlobal('crypto', undefined);
    const { session } = setup();
    session.addTemporaryScenario('  ');
    session.addTemporaryScenario('New');
    expect(session.temporaryScenarios.value[0].clientId).toMatch(
      /^playground-/
    );
    vi.stubGlobal('crypto', original);
    expect(session.isValid.value).toBe(false);
    Object.assign(session.temporaryScenarios.value[0], scenario);
    expect(session.isValid.value).toBe(true);

    session.savedScenarios.value = [{ id: 7 }];
    session.toggleScenario(7);
    expect(session.playgroundConfig.value.scenario_ids).toEqual([7]);
    session.toggleScenario(7);
    expect(session.includedScenarioIds.value).toEqual([]);

    session.addTemporaryRule('guideline', 'Short');
    session.savedGuardrails.value = [{ content: 'Safe', included: true }];
    session.setKnowledgeText('notes');
    expect(session.configurationSummary()).toEqual({
      scenarioCount: 1,
      guidelineCount: 1,
      guardrailCount: 1,
      hasKnowledge: true,
    });
    session.setKnowledgeIncluded(false);
    session.setKnowledgeText('notes');
    expect(session.playgroundConfig.value.knowledge_text).toBe('');
    expect(session.configurationSummary().hasKnowledge).toBe(false);
    vi.unstubAllGlobals();
  });

  it('saves temporary scenarios and handles failures', async () => {
    const { session, assistantId } = setup();
    const invalid = { ...scenario, title: ' ', isSaving: false };
    await session.saveTemporaryScenario(invalid);
    await session.saveTemporaryScenario({ ...scenario, isSaving: true });
    expect(env.dispatch).not.toHaveBeenCalled();

    session.addTemporaryScenario('A');
    const temp = session.temporaryScenarios.value[0];
    Object.assign(temp, scenario);
    session.savedScenarios.value = [{ id: 5 }];
    env.dispatch.mockResolvedValueOnce({ id: 5, title: 'T' });
    await session.saveTemporaryScenario(temp);
    expect(session.savedScenarios.value).toEqual([{ id: 5, title: 'T' }]);
    expect(session.temporaryScenarios.value).toEqual([]);

    env.dispatch.mockRejectedValueOnce(new Error('nope'));
    await session.saveTemporaryScenario({ ...scenario });
    env.dispatch.mockRejectedValueOnce(null);
    await session.saveTemporaryScenario({ ...scenario });
    expect(env.alerts.slice(-2)).toEqual([
      'nope',
      'CAPTAIN.PLAYGROUND.SETUP.SAVE_SCENARIO_ERROR',
    ]);

    const success = deferred();
    env.dispatch.mockReturnValueOnce(success.promise);
    const pending = session.saveTemporaryScenario({ ...scenario });
    assistantId.value = 2;
    success.resolve({ id: 9 });
    await pending;
    const failure = deferred();
    env.dispatch.mockReturnValueOnce(failure.promise);
    const failing = session.saveTemporaryScenario({ ...scenario });
    assistantId.value = 3;
    failure.reject(new Error('late'));
    await failing;
    expect(session.savedScenarios.value).toEqual([{ id: 5, title: 'T' }]);
    expect(env.alerts).not.toContain('late');
  });

  it('saves guidelines and guardrails', async () => {
    const { session } = setup();
    session.addTemporaryRule('guideline', ' ');
    session.addTemporaryRule('guideline', 'Be kind');
    session.addTemporaryRule('guardrail', 'No refunds');
    session.savedGuardrails.value = [
      { key: 'g', content: 'Old', included: true },
      { key: 'h', content: 'Off', included: false },
    ];

    await session.saveTemporaryRule('guideline', {
      content: ' ',
      isSaving: false,
    });
    await session.saveTemporaryRule('guideline', {
      content: 'x',
      isSaving: true,
    });
    expect(env.dispatch).not.toHaveBeenCalled();

    env.dispatch
      .mockResolvedValueOnce({ guardrails: ['Old', 'Off'] })
      .mockResolvedValueOnce();
    const guardrail = session.temporaryGuardrails.value[0];
    const saving = session.saveTemporaryRule('guardrail', guardrail);
    expect(session.isRuleTypeSaving('guardrail')).toBe(true);
    await session.saveTemporaryRule('guardrail', { content: 'y' });
    await saving;
    expect(env.dispatch).toHaveBeenLastCalledWith('captainAssistants/update', {
      id: 1,
      assistant: { guardrails: ['Old', 'Off', 'No refunds'] },
    });
    expect(
      session.savedGuardrails.value.map(rule => [rule.content, rule.included])
    ).toEqual([
      ['Old', true],
      ['Off', false],
      ['No refunds', true],
    ]);
    expect(session.temporaryGuardrails.value).toEqual([]);

    env.dispatch.mockResolvedValueOnce({ response_guidelines: ['Be kind'] });
    await session.saveTemporaryRule(
      'guideline',
      session.temporaryGuidelines.value[0]
    );
    expect(session.temporaryGuidelines.value).toEqual([]);
    expect(env.alerts).toContain('CAPTAIN.PLAYGROUND.SETUP.RULE_ALREADY_SAVED');

    env.dispatch.mockRejectedValueOnce(new Error('bad'));
    await session.saveTemporaryRule('guideline', { content: 'a' });
    env.dispatch.mockRejectedValueOnce(undefined);
    await session.saveTemporaryRule('guideline', { content: 'a' });
    expect(env.alerts.slice(-2)).toEqual([
      'bad',
      'CAPTAIN.PLAYGROUND.SETUP.SAVE_RULE_ERROR',
    ]);
    session.addTemporaryRule('guideline', 'Gone');
    session.removeTemporaryRule(
      'guideline',
      session.temporaryGuidelines.value[0].clientId
    );
    expect(session.temporaryGuidelines.value).toEqual([]);
  });

  it('ignores rule results after the assistant changes', async () => {
    const { session, assistantId } = setup();
    const saveWhileSwitching = async settle => {
      assistantId.value = 1;
      const show = deferred();
      env.dispatch.mockReturnValueOnce(show.promise);
      const pending = session.saveTemporaryRule('guideline', {
        content: 'Same',
      });
      assistantId.value = 2;
      settle(show);
      await pending;
    };
    await saveWhileSwitching(show =>
      show.resolve({ response_guidelines: ['Same'] })
    );
    env.dispatch.mockResolvedValueOnce();
    await saveWhileSwitching(show => show.resolve({}));
    await saveWhileSwitching(show => show.reject(new Error('late')));
    expect(session.savedGuidelines.value).toEqual([]);
    expect(env.alerts).toEqual([]);
  });

  it('initializes, falls back on missing data and reports errors', async () => {
    const { session, assistantId } = setup();
    env.dispatch.mockImplementation(action =>
      action === 'captainAssistants/show'
        ? { response_guidelines: [' a ', 'a', ''], guardrails: null }
        : null
    );
    env.faq.mockRejectedValueOnce(new Error('stats'));
    await session.initialize();
    expect(session.savedScenarios.value).toEqual([]);
    expect(session.savedGuidelines.value).toHaveLength(1);
    expect(session.savedGuardrails.value).toEqual([]);
    expect(session.knowledgeStats.value).toEqual({ documents: 0, faqs: 0 });
    expect(session.isInitializing.value).toBe(false);

    env.dispatch.mockImplementation(action =>
      action === 'captainScenarios/get'
        ? [
            { id: 1, enabled: true },
            { id: 2, enabled: false },
          ]
        : undefined
    );
    await session.reset();
    expect(session.includedScenarioIds.value).toEqual([1]);
    expect(session.knowledgeStats.value).toEqual({ documents: 2, faqs: 3 });

    env.dispatch.mockRejectedValue(new Error('down'));
    await session.initialize();
    expect(session.loadError.value).toBe('down');
    env.dispatch.mockRejectedValue(null);
    await session.initialize();
    expect(session.loadError.value).toBe('CAPTAIN.PLAYGROUND.SETUP.LOAD_ERROR');

    const slow = deferred();
    env.dispatch.mockReturnValue(slow.promise);
    const stale = session.initialize();
    assistantId.value = 4;
    slow.reject(new Error('stale'));
    await stale;
    expect(session.loadError.value).toBe('');
    expect(session.isInitializing.value).toBe(true);

    const slower = deferred();
    env.dispatch.mockReturnValue(slower.promise);
    const superseded = session.initialize();
    const current = deferred();
    env.dispatch.mockReturnValue(current.promise);
    const latest = session.initialize();
    slower.resolve({});
    await superseded;
    current.resolve([]);
    await latest;
    expect(session.isInitializing.value).toBe(false);
  });

  it('saves knowledge as a document', async () => {
    const { session, assistantId } = setup();
    await session.saveKnowledgeAsDocument();
    expect(env.dispatch).not.toHaveBeenCalled();

    session.setKnowledgeText(' facts ');
    const save = deferred();
    env.dispatch.mockReturnValueOnce(save.promise);
    const pending = session.saveKnowledgeAsDocument();
    expect(session.isSavingKnowledge.value).toBe(true);
    await session.saveKnowledgeAsDocument();
    save.resolve();
    await pending;
    expect(session.knowledgeStats.value.documents).toBe(1);
    expect(session.isKnowledgeAlreadySaved.value).toBe(true);
    await session.saveKnowledgeAsDocument();
    expect(env.dispatch).toHaveBeenCalledTimes(1);

    session.setKnowledgeText('more');
    env.dispatch.mockRejectedValueOnce(new Error('disk'));
    await session.saveKnowledgeAsDocument();
    env.dispatch.mockRejectedValueOnce(null);
    await session.saveKnowledgeAsDocument();
    expect(env.alerts.slice(-2)).toEqual([
      'disk',
      'CAPTAIN.PLAYGROUND.SETUP.SAVE_KNOWLEDGE_ERROR',
    ]);

    const late = deferred();
    env.dispatch.mockReturnValueOnce(late.promise);
    const moved = session.saveKnowledgeAsDocument();
    assistantId.value = 2;
    late.resolve();
    await moved;
    assistantId.value = 1;
    session.setKnowledgeText('again');
    const lateError = deferred();
    env.dispatch.mockReturnValueOnce(lateError.promise);
    const movedError = session.saveKnowledgeAsDocument();
    assistantId.value = 2;
    lateError.reject(new Error('gone'));
    await movedError;
    await nextTick();
    expect(session.knowledgeStats.value.documents).toBe(1);
    expect(env.alerts).not.toContain('gone');
  });
});
