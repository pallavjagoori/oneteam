import { ref, nextTick } from 'vue';
import ConversationAPI from 'dashboard/api/conversations';
import { useAlert } from 'dashboard/composables';
import { useConversationSuggestions } from '../useConversationSuggestions';

/*
 * OneTeam coverage for Captain Classifier suggestions on a conversation.
 * Results are cached per transcript; the tests check the cache key (only
 * public incoming/outgoing messages count), toggling, and how a failed
 * request is cleaned up.
 */
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({ isCloudFeatureEnabled: () => true }),
}));
vi.mock('dashboard/api/conversations', () => ({
  default: { getSuggestions: vi.fn() },
}));

const message = (id, extra = {}) => ({ id, message_type: 0, ...extra });

describe('useConversationSuggestions (OneTeam)', () => {
  let conversation;

  beforeEach(() => {
    vi.clearAllMocks();
    conversation = ref({ id: 1, messages: [message(1)] });
  });

  it('loads suggestions once per transcript and toggles them', async () => {
    ConversationAPI.getSuggestions.mockResolvedValue({ data: ['vip'] });
    const s = useConversationSuggestions('labels', conversation);
    expect(s.isEnabled.value).toBe(true);
    const loading = s.toggleSuggestions();
    expect(s.isLoading.value).toBe(true);
    await loading;
    expect(s.suggestions.value).toEqual(['vip']);
    expect(ConversationAPI.getSuggestions).toHaveBeenCalledWith(1, 'labels');

    await s.toggleSuggestions();
    expect(s.isActive.value).toBe(false);
    await s.toggleSuggestions();
    expect(s.suggestions.value).toEqual(['vip']);
    expect(ConversationAPI.getSuggestions).toHaveBeenCalledTimes(1);
  });

  it('keeps suggestions for activity and private messages, closes them for new ones', async () => {
    ConversationAPI.getSuggestions.mockResolvedValue({ data: [] });
    const s = useConversationSuggestions('priority', conversation);
    await s.toggleSuggestions();
    conversation.value = {
      ...conversation.value,
      messages: [
        ...conversation.value.messages,
        message(2, { message_type: 2 }),
        message(3, { private: true }),
      ],
    };
    await nextTick();
    expect(s.isActive.value).toBe(true);

    conversation.value = {
      ...conversation.value,
      messages: [
        ...conversation.value.messages,
        message(4, { content_attributes: { deleted: true } }),
      ],
    };
    await nextTick();
    expect(s.isActive.value).toBe(false);
  });

  it('handles a conversation that is not loaded yet', () => {
    conversation.value = null;
    const s = useConversationSuggestions('labels', conversation);
    expect(s.isActive.value).toBe(false);
    conversation.value = { id: 2 };
    expect(s.suggestions.value).toBeUndefined();
  });

  it('alerts and forgets a failed request', async () => {
    ConversationAPI.getSuggestions.mockRejectedValueOnce(new Error());
    const s = useConversationSuggestions('labels', conversation);
    await s.toggleSuggestions();
    expect(useAlert).toHaveBeenCalledWith('CONVERSATION.SUGGESTIONS.ERROR');
    expect(s.isActive.value).toBe(false);

    // A failure that lands after the user moved on leaves the new view open.
    let fail;
    ConversationAPI.getSuggestions.mockReturnValueOnce(
      new Promise((_, reject) => {
        fail = reject;
      })
    );
    const pending = s.toggleSuggestions();
    conversation.value = { id: 1, messages: [message(9)] };
    await nextTick();
    ConversationAPI.getSuggestions.mockResolvedValueOnce({ data: ['x'] });
    await s.toggleSuggestions();
    fail(new Error());
    await pending;
    expect(s.suggestions.value).toEqual(['x']);
  });
});
