/**
 * OneTeam spec for the widget conversation actions that send messages and
 * attachments with metadata (custom attributes and labels) collected before
 * the conversation existed, plus their failure paths.
 */
import { actions } from '../../conversation/actions';
import * as api from 'widget/api/conversation';

vi.mock('widget/api/conversation');
vi.mock('../../../../helpers/uuid', () => ({ default: () => 'temp-1' }));

const commit = vi.fn();
const message = { id: 'temp-1', content: 'Hi', replyTo: 9 };

describe('sendMessageWithData', () => {
  it('sends without metadata when nothing is pending', async () => {
    api.sendMessageAPI.mockResolvedValue({ data: { id: 5, content: 'Hi' } });
    await actions.sendMessageWithData({ commit }, { message });
    expect(api.sendMessageAPI).toHaveBeenCalledWith('Hi', 9, {
      customAttributes: undefined,
      labels: undefined,
    });
    expect(commit).toHaveBeenCalledWith('updateMessageMeta', {
      id: 'temp-1',
      meta: { error: '' },
    });
    expect(commit).not.toHaveBeenCalledWith('clearPendingConversationMetadata');
    expect(commit).toHaveBeenLastCalledWith('pushMessageToConversation', {
      id: 5,
      content: 'Hi',
      status: 'sent',
    });
  });

  it('sends pending attributes and labels with the first message, then clears them', async () => {
    api.sendMessageAPI.mockResolvedValue({ data: { id: 6 } });
    await actions.sendMessageWithData(
      { commit },
      {
        message: { ...message, meta: { retries: 1 } },
        pendingCustomAttributes: { plan: 'pro' },
        pendingLabels: ['vip'],
      }
    );
    expect(api.sendMessageAPI).toHaveBeenCalledWith('Hi', 9, {
      customAttributes: { plan: 'pro' },
      labels: ['vip'],
    });
    expect(commit).toHaveBeenCalledWith('clearPendingConversationMetadata');
  });

  it('sends labels alone as pending metadata', async () => {
    api.sendMessageAPI.mockResolvedValue({ data: { id: 7 } });
    await actions.sendMessageWithData(
      { commit },
      { message, pendingLabels: ['vip'] }
    );
    expect(api.sendMessageAPI).toHaveBeenCalledWith('Hi', 9, {
      customAttributes: {},
      labels: ['vip'],
    });
  });

  it('marks the message failed when sending fails', async () => {
    api.sendMessageAPI.mockRejectedValue(new Error('offline'));
    await actions.sendMessageWithData({ commit }, { message });
    expect(commit).toHaveBeenCalledWith('pushMessageToConversation', {
      ...message,
      status: 'failed',
    });
  });
});

describe('sendAttachment', () => {
  const params = {
    attachment: { thumbUrl: 'blob:1', fileType: 'image' },
    replyTo: 3,
  };

  it('sends pending metadata with the attachment, then clears it', async () => {
    api.sendAttachmentAPI.mockResolvedValue({ data: { id: 8 } });
    await actions.sendAttachment(
      {
        commit,
        state: { pendingCustomAttributes: { plan: 'pro' }, pendingLabels: [] },
      },
      params
    );
    expect(api.sendAttachmentAPI).toHaveBeenCalledWith(params, {
      customAttributes: { plan: 'pro' },
      labels: [],
    });
    expect(commit).toHaveBeenCalledWith('clearPendingConversationMetadata');
    expect(commit).toHaveBeenCalledWith('updateAttachmentMessageStatus', {
      message: { id: 8 },
      tempId: 'temp-1',
    });
  });

  it('marks the temporary message failed when the upload fails', async () => {
    api.sendAttachmentAPI.mockRejectedValue(new Error('too big'));
    await actions.sendAttachment(
      { commit, state: { pendingCustomAttributes: {}, pendingLabels: [] } },
      { ...params, meta: { note: 'x' } }
    );
    expect(commit).toHaveBeenCalledWith(
      'pushMessageToConversation',
      expect.objectContaining({ id: 'temp-1', status: 'failed' })
    );
    expect(commit).toHaveBeenLastCalledWith('updateMessageMeta', {
      id: 'temp-1',
      meta: { note: 'x', error: '' },
    });
  });
});

describe('ignored failures', () => {
  it('ignores a failed typing update', async () => {
    api.toggleTyping.mockRejectedValue(new Error('offline'));
    await expect(
      actions.toggleUserTyping({}, { typingStatus: 'on' })
    ).resolves.toBeUndefined();
  });

  it('ignores a failed last-seen update', async () => {
    api.setUserLastSeenAt.mockRejectedValue(new Error('offline'));
    await expect(
      actions.setUserLastSeen({ commit, getters: { getConversationSize: 2 } })
    ).resolves.toBeUndefined();
    expect(commit).toHaveBeenCalledWith(
      'setMetaUserLastSeenAt',
      expect.any(Number)
    );
  });

  it('resolves the conversation', async () => {
    api.toggleStatus.mockResolvedValue({});
    await actions.resolveConversation();
    expect(api.toggleStatus).toHaveBeenCalled();
  });
});
