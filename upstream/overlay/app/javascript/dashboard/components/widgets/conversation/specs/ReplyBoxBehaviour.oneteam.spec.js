/**
 * OneTeam behaviour specs for the conversation reply box: drafts, pasting
 * files, the send paths for each channel, the email payload, recipients,
 * reply-to, the audio recorder and typing status. Methods are called on the
 * component instance; the child components are shallow stubs.
 */
import { flushPromises, shallowMount } from '@vue/test-utils';
import { appendSignature } from 'dashboard/helper/editorHelper';
import { REPLY_EDITOR_MODES } from 'dashboard/components/widgets/WootWriter/constants';
import { useAlert, useTrack } from 'dashboard/composables';
import { BUS_EVENTS } from 'shared/constants/busEvents';
import { LOCAL_STORAGE_KEYS } from 'dashboard/constants/localStorage';
import { LocalStorage } from 'shared/helpers/localStorage';
import { emitter } from 'shared/helpers/mitt';
import { nextTick } from 'vue';
import { createStore } from 'vuex';
import ReplyBox from '../ReplyBox.vue';

// Keep the shortcut table so tests can run each action directly.
const shortcuts = {};
vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: events => Object.assign(shortcuts, events),
}));

vi.mock('dashboard/composables', async importOriginal => ({
  ...(await importOriginal()),
  useAlert: vi.fn(),
  useTrack: vi.fn(),
}));

const CHAT = {
  id: 1,
  inbox_id: 1,
  can_reply: true,
  status: 'open',
  meta: { sender: { id: 2, email: 'ada@example.test' } },
  messages: [
    { id: 11, content: 'first' },
    { id: 12, content: 'second' },
  ],
};

const buildStore = ({
  inbox,
  chat,
  signature = '',
  uiSettings = {},
  globalConfig = {},
  lastEmail = null,
  sendRejects = null,
}) => {
  const dispatched = [];
  const store = createStore({
    state: {
      chat: { ...CHAT, ...chat },
      drafts: {},
      lastEmail,
    },
    mutations: {
      selectChat: (s, c) => {
        s.chat = c;
      },
      setDraft: (s, { key, message }) => {
        s.drafts = { ...s.drafts, [key]: message };
      },
      deleteDraft: (s, { key }) => {
        const { [key]: _removed, ...rest } = s.drafts;
        s.drafts = rest;
      },
      setLastEmail: (s, email) => {
        s.lastEmail = email;
      },
    },
    actions: {
      'draftMessages/setReplyEditorMode': () => {},
      'draftMessages/set': ({ commit }, payload) => commit('setDraft', payload),
      'draftMessages/delete': ({ commit }, payload) =>
        commit('deleteDraft', payload),
      createPendingMessageAndSend: (_, payload) => {
        dispatched.push(payload);
        return sendRejects ? Promise.reject(sendRejects) : Promise.resolve();
      },
      'conversationTypingStatus/toggleTyping': (_, payload) => {
        dispatched.push({ typing: payload });
      },
      updateUISettings: () => {},
    },
    getters: {
      getSelectedChat: s => s.chat,
      getCurrentUser: () => ({
        id: 7,
        name: 'Agent',
        avatar_url: 'a.png',
        accounts: [],
      }),
      getCurrentAccountId: () => 1,
      getMessageSignature: () => signature,
      getUISettings: () => uiSettings,
      getLastEmailInSelectedChat: s => s.lastEmail,
      'globalConfig/get': () => globalConfig,
      'globalConfig/isMetaMessageSendingDisabled': () => false,
      'inboxes/getInbox': () => id => ({ id, ...inbox }),
      'inboxes/getWhatsAppTemplates': () => () => [],
      'contacts/getContact': () => () => ({ name: 'Ada' }),
      'draftMessages/get': s => key => s.drafts[key] || '',
      'draftMessages/getReplyEditorMode': () => REPLY_EDITOR_MODES.REPLY,
      'accounts/isFeatureEnabledonAccount': () => () => false,
      'accounts/getAccount': () => () => ({}),
      'portals/allPortals': () => [],
      'integrations/getUIFlags': () => ({ isFetching: false }),
    },
  });
  return { store, dispatched };
};

// Stubs for the children the reply box calls methods on through refs.
const confirmation = vi.fn();
const openAttributes = vi.fn();
const focusEditor = vi.fn();
const recorder = { stopRecording: vi.fn(), playPause: vi.fn() };
const refStubs = {
  AudioRecorder: {
    name: 'AudioRecorder',
    template: '<div />',
    methods: {
      stopRecording: () => recorder.stopRecording(),
      playPause: () => recorder.playPause(),
    },
  },
  'woot-confirm-modal': {
    template: '<div />',
    methods: { showConfirmation: (...a) => confirmation(...a) },
  },
  ConversationResolveAttributesModal: {
    template: '<div />',
    methods: { open: (...a) => openAttributes(...a) },
  },
  WootMessageEditor: {
    template: '<div><slot name="footer" /></div>',
    methods: { focusEditorInputField: (...a) => focusEditor(...a) },
  },
};

const mountWith = (options = {}) => {
  const { store, dispatched } = buildStore({
    inbox: { channel_type: 'Channel::WebWidget' },
    ...options,
  });
  const wrapper = shallowMount(ReplyBox, {
    attachTo: options.attach ? document.body : undefined,
    global: {
      plugins: [store],
      mocks: {
        $t: (key, args) => (args ? `${key} ${JSON.stringify(args)}` : key),
      },
      stubs: { transition: false, ...refStubs },
    },
  });
  return { wrapper, vm: wrapper.vm, store, dispatched };
};

const EMAIL = { channel_type: 'Channel::Email', email: 'support@example.test' };
const WHATSAPP = { channel_type: 'Channel::Whatsapp' };
const WHATSAPP_CLOUD = { ...WHATSAPP, provider: 'whatsapp_cloud' };
const INSTAGRAM = { channel_type: 'Channel::Instagram' };

const attachment = (name, extra = {}) => ({
  resource: { file: { name } },
  blobSignedId: `signed-${name}`,
  ...extra,
});

afterEach(() => {
  localStorage.clear();
});

describe('ReplyBox behaviour', () => {
  describe('drafts', () => {
    it('saves, restores and removes the draft for the current mode', async () => {
      const { vm, store } = mountWith();
      vm.message = 'half written';
      vm.onBlur();
      expect(store.state.drafts['draft-1-REPLY']).toBe('half written');

      vm.setToDraft(1, REPLY_EDITOR_MODES.NOTE);
      expect(vm.message).toBe('');
      expect(store.state.drafts['draft-1-NOTE']).toBe('half written');

      vm.getFromDraft();
      expect(vm.message).toBe('half written');

      const dispatch = vi.spyOn(store, 'dispatch');
      vm.removeFromDraft();
      expect(dispatch).toHaveBeenCalledWith('draftMessages/delete', {
        key: 'draft-1-REPLY',
      });
    });

    it('keeps the draft context when nothing changed and moves it otherwise', () => {
      const { vm, store } = mountWith();
      vm.message = 'kept';
      vm.switchDraftContext(1, REPLY_EDITOR_MODES.REPLY);
      expect(vm.message).toBe('kept');

      vm.switchDraftContext(1, REPLY_EDITOR_MODES.NOTE);
      expect(store.state.drafts['draft-1-REPLY']).toBe('kept');
      expect(vm.draftReplyMode).toBe(REPLY_EDITOR_MODES.NOTE);
    });

    it('moves the draft and clears attachments when the conversation changes', async () => {
      const { vm, store } = mountWith();
      vm.message = 'for conversation one';
      vm.attachedFiles = [attachment('a.png')];
      vm.isQuoteRemoved = true;
      store.commit('selectChat', { ...CHAT, id: 2 });
      await nextTick();

      expect(store.state.drafts['draft-1-REPLY']).toBe('for conversation one');
      expect(vm.attachedFiles).toEqual([]);
      expect(vm.isQuoteRemoved).toBe(false);
    });

    it('adds or strips the signature on a restored draft', () => {
      const signed = mountWith({
        signature: 'Thanks, Agent',
        uiSettings: { channel_webwidget_signature_enabled: true },
      });
      expect(signed.vm.toggleSignatureForDraft('Hi')).toContain(
        'Thanks, Agent'
      );

      const unsigned = mountWith({ signature: 'Thanks, Agent' });
      expect(
        unsigned.vm.toggleSignatureForDraft('Hi\n\n--\n\nThanks, Agent')
      ).not.toContain('Thanks, Agent');

      unsigned.vm.replyType = REPLY_EDITOR_MODES.NOTE;
      expect(unsigned.vm.toggleSignatureForDraft('note')).toBe('note');
    });

    it('leaves a signed draft alone when the editor is disabled', () => {
      const { vm } = mountWith({
        inbox: WHATSAPP,
        chat: { can_reply: false },
        signature: 'Sig',
        uiSettings: { channel_whatsapp_signature_enabled: true },
      });
      expect(vm.isEditorDisabled).toBe(true);
      expect(vm.toggleSignatureForDraft('as is')).toBe('as is');
    });
  });

  describe('copilot accepted messages', () => {
    it('stores, reads and clears the accepted text per draft key', () => {
      const { vm } = mountWith();
      vm.setCopilotAcceptedMessage('suggested');
      expect(vm.getCopilotAcceptedMessage()).toBe('suggested');
      vm.setCopilotAcceptedMessage(null, REPLY_EDITOR_MODES.NOTE);
      expect(vm.getCopilotAcceptedMessage(REPLY_EDITOR_MODES.NOTE)).toBe('');
      vm.clearCopilotAcceptedMessage();
      expect(vm.getCopilotAcceptedMessage()).toBe('');
    });

    it('accepts the copilot reply into the editor', () => {
      const { vm } = mountWith();
      vm.copilot.accept = () => 'from copilot';
      vm.onSubmitCopilotReply();
      expect(vm.message).toBe('from copilot');
      expect(vm.getCopilotAcceptedMessage()).toBe('from copilot');
    });
  });

  describe('editor helpers', () => {
    it('inserts a help center article as a markdown link', () => {
      const { vm } = mountWith();
      const inserted = vi.fn();
      emitter.on(BUS_EVENTS.INSERT_INTO_RICH_EDITOR, inserted);
      vm.handleInsert({
        url: 'https://help.test/a',
        title: 'Reset\n\npassword',
      });
      emitter.off(BUS_EVENTS.INSERT_INTO_RICH_EDITOR, inserted);

      expect(inserted).toHaveBeenCalledWith(
        '[Reset password](https://help.test/a)'
      );
      expect(useTrack).toHaveBeenCalled();
    });

    it('removes and restores the quoted email once', () => {
      const { vm } = mountWith();
      expect(vm.restoreQuotedEmail()).toBe(false);
      vm.removeQuotedEmail();
      expect(vm.restoreQuotedEmail()).toBe(true);
      expect(vm.isQuoteRemoved).toBe(false);
    });

    it('toggles menus, pickers, the article search and the editor size', async () => {
      const { vm, wrapper } = mountWith();
      vm.toggleUserMention(true);
      vm.toggleCannedMenu(true);
      vm.toggleVariablesMenu(true);
      vm.toggleMacrosMenu(true);
      expect(vm.isAValidEvent('enter')).toBe(false);
      expect([
        vm.showUserMentions,
        vm.showCannedMenu,
        vm.showVariablesMenu,
        vm.showMacrosMenu,
      ]).toEqual([true, true, true, true]);

      vm.toggleEmojiPicker();
      expect(vm.showEmojiPicker).toBe(true);
      vm.hideEmojiPicker();
      vm.hideEmojiPicker();
      expect(vm.showEmojiPicker).toBe(false);

      vm.toggleInsertArticle();
      expect(vm.showArticleSearchPopover).toBe(true);
      vm.onSearchPopoverClose();
      expect(vm.showArticleSearchPopover).toBe(false);

      vm.addIntoEditor('canned text');
      expect(vm.updateEditorSelectionWith).toBe('canned text');
      expect(vm.isFocused).toBe(true);
      vm.clearEditorSelection();
      expect(vm.updateEditorSelectionWith).toBe('');

      vm.toggleEditorSize();
      await nextTick();
      expect(wrapper.emitted('toggleEditorSize')).toHaveLength(1);

      vm.onNewConversationModalActive(true);
      expect(vm.newConversationModalActive).toBe(true);
      vm.onRecordProgressChanged('00:03');
      expect(vm.recordingAudioDurationText).toBe('00:03');
      vm.removeAttachment([]);
      expect(vm.attachedFiles).toEqual([]);
    });

    it('opens and hides the template modals', () => {
      const { vm } = mountWith();
      vm.openContactInfoTemplateModal();
      expect(vm.requestContactInfoTemplatesOnly).toBe(true);
      vm.openWhatsappTemplateModal();
      expect(vm.requestContactInfoTemplatesOnly).toBe(false);
      expect(vm.showWhatsAppTemplatesModal).toBe(true);
      vm.hideWhatsappTemplatesModal();
      expect(vm.showWhatsAppTemplatesModal).toBe(false);
      vm.openContentTemplateModal();
      expect(vm.showContentTemplatesModal).toBe(true);
      vm.hideContentTemplatesModal();
      expect(vm.showContentTemplatesModal).toBe(false);
    });

    it('runs a macro and asks for missing attributes when needed', () => {
      const { vm } = mountWith();
      vm.macroExecution.execute = vi.fn(() => null);
      vm.onExecuteMacro({ id: 3 });
      expect(vm.macroExecution.execute).toHaveBeenCalledWith({ id: 3 }, 1);

      vm.macroExecution.execute = vi.fn(() => ({
        missing: ['priority'],
        customAttributes: {},
      }));
      vm.onExecuteMacro({ id: 4 });
      expect(openAttributes).toHaveBeenCalledWith(['priority'], {});
    });
  });

  describe('pasting files', () => {
    const paste = files => ({ clipboardData: { files } });
    const png = { name: 'shot.png', type: 'image/png', size: 10 };

    it('uploads pasted files the channel accepts and skips empty ones', () => {
      const { vm } = mountWith();
      const upload = vi.spyOn(vm, 'onFileUpload').mockImplementation(() => {});
      vm.onPaste(paste([png, { ...png, name: 'empty.png', size: 0 }]));
      expect(upload).toHaveBeenCalledTimes(1);
      expect(upload).toHaveBeenCalledWith({ ...png, file: png });
    });

    it('alerts for a file type the channel refuses', () => {
      const { vm } = mountWith({ inbox: INSTAGRAM });
      const upload = vi.spyOn(vm, 'onFileUpload').mockImplementation(() => {});
      vm.onPaste(
        paste([{ name: 'doc.pdf', type: 'application/pdf', size: 5 }])
      );
      expect(upload).not.toHaveBeenCalled();
      expect(useAlert).toHaveBeenCalledWith(
        expect.stringContaining('CONVERSATION.FILE_TYPE_NOT_SUPPORTED')
      );
    });

    it('ignores the paste while another modal or a locked editor is active', () => {
      const modal = mountWith();
      const upload = vi.spyOn(modal.vm, 'onFileUpload');
      modal.vm.newConversationModalActive = true;
      modal.vm.onPaste(paste([png]));

      const locked = mountWith({ inbox: WHATSAPP, chat: { can_reply: false } });
      locked.vm.onPaste(paste([png]));

      const noUpload = mountWith({
        inbox: { channel_type: 'Channel::Twitter' },
      });
      noUpload.vm.onPaste(paste([png]));
      expect(upload).not.toHaveBeenCalled();
    });
  });

  describe('attachments', () => {
    it('reads an attached file into a preview', async () => {
      const { vm } = mountWith();
      const file = new File(['x'], 'a.txt', { type: 'text/plain' });
      vm.attachFile({ file: { file, isVoiceMessage: true } });
      await vi.waitFor(() => expect(vm.attachedFiles).toHaveLength(1));
      expect(vm.attachedFiles[0]).toMatchObject({
        currentChatId: 1,
        isPrivate: false,
        isVoiceMessage: true,
        blobSignedId: undefined,
      });

      vm.attachFile({ file: { file }, blob: { signed_id: 'abc' } });
      await vi.waitFor(() => expect(vm.attachedFiles).toHaveLength(2));
      expect(vm.attachedFiles[1].blobSignedId).toBe('abc');
    });

    it('does not attach on a channel without uploads', () => {
      const { vm } = mountWith({ inbox: { channel_type: 'Channel::Twitter' } });
      vm.attachFile({ file: { file: new File(['x'], 'a.txt') } });
      expect(vm.attachedFiles).toEqual([]);
    });

    it('keeps a recorded voice message as an attachment', () => {
      const { vm } = mountWith();
      const upload = vi.spyOn(vm, 'onFileUpload').mockImplementation(() => {});
      vm.onFinishRecorder({ name: 'voice.wav' });
      expect(vm.hasRecordedAudio).toBe(true);
      expect(upload).toHaveBeenCalledWith({
        name: 'voice.wav',
        isVoiceMessage: true,
      });
    });
  });

  describe('audio recorder', () => {
    it('toggles recording and resets the recorder state', () => {
      const { vm } = mountWith();
      vm.attachedFiles = [
        attachment('v', { isVoiceMessage: true }),
        attachment('a'),
      ];
      vm.toggleAudioRecorder();
      expect(vm.isRecordingAudio).toBe(true);
      vm.toggleAudioRecorder();
      expect(vm.isRecordingAudio).toBe(false);
      expect(vm.attachedFiles).toHaveLength(1);
    });

    it('turns the recorder off and alerts when conversion fails', () => {
      const { vm } = mountWith();
      vm.isRecordingAudio = true;
      vm.onRecordError();
      expect(vm.isRecordingAudio).toBe(false);
      expect(useAlert).toHaveBeenCalledWith(
        'CONVERSATION.REPLYBOX.AUDIO_CONVERSION_FAILED'
      );
    });

    it('does nothing for play/pause without a recorder', () => {
      const { vm } = mountWith();
      expect(() => vm.toggleAudioRecorderPlayPause()).not.toThrow();
    });

    it('stops recording when switching to a private note', () => {
      const { vm } = mountWith();
      vm.attachedFiles = [attachment('a')];
      vm.isRecordingAudio = true;
      vm.setReplyMode(REPLY_EDITOR_MODES.NOTE);
      expect(vm.attachedFiles).toEqual([]);
      expect(vm.replyType).toBe(REPLY_EDITOR_MODES.NOTE);
      expect(vm.isRecordingAudio).toBe(false);
      vm.setReplyMode();
      expect(vm.replyType).toBe(REPLY_EDITOR_MODES.REPLY);
    });
  });

  describe('typing status', () => {
    it('sends typing on and off for the current conversation', () => {
      const { vm, dispatched } = mountWith();
      vm.onTypingOn();
      vm.onTypingOff();
      expect(dispatched).toEqual([
        { typing: { status: 'on', conversationId: 1, isPrivate: false } },
        { typing: { status: 'off', conversationId: 1, isPrivate: false } },
      ]);
    });

    it('skips typing status without a conversation id', () => {
      const { vm, dispatched } = mountWith({ chat: { id: 0 } });
      vm.toggleTyping('on');
      expect(dispatched).toEqual([]);
    });
  });

  describe('message payloads', () => {
    it('builds an email payload with recipients, subject and files', () => {
      const { vm } = mountWith({ inbox: EMAIL });
      vm.attachedFiles = [attachment('a.pdf')];
      vm.ccEmails = 'cc@example.test';
      vm.bccEmails = 'bcc@example.test';
      vm.toEmails = 'to@example.test';
      vm.subject = 'Re: order';
      vm.inReplyTo = { id: 12 };

      expect(vm.getMessagePayload('Hello')).toEqual({
        conversationId: 1,
        message: 'Hello',
        private: false,
        sender: { name: 'Agent', thumbnail: 'a.png' },
        contentAttributes: { in_reply_to: 12 },
        files: [{ name: 'a.pdf' }],
        ccEmails: 'cc@example.test',
        bccEmails: 'bcc@example.test',
        toEmails: 'to@example.test',
        subject: 'Re: order',
      });
    });

    it('sends signed blob ids and flags voice messages with direct uploads', () => {
      const { vm } = mountWith({
        globalConfig: { directUploadsEnabled: true },
      });
      vm.attachedFiles = [attachment('voice', { isVoiceMessage: true })];
      expect(vm.getMessagePayload('')).toMatchObject({
        files: ['signed-voice'],
        isVoiceMessage: true,
      });
    });

    it('quotes the last email unless the quote was removed', async () => {
      const lastEmail = {
        id: 5,
        content: 'Original question',
        created_at: 1767261600,
        message_type: 0,
        content_attributes: {
          email: {
            text_content: { full: 'Original question' },
            from: ['ada@example.test'],
          },
        },
      };
      const { vm, wrapper } = mountWith({ inbox: EMAIL, lastEmail });
      const quoted = vm.getMessageWithQuotedEmailText('Answer');
      expect(quoted).toContain('Answer');
      expect(quoted.length).toBeGreaterThan('Answer'.length);

      await nextTick();
      wrapper.findComponent({ name: 'QuotedEmailPreview' }).vm.$emit('remove');
      expect(vm.getMessageWithQuotedEmailText('Answer')).toBe('Answer');
    });

    it('splits WhatsApp attachments and captions only the first', () => {
      const { vm } = mountWith({ inbox: WHATSAPP });
      vm.attachedFiles = [attachment('a'), attachment('b')];
      const payloads = vm.getMultipleMessagesPayload('caption');
      expect(payloads.map(p => p.message)).toEqual(['caption', '']);
      expect(payloads.map(p => p.files)).toEqual([
        [{ name: 'a' }],
        [{ name: 'b' }],
      ]);
    });

    it('sends Instagram text separately from uncaptioned attachments', () => {
      const { vm } = mountWith({
        inbox: INSTAGRAM,
        globalConfig: { directUploadsEnabled: true },
      });
      vm.attachedFiles = [attachment('a')];
      vm.message = 'text';
      vm.inReplyTo = { id: 11 };
      const payloads = vm.getMultipleMessagesPayload('text');
      expect(payloads).toHaveLength(2);
      expect(payloads[0]).toMatchObject({
        message: '',
        files: ['signed-a'],
        contentAttributes: { in_reply_to: 11 },
      });
      expect(payloads[1]).toMatchObject({ message: 'text' });
    });
  });

  describe('sending', () => {
    it('sends a web widget reply, tracks it and clears the composer', async () => {
      const { vm, dispatched, store } = mountWith();
      const scrolled = vi.fn();
      emitter.on(BUS_EVENTS.SCROLL_TO_MESSAGE, scrolled);
      vm.message = 'Hello';
      store.commit('setDraft', { key: 'draft-1-REPLY', message: 'Hello' });
      await vm.onSendReply();
      await flushPromises();
      emitter.off(BUS_EVENTS.SCROLL_TO_MESSAGE, scrolled);

      expect(dispatched).toEqual([
        expect.objectContaining({ message: 'Hello', private: false }),
      ]);
      expect(scrolled).toHaveBeenCalled();
      expect(vm.message).toBe('');
      expect(useTrack).toHaveBeenCalledWith(expect.any(String), {
        channelType: 'Channel::WebWidget',
        signatureEnabled: undefined,
        hasReplyTo: false,
      });
    });

    it('does not send an empty reply', async () => {
      const { vm, dispatched } = mountWith();
      vm.confirmOnSendReply();
      await flushPromises();
      expect(dispatched).toEqual([]);
    });

    it('waits for the mention menu to close before sending', async () => {
      const { vm, dispatched } = mountWith();
      vm.message = 'Hi @';
      vm.showMentions = true;
      vm.confirmOnSendReply();
      await flushPromises();
      expect(dispatched).toEqual([]);
    });

    it('sends WhatsApp replies as separate messages', async () => {
      const { vm, dispatched } = mountWith({ inbox: WHATSAPP_CLOUD });
      vm.message = 'Order shipped';
      vm.confirmOnSendReply();
      await flushPromises();
      expect(dispatched).toEqual([
        expect.objectContaining({ message: 'Order shipped', private: false }),
      ]);
    });

    it('tracks an AI assisted reply and whether it was edited', async () => {
      const { vm } = mountWith();
      vm.setCopilotAcceptedMessage('Suggested reply');
      vm.message = 'Suggested reply, edited';
      vm.confirmOnSendReply();
      await flushPromises();
      expect(useTrack).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ editedBeforeSend: true, isPrivate: false })
      );
    });

    // Chatwoot quirk (see FINDINGS.md): removeSignature leaves the blank
    // lines before the delimiter, so an unedited AI reply sent with a
    // signature is still reported as edited.
    it('reports an unedited AI reply with a signature as edited', () => {
      const { vm } = mountWith({
        signature: 'Sig',
        uiSettings: { channel_webwidget_signature_enabled: true },
      });
      vm.sendMessageAnalyticsData(false, {
        editorMessage: vm.toggleSignatureForDraft('Same'),
        copilotAcceptedMessage: 'Same',
      });
      expect(useTrack).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ editedBeforeSend: true })
      );
      vm.sendMessageAnalyticsData(true);
      expect(useTrack).toHaveBeenCalledTimes(3);
    });

    it('re-adds the signature after clearing a public reply', () => {
      const { vm } = mountWith({
        signature: 'Sig',
        uiSettings: { channel_webwidget_signature_enabled: true },
      });
      vm.message = 'sent';
      vm.clearMessage();
      expect(vm.message).toContain('Sig');
    });

    it('shows the API error, or a generic one, when sending fails', async () => {
      const failing = mountWith({
        sendRejects: { response: { data: { error: 'Window closed' } } },
      });
      await failing.vm.sendMessage({ message: 'x' });
      expect(useAlert).toHaveBeenCalledWith('Window closed');

      const generic = mountWith({ sendRejects: new Error('offline') });
      await generic.vm.sendMessage({ message: 'x' });
      expect(useAlert).toHaveBeenCalledWith('CONVERSATION.MESSAGE_ERROR');
    });

    it('asks before sending a message with undefined variables', async () => {
      const { vm, dispatched } = mountWith();
      confirmation.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      vm.message = 'Hi {{contact.unknown_field}}';
      await vm.onSendReply();
      await flushPromises();
      expect(dispatched).toEqual([]);
      expect(vm.undefinedVariableMessage).toContain('contact.unknown_field');

      await vm.onSendReply();
      await flushPromises();
      expect(dispatched).toHaveLength(1);
    });

    it('sends WhatsApp and content templates and closes their modals', async () => {
      const { vm, dispatched } = mountWith();
      vm.showWhatsAppTemplatesModal = true;
      await vm.onSendWhatsAppReply({ message: 'template', templateParams: {} });
      vm.showContentTemplatesModal = true;
      await vm.onSendContentTemplateReply({ message: 'content' });
      await flushPromises();
      expect(dispatched.map(d => d.message)).toEqual(['template', 'content']);
      expect(dispatched[0].conversationId).toBe(1);
      expect(vm.showWhatsAppTemplatesModal).toBe(false);
      expect(vm.showContentTemplatesModal).toBe(false);
    });
  });

  describe('recipients and reply-to', () => {
    it('sets cc and bcc from the email head', () => {
      const { vm } = mountWith();
      vm.setCcEmails({ ccEmails: 'a@x.test', bccEmails: 'b@x.test' });
      expect([vm.ccEmails, vm.bccEmails]).toEqual(['a@x.test', 'b@x.test']);
    });

    it('fills recipients from the last email when it arrives', async () => {
      const { vm, store } = mountWith({ inbox: EMAIL });
      store.commit('setLastEmail', {
        message_type: 0,
        content_attributes: {
          email: {
            from: ['ada@example.test'],
            to: ['support@example.test'],
            cc: ['boss@example.test'],
          },
        },
      });
      await nextTick();
      expect(vm.toEmails).toBe('ada@example.test');
      expect(vm.ccEmails).toBe('boss@example.test');
    });

    it('resets the subject and recipients when switching to another email conversation', async () => {
      const { vm, store } = mountWith({ inbox: EMAIL });
      vm.subject = 'Old subject';
      store.commit('selectChat', { ...CHAT, id: 3 });
      await nextTick();
      expect(vm.subject).toBe('');
    });

    it('opens a voice call conversation in note mode', async () => {
      const { vm, store } = mountWith();
      store.commit('selectChat', {
        ...CHAT,
        id: 4,
        messages: [{ id: 1, content_type: 'voice_call', created_at: 1 }],
      });
      await nextTick();
      expect(vm.replyType).toBe(REPLY_EDITOR_MODES.NOTE);
    });

    it('loads the reply-to message from local storage and clears it after', async () => {
      const { vm } = mountWith();
      LocalStorage.updateJsonStore(LOCAL_STORAGE_KEYS.MESSAGE_REPLY_TO, 1, 12);
      vm.onReplyToMessage();
      expect(vm.inReplyTo).toMatchObject({ id: 12 });
      await nextTick();
      expect(focusEditor).toHaveBeenCalledWith('end');

      vm.resetReplyToMessage();
      expect(
        LocalStorage.getFromJsonStore(LOCAL_STORAGE_KEYS.MESSAGE_REPLY_TO, 1)
      ).toBeFalsy();
    });

    it('skips focusing when there is no reply-to message', () => {
      const { vm } = mountWith();
      vm.onReplyToMessage();
      expect(vm.inReplyTo).toBeUndefined();
    });
  });

  describe('keyboard shortcuts', () => {
    const key = (extra = {}) => ({
      preventDefault: vi.fn(),
      isComposing: false,
      keyCode: 13,
      ...extra,
    });

    it('closes the emoji picker on Escape and opens the command bar', () => {
      const { vm } = mountWith();
      vm.showEmojiPicker = true;
      shortcuts.Escape.action();
      expect(vm.showEmojiPicker).toBe(false);

      const ninja = document.createElement('ninja-keys');
      ninja.open = vi.fn();
      document.body.appendChild(ninja);
      const event = key();
      shortcuts['$mod+KeyK'].action(event);
      expect(ninja.open).toHaveBeenCalled();
      expect(event.preventDefault).toHaveBeenCalled();
      ninja.remove();
    });

    it('sends on Enter only when enter-to-send is on and the editor is focused', async () => {
      const { vm, dispatched } = mountWith({
        uiSettings: { enter_to_send_enabled: true },
      });
      vm.message = 'Hello';
      shortcuts.Enter.action(key());
      vm.isFocused = true;
      shortcuts.Enter.action(key({ isComposing: true }));
      await flushPromises();
      expect(dispatched).toEqual([]);

      const event = key();
      shortcuts.Enter.action(event);
      await flushPromises();
      expect(event.preventDefault).toHaveBeenCalled();
      expect(dispatched).toHaveLength(1);
    });

    it('sends on Cmd+Enter, or accepts the copilot reply while copilot is open', async () => {
      const { vm, dispatched } = mountWith();
      vm.message = 'Hello';
      vm.isFocused = true;
      shortcuts['$mod+Enter'].action(key({ isComposing: true }));
      shortcuts['$mod+Enter'].action(key());
      await flushPromises();
      expect(dispatched).toHaveLength(1);

      vm.copilot.showEditor.value = true;
      vm.copilot.accept = () => 'accepted';
      shortcuts['$mod+Enter'].action(key());
      expect(vm.message).toBe('accepted');
      vm.copilot.showEditor.value = false;

      vm.isFocused = false;
      shortcuts['$mod+Enter'].action(key());
      await flushPromises();
      expect(dispatched).toHaveLength(1);
    });

    it('restores a removed quote on undo inside the composer only', () => {
      const { vm, wrapper } = mountWith({ attach: true });
      const undo = (target, extra = {}) => {
        const event = key({ target, defaultPrevented: false, ...extra });
        shortcuts['$mod+KeyZ'].action(event);
        return event.preventDefault.mock.calls.length > 0;
      };
      const input = document.createElement('input');
      const outside = document.createElement('div');

      vm.removeQuotedEmail();
      expect(undo(wrapper.element, { defaultPrevented: true })).toBe(false);
      expect(undo(wrapper.element, { shiftKey: true })).toBe(false);
      expect(undo(input)).toBe(false);
      expect(undo(outside)).toBe(false);
      expect(vm.isQuoteRemoved).toBe(true);
      expect(undo(document.body)).toBe(true);
      expect(vm.isQuoteRemoved).toBe(false);
      expect(undo(document.body)).toBe(false);
      wrapper.unmount();
    });
  });

  describe('child component events', () => {
    it('inserts the picked emoji and lays the picker out for the expanded view', async () => {
      const { vm, wrapper } = mountWith({
        uiSettings: { conversation_display_type: 'expanded' },
      });
      vm.showEmojiPicker = true;
      await flushPromises();
      expect(vm.isOnExpandedLayout).toBe(true);
      wrapper
        .findComponent({ name: 'EmojiIconPicker' })
        .vm.$emit('select', { value: '🙂' });
      expect(vm.updateEditorSelectionWith).toBe('🙂');
    });

    it('follows the recorder state and plays, pauses or stops it', async () => {
      const { vm, wrapper } = mountWith();
      vm.isRecordingAudio = true;
      await nextTick();
      vm.toggleAudioRecorderPlayPause();
      expect(recorder.stopRecording).toHaveBeenCalled();

      const audio = wrapper.findComponent({ name: 'AudioRecorder' });
      audio.vm.$emit('play');
      expect(vm.recordingAudioState).toBe('playing');
      vm.toggleAudioRecorderPlayPause();
      expect(recorder.playPause).toHaveBeenCalled();
      audio.vm.$emit('pause');
      expect(vm.recordingAudioState).toBe('paused');
    });

    it('closes the copilot editor and runs copilot actions from the command bar', async () => {
      const { vm, wrapper } = mountWith();
      vm.copilot.execute = vi.fn();
      emitter.emit('CMD_AI_ASSIST', 'improve');
      vm.executeCopilotAction('rephrase', { tone: 'friendly' });
      expect(vm.copilot.execute).toHaveBeenCalledWith('rephrase', {
        tone: 'friendly',
      });

      vm.copilot.showEditor.value = true;
      // The top section swaps through an out-in transition.
      const section = () =>
        wrapper.findComponent({ name: 'CopilotEditorSection' });
      await vi.waitFor(() => expect(section().exists()).toBe(true));
      section().vm.$emit('close');
      expect(vm.copilot.showEditor.value).toBe(false);
    });

    it('closes the content template modal when templates stop applying', async () => {
      const { vm } = mountWith({
        inbox: { channel_type: 'Channel::TwilioSms', medium: 'whatsapp' },
      });
      vm.showContentTemplatesModal = true;
      vm.replyType = REPLY_EDITOR_MODES.NOTE;
      await nextTick();
      expect(vm.showContentTemplatesModal).toBe(false);
    });

    it('ignores a private last email for quoting', () => {
      const { vm } = mountWith({ inbox: EMAIL, lastEmail: { private: true } });
      expect(vm.lastEmailWithQuotedContent).toBeNull();
      expect(
        mountWith({ lastEmail: { id: 1 } }).vm.lastEmailWithQuotedContent
      ).toBeNull();
    });

    it('handles pastes on the attachment list', async () => {
      const { vm, wrapper } = mountWith();
      const upload = vi.spyOn(vm, 'onFileUpload').mockImplementation(() => {});
      vm.attachedFiles = [attachment('a.png')];
      await nextTick();
      const preview = wrapper.findComponent({ name: 'AttachmentPreview' });
      const paste = new Event('paste');
      paste.clipboardData = {
        files: [{ name: 'b.png', type: 'image/png', size: 3 }],
      };
      preview.element.parentElement.dispatchEvent(paste);
      // The document listener sees the same paste after it bubbles.
      expect(upload).toHaveBeenCalled();
    });
  });

  describe('computed labels and limits', () => {
    it('describes the placeholder for each editor state', () => {
      expect(
        mountWith({ inbox: WHATSAPP, chat: { can_reply: false } }).vm
          .messagePlaceHolder
      ).toBe('CONVERSATION.FOOTER.MESSAGING_RESTRICTED_WHATSAPP');
      expect(
        mountWith({
          inbox: { channel_type: 'Channel::Api' },
          chat: { can_reply: false },
        }).vm.messagePlaceHolder
      ).toBe('CONVERSATION.FOOTER.MESSAGING_RESTRICTED_API');
      const note = mountWith();
      note.vm.replyType = REPLY_EDITOR_MODES.NOTE;
      expect(note.vm.messagePlaceHolder).toBe(
        'CONVERSATION.FOOTER.PRIVATE_MSG_INPUT'
      );
      expect(note.vm.replyButtonLabel).toContain(
        'CONVERSATION.REPLYBOX.CREATE'
      );
    });

    it.each([
      ['Channel::FacebookPage', {}],
      ['Channel::Telegram', {}],
      ['Channel::Tiktok', {}],
      ['Channel::TwilioSms', { medium: 'whatsapp' }],
      ['Channel::TwilioSms', { medium: 'sms' }],
      ['Channel::Sms', {}],
      ['Channel::Email', {}],
      ['Channel::Line', {}],
    ])('applies the %s message limit', (channelType, extra) => {
      const { vm } = mountWith({
        inbox: { channel_type: channelType, ...extra },
      });
      expect(vm.maxLength).toBeGreaterThan(0);
      vm.message = 'x'.repeat(vm.maxLength + 1);
      expect(vm.isMessageLengthReachingThreshold).toBe(true);
      expect(vm.charactersRemaining).toBe(-1);
      expect(vm.isReplyButtonDisabled).toBe(true);
    });

    it.each([
      ['Channel::Whatsapp', 'audio/ogg', 'whatsapp_cloud'],
      ['Channel::Whatsapp', 'audio/mp3', 'default'],
      ['Channel::Telegram', 'audio/mp3', ''],
      ['Channel::Api', 'audio/mp3', ''],
      ['Channel::WebWidget', 'audio/wav', ''],
    ])('records %s audio as %s', (channelType, format, provider) => {
      const { vm } = mountWith({
        inbox: { channel_type: channelType, provider },
      });
      expect(vm.audioRecordFormat).toContain(format.split('/')[1]);
    });

    it('treats a body that is only the signature as empty', () => {
      const { vm } = mountWith({
        signature: 'Sig',
        uiSettings: { channel_webwidget_signature_enabled: true },
      });
      vm.message = appendSignature('', 'Sig', 'Channel::WebWidget');
      expect(vm.hasMeaningfulEditorContent).toBe(false);
      vm.message = 'Real text';
      expect(vm.hasMeaningfulEditorContent).toBe(true);
    });

    it('reads the conversation type and connected portal', () => {
      const { vm } = mountWith({
        inbox: {
          channel_type: 'Channel::WebWidget',
          help_center: { slug: 'docs' },
        },
        chat: { additional_attributes: { type: 'instagram_direct_message' } },
      });
      expect(vm.conversationType).toBe('instagram_direct_message');
      expect(vm.connectedPortalSlug).toBe('docs');
    });
  });
});
