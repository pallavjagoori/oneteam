import { effectScope, ref, nextTick } from 'vue';
import { flushPromises } from '@vue/test-utils';
import ConversationApi from 'dashboard/api/conversations';
import { useCampaignHistory } from '../useCampaignHistory';

/*
 * OneTeam coverage for the WhatsApp campaign history shown in a
 * conversation timeline: which campaigns are visible against the loaded
 * messages, loading more when older messages appear, dropping a response
 * after a conversation switch, reloading for a new contact, and when the
 * timeline counts as ready.
 */
const ctx = vi.hoisted(() => ({
  chat: null,
  allLoaded: null,
  enterprise: true,
}));

vi.mock('dashboard/api/conversations', () => ({
  default: { getCampaignHistory: vi.fn() },
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: key => (key === 'getSelectedChat' ? ctx.chat : ctx.allLoaded),
}));
vi.mock('dashboard/composables/useConfig', () => ({
  useConfig: () => ({ isEnterprise: ctx.enterprise }),
}));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({ isCloudFeatureEnabled: () => true }),
}));

const page = (payload, meta = {}) => ({
  data: {
    payload,
    meta: { next_before: null, first_message_id: 1, ...meta },
  },
});
const campaign = (id, sentAt, sourceId = `campaign-${id}`) => ({
  id,
  sent_at: sentAt,
  source_id: sourceId,
});
const chatWith = (id, messages, senderId = 1) => ({
  id,
  meta: { channel: 'Channel::Whatsapp', sender: { id: senderId } },
  messages,
});

describe('useCampaignHistory (OneTeam)', () => {
  let scope;

  const start = () => scope.run(() => useCampaignHistory());
  const ids = history => history.visibleCampaignHistory.value.map(c => c.id);

  beforeEach(() => {
    vi.clearAllMocks();
    ctx.enterprise = true;
    ctx.allLoaded = ref(false);
    ctx.chat = ref(
      chatWith(1, [{ id: 1, created_at: 100, source_id: 'campaign-1' }])
    );
    scope = effectScope();
  });

  afterEach(() => scope.stop());

  it.each([
    [1, [3, 2, 4]],
    [null, [3, 2, 4]],
    [99, [3, 2]],
  ])(
    'with first message %s shows %j, hiding campaigns already shown as messages',
    async (firstMessageId, expected) => {
      ConversationApi.getCampaignHistory.mockResolvedValue(
        page(
          [
            campaign(1, 150),
            campaign(2, 120),
            campaign(3, 120),
            campaign(4, 50),
          ],
          { first_message_id: firstMessageId }
        )
      );
      const history = start();
      await flushPromises();
      expect(ids(history)).toEqual(expected);
    }
  );

  it('loads more when older messages reach the oldest loaded campaign', async () => {
    ConversationApi.getCampaignHistory
      .mockResolvedValueOnce(
        page([campaign(4, 50)], { next_before: 49, first_message_id: 99 })
      )
      .mockResolvedValue(page([campaign(3, 30)], { first_message_id: 99 }));
    start();
    await flushPromises();
    expect(ConversationApi.getCampaignHistory).toHaveBeenCalledTimes(1);

    ctx.chat.value.messages.unshift({ id: 0, created_at: 60 });
    await flushPromises();
    expect(ConversationApi.getCampaignHistory).toHaveBeenCalledTimes(1);

    ctx.chat.value.messages.unshift({ id: -1, created_at: 40 });
    await flushPromises();
    expect(ConversationApi.getCampaignHistory).toHaveBeenCalledTimes(2);
    expect(ConversationApi.getCampaignHistory).toHaveBeenLastCalledWith(1, {
      before: 49,
      signal: expect.any(AbortSignal),
    });
  });

  it('drops a response that arrives after switching conversations', async () => {
    let answerFirst;
    ConversationApi.getCampaignHistory
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            answerFirst = resolve;
          })
      )
      .mockResolvedValueOnce(page([campaign(20, 150)]));
    const history = start();
    ctx.chat.value = chatWith(2, [{ id: 5, created_at: 100 }]);
    await flushPromises();
    answerFirst(page([campaign(10, 150)]));
    await flushPromises();
    expect(ids(history)).toEqual([20]);
  });

  it('reloads from scratch when the conversation gets a new contact', async () => {
    ConversationApi.getCampaignHistory.mockResolvedValue(page([]));
    start();
    await flushPromises();
    ctx.chat.value.meta.sender.id = 2;
    await flushPromises();
    expect(ConversationApi.getCampaignHistory).toHaveBeenCalledTimes(2);
    expect(ConversationApi.getCampaignHistory).toHaveBeenLastCalledWith(1, {
      before: undefined,
      signal: expect.any(AbortSignal),
    });
  });

  it('refreshes when the first message arrives in an empty conversation', async () => {
    ctx.chat.value = chatWith(1, []);
    ConversationApi.getCampaignHistory.mockResolvedValue(page([]));
    start();
    await flushPromises();
    ctx.chat.value.messages.push({ id: 7, created_at: 300 });
    await flushPromises();
    expect(ConversationApi.getCampaignHistory).toHaveBeenCalledTimes(2);
  });

  it('is ready when disabled, once loaded, or after an error', async () => {
    ctx.enterprise = false;
    const disabled = start();
    expect(disabled.isCampaignHistoryReady.value).toBe(true);
    ctx.chat.value.messages.push({ id: 2, created_at: 200 });
    await nextTick();
    expect(ConversationApi.getCampaignHistory).not.toHaveBeenCalled();

    ctx.enterprise = true;
    ConversationApi.getCampaignHistory.mockRejectedValueOnce(new Error('5xx'));
    const failing = start();
    expect(failing.isCampaignHistoryReady.value).toBe(false);
    await flushPromises();
    expect(failing.isCampaignHistoryReady.value).toBe(true);
    expect(failing.campaignHistoryError.value).toBe(true);
  });
});
