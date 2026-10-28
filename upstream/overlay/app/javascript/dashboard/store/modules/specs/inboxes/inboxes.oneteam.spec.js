import InboxesAPI from 'dashboard/api/inboxes';
import WebChannel from 'dashboard/api/channel/webChannel';
import FBChannel from 'dashboard/api/channel/fbChannel';
import TwilioChannel from 'dashboard/api/channel/twilioChannel';
import WhatsappChannel from 'dashboard/api/channel/whatsappChannel';
import AnalyticsHelper from 'dashboard/helper/AnalyticsHelper';
import { actions, getters } from '../../inboxes';
import { buildInboxData } from '../../inboxes/channelActions';
import types from '../../../mutation-types';
import { apiError } from '../../../specs/oneteamStore';

/*
 * OneTeam coverage for the inboxes Vuex module: the getters and actions
 * Chatwoot's own inbox specs leave out (channel creation, CSAT templates,
 * secrets, cache revalidation) and the multipart builder for inbox forms.
 */
const { mockApi } = vi.hoisted(() => ({
  mockApi: methods => ({
    default: Object.fromEntries(methods.map(name => [name, vi.fn()])),
  }),
}));
vi.mock('dashboard/api/inboxes', () =>
  mockApi([
    'validateCacheKey',
    'refetchAndCommit',
    'update',
    'setCallBusinessHours',
    'createCSATTemplate',
    'getCSATTemplateStatus',
    'analyzeCSATTemplateUtility',
    'resetSecret',
    'rotateHmacToken',
  ])
);
vi.mock('dashboard/api/channel/webChannel', () => mockApi(['create']));
vi.mock('dashboard/api/channel/fbChannel', () =>
  mockApi(['reauthorizeFacebookPage'])
);
vi.mock('dashboard/api/channel/twilioChannel', () => mockApi(['create']));
vi.mock('dashboard/api/channel/whatsappChannel', () =>
  mockApi(['createEmbeddedSignup'])
);
vi.mock('dashboard/helper/AnalyticsHelper', () => mockApi(['track']));

const commit = vi.fn();

describe('inboxes store (OneTeam)', () => {
  afterEach(() => vi.clearAllMocks());

  describe('getters', () => {
    const records = [
      { id: 1, channel_type: 'Channel::Email', message_templates: ['a'] },
      {
        id: 2,
        channel_type: 'Channel::TwilioSms',
        phone_number: 'whatsapp:+1',
        additional_attributes: { message_templates: ['b'] },
      },
      { id: 3, channel_type: 'Channel::TwilioSms', phone_number: '+1' },
      { id: 4, channel_type: 'Channel::Whatsapp', inbox_name: 'wa' },
      { id: 5, channel_type: 'Channel::TwilioSms' },
    ];
    const state = { records };

    it('lists all inboxes camelized', () => {
      expect(getters.getAllInboxes(state)[3]).toEqual({
        id: 4,
        channelType: 'Channel::Whatsapp',
        inboxName: 'wa',
      });
    });

    it('reads WhatsApp templates from the inbox or its attributes', () => {
      expect(getters.getWhatsAppTemplates(state)(1)).toEqual(['a']);
      expect(getters.getWhatsAppTemplates(state)('2')).toEqual(['b']);
      expect(getters.getWhatsAppTemplates(state)(3)).toBeUndefined();
      expect(getters.getWhatsAppTemplates(state)(99)).toBeUndefined();
    });

    it('lists inboxes that can start a conversation (email and Twilio WhatsApp)', () => {
      expect(getters.getNewConversationInboxes(state).map(i => i.id)).toEqual([
        1, 2,
      ]);
    });

    it('finds an inbox by id, camelized, or an empty object', () => {
      expect(getters.getInboxById(state)('4').inboxName).toBe('wa');
      expect(getters.getInboxById(state)(99)).toEqual({});
      expect(getters.getInbox(state)(99)).toEqual({});
    });

    it('lists WhatsApp inboxes', () => {
      expect(getters.getWhatsAppInboxes(state).map(i => i.id)).toEqual([4]);
    });
  });

  describe('revalidate', () => {
    it('refetches inboxes when the cache key is stale', async () => {
      InboxesAPI.validateCacheKey.mockResolvedValue(false);
      InboxesAPI.refetchAndCommit.mockResolvedValue({
        data: { payload: [{ id: 1 }] },
      });
      await actions.revalidate({ commit }, { newKey: 'k' });
      expect(InboxesAPI.refetchAndCommit).toHaveBeenCalledWith('k');
      expect(commit).toHaveBeenCalledWith(types.SET_INBOXES, [{ id: 1 }]);
    });

    it('keeps the cache when the key is still valid, and ignores errors', async () => {
      InboxesAPI.validateCacheKey.mockResolvedValueOnce(true);
      await actions.revalidate({ commit }, { newKey: 'k' });
      InboxesAPI.validateCacheKey.mockRejectedValueOnce(new Error('offline'));
      await actions.revalidate({ commit }, { newKey: 'k' });
      expect(commit).not.toHaveBeenCalled();
    });
  });

  describe('channel creation', () => {
    const created = { data: { id: 9 } };

    it('creates an API channel and tracks its type', async () => {
      WebChannel.create.mockResolvedValue(created);
      const params = { name: 'API', channel: { type: 'api' } };
      await expect(actions.createChannel({ commit }, params)).resolves.toEqual({
        id: 9,
      });
      expect(commit.mock.calls).toEqual([
        [types.SET_INBOXES_UI_FLAG, { isCreating: true }],
        [types.ADD_INBOXES, { id: 9 }],
        [types.SET_INBOXES_UI_FLAG, { isCreating: false }],
      ]);
      expect(AnalyticsHelper.track).toHaveBeenCalledWith(expect.any(String), {
        channelType: 'api',
      });
    });

    it('tracks an undefined type when no channel is given', async () => {
      WebChannel.create.mockResolvedValue(created);
      await actions.createChannel({ commit }, { name: 'x' });
      expect(AnalyticsHelper.track).toHaveBeenCalledWith(expect.any(String), {
        channelType: undefined,
      });
    });

    it('reports a failed API channel', async () => {
      WebChannel.create.mockRejectedValue(apiError('Taken'));
      await expect(actions.createChannel({ commit }, {})).rejects.toThrow(
        'Taken'
      );
      expect(commit).toHaveBeenLastCalledWith(types.SET_INBOXES_UI_FLAG, {
        isCreating: false,
      });
    });

    it.each([
      ['createTwilioChannel', TwilioChannel, 'create', 'twilio'],
      [
        'createWhatsAppEmbeddedSignup',
        WhatsappChannel,
        'createEmbeddedSignup',
        'whatsapp',
      ],
    ])('%s adds the inbox, or rethrows', async (action, api, method, type) => {
      api[method].mockResolvedValueOnce(created);
      await expect(actions[action]({ commit }, {})).resolves.toEqual({ id: 9 });
      expect(AnalyticsHelper.track).toHaveBeenCalledWith(expect.any(String), {
        channelType: type,
      });

      const error = new Error('bad');
      api[method].mockRejectedValueOnce(error);
      await expect(actions[action]({ commit }, {})).rejects.toBe(error);
      expect(commit).toHaveBeenLastCalledWith(types.SET_INBOXES_UI_FLAG, {
        isCreating: false,
      });
    });
  });

  describe('updates', () => {
    it('sends plain JSON when formData is false', async () => {
      InboxesAPI.update.mockResolvedValue({ data: { id: 1 } });
      await actions.updateInbox(
        { commit },
        { id: 1, formData: false, name: 'x' }
      );
      expect(InboxesAPI.update).toHaveBeenCalledWith(1, { name: 'x' });
    });

    it('saves call business hours', async () => {
      InboxesAPI.setCallBusinessHours.mockResolvedValue({ data: { id: 1 } });
      await actions.updateCallBusinessHours(
        { commit },
        { id: 1, enabled: true, message: 'Closed' }
      );
      expect(InboxesAPI.setCallBusinessHours).toHaveBeenCalledWith(1, {
        enabled: true,
        message: 'Closed',
      });
      expect(commit).toHaveBeenCalledWith(types.EDIT_INBOXES, { id: 1 });
    });

    it('reauthorizes a Facebook page, rethrowing the message on failure', async () => {
      FBChannel.reauthorizeFacebookPage.mockResolvedValueOnce({
        data: { id: 1 },
      });
      await actions.reauthorizeFacebookPage({ commit }, { inboxId: 1 });
      expect(commit).toHaveBeenCalledWith(types.EDIT_INBOXES, { id: 1 });

      FBChannel.reauthorizeFacebookPage.mockRejectedValueOnce(
        new Error('expired')
      );
      await expect(
        actions.reauthorizeFacebookPage({ commit }, { inboxId: 1 })
      ).rejects.toThrow('expired');
    });
  });

  describe('CSAT templates', () => {
    it.each([
      [
        'createCSATTemplate',
        { inboxId: 1, template: { body: 'x' } },
        [1, { body: 'x' }],
      ],
      ['getCSATTemplateStatus', { inboxId: 1 }, [1]],
      ['analyzeCSATTemplateUtility', { inboxId: 1, template: 't' }, [1, 't']],
    ])('%s returns the API data', async (action, params, args) => {
      InboxesAPI[action].mockResolvedValue({ data: { ok: true } });
      await expect(actions[action]({}, params)).resolves.toEqual({ ok: true });
      expect(InboxesAPI[action]).toHaveBeenCalledWith(...args);
    });
  });

  describe('secrets', () => {
    it.each(['resetSecret', 'rotateHmacToken'])(
      '%s stores and returns the updated inbox',
      async action => {
        InboxesAPI[action].mockResolvedValue({ data: { id: 1, secret: 's' } });
        await expect(actions[action]({ commit }, 1)).resolves.toEqual({
          id: 1,
          secret: 's',
        });
        expect(commit).toHaveBeenCalledWith(types.EDIT_INBOXES, {
          id: 1,
          secret: 's',
        });
      }
    );

    it('reports a failed secret reset or token rotation', async () => {
      InboxesAPI.resetSecret.mockRejectedValue(apiError('Nope'));
      await expect(actions.resetSecret({ commit }, 1)).rejects.toThrow('Nope');
      InboxesAPI.rotateHmacToken.mockRejectedValue(apiError('No'));
      await expect(actions.rotateHmacToken({ commit }, 1)).rejects.toThrow(
        'No'
      );
    });
  });

  describe('buildInboxData', () => {
    it('sends feature flags as a list and other channel keys as fields', () => {
      const form = buildInboxData({
        name: 'Site',
        channel: { selectedFeatureFlags: ['attachments', 'emoji'], url: 'u' },
      });
      expect(form.get('name')).toBe('Site');
      expect(form.getAll('channel[selected_feature_flags][]')).toEqual([
        'attachments',
        'emoji',
      ]);
      expect(form.get('channel[url]')).toBe('u');
    });

    it('sends an empty flag to clear all feature flags', () => {
      const form = buildInboxData({ channel: { selectedFeatureFlags: [] } });
      expect(form.getAll('channel[selected_feature_flags][]')).toEqual(['']);
    });
  });
});
