/**
 * OneTeam behaviour spec for the new conversation action buttons.
 *
 * Covers which buttons show per inbox type (WhatsApp, Twilio WhatsApp,
 * email/web widget, voice, no inbox), the emoji picker, signature
 * toggling and adding or removing the signature when an inbox is
 * picked, the send label and keyboard shortcuts, sending and
 * discarding, template sends, and attaching uploaded or pasted files.
 */
import { defineComponent, h } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import ActionButtons from '../ActionButtons.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({
    fetchSignatureFlagFromUISettings: channel => env.signatureOn(channel),
    setSignatureFlagForInbox: (...args) => env.setSignature(...args),
    isEditorHotKeyEnabled: key => env.hotKey === key,
  }),
}));
vi.mock('dashboard/composables/useFileUpload', () => ({
  useFileUpload: config => {
    env.uploadConfig = config;
    return { onFileUpload: file => env.onFileUpload(file) };
  },
}));
vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: events => {
    env.keys = events;
  },
}));
vi.mock('@vueuse/components', () => ({
  vOnClickOutside: {
    mounted: (el, binding) => {
      env.clickOutside = binding.value;
    },
  },
}));
vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  useEventListener: (target, event, handler) => {
    env.paste = handler;
  },
}));
vi.mock('vue-upload-component', () => ({
  default: {
    name: 'FileUpload',
    props: ['accept'],
    emits: ['inputFile'],
    template: '<div class="upload"><slot /></div>',
  },
}));

const NextButton = {
  name: 'Button',
  props: ['icon', 'label', 'disabled', 'isLoading'],
  emits: ['click'],
  template:
    '<button :data-icon="icon" @click="$emit(\'click\')">{{ label }}</button>',
};
const named = (name, emits = ['sendMessage']) =>
  defineComponent({
    name,
    emits,
    setup:
      (_, { slots }) =>
      () =>
        h('div', { class: name }, slots.default?.()),
  });

let mounted = [];

const mountButtons = async (
  props = {},
  { signatureOn = true, hotKey = 'enter' } = {}
) => {
  env.signatureOn = vi.fn(() => signatureOn);
  env.setSignature = vi.fn();
  env.onFileUpload = vi.fn();
  env.hotKey = hotKey;
  const wrapper = mount(ActionButtons, {
    props: { channelType: 'Channel::Email', ...props },
    global: {
      stubs: {
        Button: NextButton,
        WhatsAppOptions: named('WhatsAppOptions'),
        ContentTemplateSelector: named('ContentTemplateSelector'),
      },
      mocks: { $t: key => key },
    },
  });
  mounted.push(wrapper);
  await flushPromises();
  return wrapper;
};

const icons = wrapper =>
  wrapper
    .findAll('button')
    .map(b => b.attributes('data-icon'))
    .filter(Boolean);

describe('New conversation action buttons behaviour', () => {
  afterEach(() => {
    mounted.forEach(w => w.unmount());
    mounted = [];
  });

  it('shows email tools and adds the signature once an inbox is picked', async () => {
    const wrapper = await mountButtons({
      isEmailOrWebWidgetInbox: true,
      hasSelectedInbox: true,
      messageSignature: '-- Ann',
    });
    expect(icons(wrapper)).toEqual([
      'i-lucide-smile-plus',
      'i-lucide-plus',
      'i-lucide-signature',
    ]);
    expect(wrapper.emitted('addSignature')).toEqual([['-- Ann']]);
    await wrapper.find('[data-icon="i-lucide-signature"]').trigger('click');
    expect(env.setSignature).toHaveBeenCalledWith('Channel::Email', false);
  });

  it('removes the signature when it is switched off and skips empty signatures', async () => {
    const wrapper = await mountButtons(
      { messageSignature: '-- Ann' },
      { signatureOn: false }
    );
    expect(wrapper.emitted('removeSignature')).toBeUndefined();
    await wrapper.setProps({ hasSelectedInbox: true });
    await flushPromises();
    expect(wrapper.emitted('removeSignature')).toEqual([['-- Ann']]);
    const empty = await mountButtons({ hasSelectedInbox: true });
    expect(empty.emitted('addSignature')).toBeUndefined();
    const voice = await mountButtons({
      hasSelectedInbox: true,
      voiceEnabled: true,
      messageSignature: 'x',
    });
    expect(voice.emitted('addSignature')).toBeUndefined();
    expect(icons(voice)).not.toContain('i-lucide-signature');
  });

  it('shows WhatsApp options instead of the editor tools', async () => {
    const wrapper = await mountButtons({
      isWhatsappInbox: true,
      inboxId: 4,
      hasSelectedInbox: true,
    });
    expect(icons(wrapper)).toEqual([]);
    expect(wrapper.findAll('button').map(b => b.text())).toEqual([
      'COMPOSE_NEW_CONVERSATION.FORM.ACTION_BUTTONS.DISCARD',
    ]);
    wrapper
      .findComponent({ name: 'WhatsAppOptions' })
      .vm.$emit('sendMessage', { template: 1 });
    expect(wrapper.emitted('sendWhatsappMessage')).toEqual([[{ template: 1 }]]);
  });

  it('shows Twilio content templates only with an inbox', async () => {
    const wrapper = await mountButtons({
      isTwilioWhatsAppInbox: true,
      inboxId: 4,
    });
    wrapper
      .findComponent({ name: 'ContentTemplateSelector' })
      .vm.$emit('sendMessage', { sid: 'x' });
    expect(wrapper.emitted('sendTwilioMessage')).toEqual([[{ sid: 'x' }]]);
    const noInbox = await mountButtons({ isTwilioWhatsAppInbox: true });
    expect(noInbox.find('.ContentTemplateSelector').exists()).toBe(false);
    const none = await mountButtons({ hasNoInbox: true });
    expect(icons(none)).toEqual([]);
  });

  it('opens the emoji picker and inserts emoji', async () => {
    const wrapper = await mountButtons();
    await wrapper.find('[data-icon="i-lucide-smile-plus"]').trigger('click');
    await vi.dynamicImportSettled();
    await flushPromises();
    wrapper
      .findComponent({ name: 'EmojiIconPicker' })
      .vm.$emit('select', { value: '🙂' });
    expect(wrapper.emitted('insertEmoji')).toEqual([['🙂']]);
    env.clickOutside();
    await flushPromises();
    expect(wrapper.findComponent({ name: 'EmojiIconPicker' }).exists()).toBe(
      false
    );
  });

  it('sends and discards with buttons and shortcuts', async () => {
    const wrapper = await mountButtons({ isLoading: true });
    const send = wrapper.findAllComponents(NextButton).at(-1);
    expect(send.props()).toMatchObject({
      label: 'COMPOSE_NEW_CONVERSATION.FORM.ACTION_BUTTONS.SEND',
      disabled: true,
      isLoading: true,
    });
    await send.trigger('click');
    await wrapper.findAll('button').at(-2).trigger('click');
    expect(wrapper.emitted('discard')).toHaveLength(1);
    expect(wrapper.emitted('sendMessage')).toHaveLength(1);

    env.keys.Enter.action();
    env.keys['$mod+Enter'].action();
    expect(wrapper.emitted('sendMessage')).toHaveLength(2);
    await wrapper.setProps({ isDropdownActive: true });
    env.keys.Enter.action();
    expect(wrapper.emitted('sendMessage')).toHaveLength(2);

    const cmd = await mountButtons({}, { hotKey: 'cmd_enter' });
    env.keys.Enter.action();
    env.keys['$mod+Enter'].action();
    expect(cmd.emitted('sendMessage')).toHaveLength(1);
    await cmd.setProps({ isDropdownActive: true });
    env.keys['$mod+Enter'].action();
    expect(cmd.emitted('sendMessage')).toHaveLength(1);
    const wa = await mountButtons(
      { isWhatsappInbox: true },
      { hotKey: 'cmd_enter' }
    );
    env.keys['$mod+Enter'].action();
    expect(wa.emitted('sendMessage')).toBeUndefined();
  });

  it('attaches uploaded files with a preview', async () => {
    const wrapper = await mountButtons({
      isEmailOrWebWidgetInbox: true,
      attachedFiles: [{ id: 'old' }],
      isTwilioSmsInbox: true,
    });
    expect(env.uploadConfig.isATwilioSMSChannel).toBe(true);
    env.uploadConfig.attachFile({ blob: null, file: null });
    const file = { file: new Blob(['hi'], { type: 'text/plain' }) };
    env.uploadConfig.attachFile({ file });
    await vi.waitFor(() =>
      expect(wrapper.emitted('attachFile')).toHaveLength(1)
    );
    expect(wrapper.emitted('attachFile')[0][0][1]).toMatchObject({
      resource: file,
      isPrivate: false,
      thumb: expect.stringContaining('data:text/plain'),
      blobSignedId: undefined,
    });
    env.uploadConfig.attachFile({ file, blob: { signed_id: 's1' } });
    await vi.waitFor(() =>
      expect(wrapper.emitted('attachFile')).toHaveLength(2)
    );
    expect(wrapper.emitted('attachFile')[1][0][1]).toMatchObject({
      resource: { signed_id: 's1' },
      blobSignedId: 's1',
    });
    wrapper
      .findComponent({ name: 'FileUpload' })
      .vm.$emit('inputFile', { name: 'a' });
    expect(env.onFileUpload).toHaveBeenCalledWith({ name: 'a' });
  });

  it('attaches pasted files only for email and web widget inboxes', async () => {
    const paste = files => {
      const event = new Event('paste');
      event.clipboardData = files === undefined ? undefined : { files };
      env.paste(event);
    };
    const other = await mountButtons();
    paste([new File(['x'], 'a.txt')]);
    expect(env.onFileUpload).not.toHaveBeenCalled();
    other.unmount();
    mounted = [];

    const wrapper = await mountButtons({ isEmailOrWebWidgetInbox: true });
    paste(undefined);
    paste([]);
    paste([
      new File([''], 'empty.txt'),
      new File(['data'], 'b.png', { type: 'image/png' }),
    ]);
    expect(env.onFileUpload).toHaveBeenCalledTimes(1);
    expect(env.onFileUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'b.png',
        type: 'image/png',
        size: 4,
        id: 'attachment-1',
      })
    );
    expect(wrapper.emitted('attachFile')).toBeUndefined();
  });
});
