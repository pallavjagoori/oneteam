/**
 * OneTeam behaviour spec for the reply box's bottom toolbar.
 *
 * Covers the attach shortcut (skipped while the editor is disabled), the
 * attach, audio recorder, play/stop, signature, WhatsApp template,
 * contact info, content template, video call and article buttons and
 * when each one shows, the allowed file types for notes, Instagram and
 * other channels, the hidden drop overlay, the signature toggle and tooltips,
 * and the send button.
 */
import { mount } from '@vue/test-utils';
import ReplyBottomPanel from '../ReplyBottomPanel.vue';

const env = vi.hoisted(() => ({ keys: null, signature: false, setSignature: null }));

vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({
    setSignatureFlagForInbox: (...args) => env.setSignature(...args),
    fetchSignatureFlagFromUISettings: () => env.signature,
  }),
}));
vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: events => {
    env.keys = events;
  },
}));
vi.mock('activestorage', () => ({ start: vi.fn() }));
vi.mock('@chatwoot/utils', () => ({
  getAllowedFileTypesByChannel: args => (args ? `${args.channelType}|${args.medium}` : 'all'),
}));

const NextButton = {
  name: 'NextButton',
  props: ['icon', 'label', 'disabled', 'color'],
  emits: ['click'],
  template:
    '<button :data-icon="icon" :data-color="color" :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
};
const FileUpload = {
  name: 'FileUpload',
  props: ['accept', 'drop'],
  data: () => ({ dropActive: false }),
  template: '<div class="upload" :data-accept="accept" :data-drop="drop"><slot /></div>',
};
const RequestContactInfoButton = {
  name: 'RequestContactInfoButton',
  emits: ['requestTemplate'],
  template: '<div class="contact-info" />',
};
const VideoCallButton = { name: 'VideoCallButton', template: '<div class="video" />' };

const mountPanel = (props = {}, voice = true) => {
  const wrapper = mount(ReplyBottomPanel, {
    props: { conversationId: 1, portalSlug: '', ...props },
    global: {
      stubs: {
        NextButton,
        FileUpload,
        RequestContactInfoButton,
        VideoCallButton,
        FluentIcon: true,
        transition: false,
      },
      mocks: {
        $t: key => key,
        $store: {
          getters: {
            getCurrentAccountId: 1,
            'accounts/isFeatureEnabledonAccount': () => voice,
            'integrations/getUIFlags': { isFetching: false },
          },
        },
      },
      directives: {
        tooltip: {
          mounted: (el, b) => {
            el.dataset.tip = b.value;
          },
        },
      },
    },
  });
  return wrapper;
};
const icon = (wrapper, name) => wrapper.find(`[data-icon="${name}"]`);

describe('Reply bottom panel behaviour', () => {
  beforeEach(() => {
    env.signature = false;
    env.setSignature = vi.fn();
    document.body.innerHTML = '';
  });

  it('clicks the attachment input from the shortcut unless the editor is disabled', () => {
    mountPanel();
    const action = env.keys['$mod+Alt+KeyA'].action;
    action();
    const input = document.createElement('input');
    input.id = 'conversationAttachment';
    input.click = vi.fn();
    document.body.appendChild(input);
    action();
    expect(input.click).toHaveBeenCalledTimes(1);
    mountPanel({ isEditorDisabled: true });
    env.keys['$mod+Alt+KeyA'].action();
    expect(input.click).toHaveBeenCalledTimes(1);
  });

  it('shows the full toolbar for a web widget inbox and wires its events', async () => {
    const handlers = {
      toggleEmojiPicker: vi.fn(),
      toggleAudioRecorder: vi.fn(),
      toggleAudioRecorderPlayPause: vi.fn(),
      onSend: vi.fn(),
    };
    const wrapper = mountPanel({
      ...handlers,
      inbox: { channel_type: 'Channel::WebWidget' },
      showFileUpload: true,
      showAudioRecorder: true,
      isRecordingAudio: true,
      recordingAudioState: 'playing',
      recordingAudioDurationText: '00:05',
      enableWhatsAppTemplates: true,
      enableContentTemplates: true,
      portalSlug: 'docs',
      sendButtonText: 'Send',
    });
    expect(wrapper.find('.upload').attributes('data-accept')).toBe('Channel::WebWidget|undefined');
    expect(wrapper.find('.upload').attributes('data-drop')).toBe('true');
    expect(icon(wrapper, 'i-ph-paperclip').exists()).toBe(true);
    expect(icon(wrapper, 'i-ph-microphone-slash').exists()).toBe(true);
    expect(icon(wrapper, 'i-ph-pause').text()).toBe('00:05');
    expect(wrapper.find('.video').exists()).toBe(true);
    expect(icon(wrapper, 'i-ph-signature').attributes('data-tip')).toBe(
      'CONVERSATION.FOOTER.ENABLE_SIGN_TOOLTIP'
    );

    await icon(wrapper, 'i-ph-smiley-sticker').trigger('click');
    await icon(wrapper, 'i-ph-microphone-slash').trigger('click');
    await icon(wrapper, 'i-ph-pause').trigger('click');
    await icon(wrapper, 'i-ph-signature').trigger('click');
    const [whatsapp, content] = wrapper.findAll('[data-icon="i-ph-whatsapp-logo"]');
    await whatsapp.trigger('click');
    await content.trigger('click');
    wrapper.findComponent(RequestContactInfoButton).vm.$emit('requestTemplate');
    await icon(wrapper, 'i-ph-article-ny-times').trigger('click');
    await wrapper.find('[data-color="blue"]').trigger('click');

    Object.values(handlers).forEach(fn => expect(fn).toHaveBeenCalledTimes(1));
    expect(env.setSignature).toHaveBeenCalledWith('Channel::WebWidget', true);
    expect(wrapper.emitted('selectWhatsappTemplate')).toHaveLength(1);
    expect(wrapper.emitted('selectContentTemplate')).toHaveLength(1);
    expect(wrapper.emitted('requestContactInfoTemplate')).toHaveLength(1);
    expect(wrapper.emitted('toggleInsertArticle')).toHaveLength(1);

    expect(wrapper.find('.fixed').isVisible()).toBe(false);
  });

  it('maps the recording state to its play or stop icon', async () => {
    const wrapper = mountPanel({ showAudioRecorder: true, isRecordingAudio: true });
    expect(icon(wrapper, 'i-ph-stop').exists()).toBe(true);
    await wrapper.setProps({ recordingAudioState: 'paused' });
    expect(icon(wrapper, 'i-ph-play').exists()).toBe(true);
    await wrapper.setProps({ recordingAudioState: 'stopped' });
    expect(icon(wrapper, 'i-ph-play').exists()).toBe(true);
  });

  it('switches the signature off and picks file types per channel', async () => {
    env.signature = true;
    const wrapper = mountPanel({
      inbox: { channel_type: 'Channel::Email', medium: 'smtp' },
      isNote: true,
      newConversationModalActive: true,
    });
    expect(wrapper.classes()).toContain('is-note-mode');
    expect(wrapper.find('.upload').attributes('data-accept')).toBe('Channel::Email|smtp');
    expect(wrapper.find('.upload').attributes('data-drop')).toBe('false');
    expect(wrapper.find('[data-color="amber"]').exists()).toBe(true);
    expect(icon(wrapper, 'i-ph-signature').attributes('data-tip')).toBe(
      'CONVERSATION.FOOTER.DISABLE_SIGN_TOOLTIP'
    );
    await icon(wrapper, 'i-ph-signature').trigger('click');
    expect(env.setSignature).toHaveBeenCalledWith('Channel::Email', false);
    expect(wrapper.vm.isFetchingAppIntegrations).toBe(false);

    await wrapper.setProps({ conversationType: 'instagram_direct_message' });
    expect(wrapper.find('.upload').attributes('data-accept')).toBe('Channel::Instagram|smtp');
    await wrapper.setProps({ isOnPrivateNote: true });
    expect(wrapper.find('.upload').attributes('data-accept')).toBe('all');
    expect(icon(wrapper, 'i-ph-signature').exists()).toBe(false);
    expect(wrapper.find('.contact-info').exists()).toBe(false);
  });

  it('hides the recorder for Line, TikTok and accounts without the feature', () => {
    const line = mountPanel({ inbox: { channel_type: 'Channel::Line' }, showAudioRecorder: true });
    expect(icon(line, 'i-ph-microphone').exists()).toBe(false);
    const tiktok = mountPanel({ inbox: { channel_type: 'Channel::Tiktok' }, showAudioRecorder: true });
    expect(icon(tiktok, 'i-ph-microphone').exists()).toBe(false);
    const api = mountPanel({ inbox: { channel_type: 'Channel::Api' }, showAudioRecorder: true }, false);
    expect(icon(api, 'i-ph-microphone').exists()).toBe(false);
    expect(api.find('.video').exists()).toBe(true);
  });

  it('hides editing tools while the editor is disabled', () => {
    const wrapper = mountPanel({
      isEditorDisabled: true,
      showFileUpload: true,
      showAudioRecorder: true,
      isRecordingAudio: true,
      inbox: { channel_type: 'Channel::WebWidget' },
    });
    ['i-ph-smiley-sticker', 'i-ph-microphone-slash', 'i-ph-stop', 'i-ph-signature'].forEach(
      name => expect(icon(wrapper, name).exists()).toBe(false)
    );
    expect(wrapper.find('.upload').exists()).toBe(false);
    expect(wrapper.find('.video').exists()).toBe(false);
  });
});
