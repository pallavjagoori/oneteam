/**
 * OneTeam behaviour spec for the shared message bubble frame.
 *
 * Covers the colours for each message variant and side, activity
 * bubbles, the quoted reply preview (text, attachment type, or a "not
 * found" note) and jumping to the quoted message, and the footer: the
 * plain message meta on the bubble's side, Captain generation details
 * with a translation toggle, and hiding the meta when asked, when
 * grouped with the next message, or for activity messages.
 */
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { emitter } from 'shared/helpers/mitt';
import { BUS_EVENTS } from 'shared/constants/busEvents';
import { MESSAGE_VARIANTS, ORIENTATION } from '../../constants';
import Base from '../Base.vue';

const context = {};
vi.mock('../../provider.js', () => ({ useMessageContext: () => context }));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

const MessageMeta = {
  name: 'MessageMeta',
  template: '<div class="meta" />',
};
const TranslationToggle = {
  name: 'TranslationToggle',
  props: { showingOriginal: Boolean, icon: Boolean },
  emits: ['toggle'],
  template: '<button class="toggle" @click="$emit(\'toggle\')" />',
};

const mountBase = (overrides = {}, props = {}) => {
  Object.assign(context, {
    variant: ref(MESSAGE_VARIANTS.AGENT),
    orientation: ref(ORIENTATION.RIGHT),
    inReplyTo: ref(null),
    shouldGroupWithNext: ref(false),
    id: ref(7),
    isCaptainMessage: ref(false),
    showingOriginal: ref(false),
  });
  Object.entries(overrides).forEach(([key, value]) => {
    context[key] = value === undefined ? undefined : ref(value);
  });
  return mount(Base, {
    props,
    slots: { default: '<p class="content">Hi</p>' },
    global: {
      stubs: {
        MessageMeta,
        TranslationToggle,
        CaptainGenerationDetails: {
          props: ['messageId'],
          template:
            '<div class="captain" :data-id="messageId"><slot /><slot name="meta" /></div>',
        },
      },
      directives: {
        dompurifyHtml: {
          mounted(el, { value }) {
            el.innerHTML = value;
          },
        },
      },
    },
  });
};

const frame = wrapper => wrapper.find('div').classes();

describe('Message bubble Base behaviour', () => {
  it('colours each variant and side', () => {
    expect(frame(mountBase())).toEqual(
      expect.arrayContaining(['bg-n-solid-blue', 'right-bubble', 'max-w-lg'])
    );
    expect(
      frame(
        mountBase({
          variant: MESSAGE_VARIANTS.USER,
          orientation: ORIENTATION.LEFT,
        })
      )
    ).toEqual(expect.arrayContaining(['bg-n-slate-4', 'left-bubble']));
    expect(
      frame(
        mountBase({
          variant: MESSAGE_VARIANTS.ERROR,
          orientation: ORIENTATION.CENTER,
        })
      )
    ).toEqual(expect.arrayContaining(['bg-n-ruby-4', 'rounded-md']));
    const email = frame(mountBase({ variant: MESSAGE_VARIANTS.EMAIL }));
    expect(email).toContain('w-full');
    expect(email).not.toContain('max-w-lg');

    const activity = mountBase({ variant: MESSAGE_VARIANTS.ACTIVITY });
    expect(frame(activity)).toEqual(
      expect.arrayContaining(['bg-n-alpha-1', 'rounded-lg'])
    );
    expect(frame(activity)).not.toContain('right-bubble');
    expect(activity.find('.meta').exists()).toBe(false);
    expect(activity.find('.content').exists()).toBe(true);
  });

  it('places the meta on the bubble side with variant colours', () => {
    const agent = mountBase().find('.meta').classes();
    expect(agent).toEqual(
      expect.arrayContaining(['justify-end', 'text-n-slate-11'])
    );
    expect(agent).not.toContain('px-3');

    const left = mountBase({ orientation: ORIENTATION.LEFT }).find('.meta');
    expect(left.classes()).toContain('justify-start');
    const center = mountBase({ orientation: ORIENTATION.CENTER }).find('.meta');
    expect(center.classes()).toContain('justify-center');

    const note = mountBase({ variant: MESSAGE_VARIANTS.PRIVATE }).find('.meta');
    expect(note.classes()).toContain('text-n-amber-12/50');
    const email = mountBase({ variant: MESSAGE_VARIANTS.EMAIL }).find('.meta');
    expect(email.classes()).toEqual(expect.arrayContaining(['px-3', 'pb-3']));
  });

  it('hides the meta when asked or grouped', () => {
    expect(mountBase({}, { hideMeta: true }).find('.meta').exists()).toBe(
      false
    );
    expect(
      mountBase({ shouldGroupWithNext: true }).find('.meta').exists()
    ).toBe(false);
  });

  it('shows Captain details with a translation toggle', async () => {
    const wrapper = mountBase({ isCaptainMessage: true });
    expect(wrapper.find('.captain').attributes('data-id')).toBe('7');
    expect(wrapper.findAll('.meta')).toHaveLength(1);
    const toggle = wrapper.findComponent(TranslationToggle);
    expect(toggle.props('showingOriginal')).toBe(false);
    await wrapper.find('.toggle').trigger('click');
    expect(context.showingOriginal.value).toBe(true);
  });

  it('previews the quoted message and jumps to it', async () => {
    const onScroll = vi.fn();
    emitter.on(BUS_EVENTS.SCROLL_TO_MESSAGE, onScroll);
    const wrapper = mountBase({ inReplyTo: { id: 3, content: '**Earlier**' } });
    const quote = wrapper.find('.cursor-pointer');
    expect(quote.find('.prose').html()).toContain('<strong>Earlier</strong>');
    await quote.trigger('click');
    expect(onScroll).toHaveBeenCalledWith({ messageId: 3 });
    emitter.off(BUS_EVENTS.SCROLL_TO_MESSAGE, onScroll);

    const preview = inReplyTo => mountBase({ inReplyTo }).find('.prose').text();
    expect(preview({ id: 4, attachments: [{ fileType: 'image' }] })).toBe(
      'CHAT_LIST.ATTACHMENTS.image.CONTENT'
    );
    expect(preview({ id: 4, attachments: [{ file_type: 'audio' }] })).toBe(
      'CHAT_LIST.ATTACHMENTS.audio.CONTENT'
    );
    expect(preview({ id: 5, attachments: [] })).toBe(
      'CONVERSATION.REPLY_MESSAGE_NOT_FOUND'
    );
    expect(preview({ id: 6 })).toBe('CONVERSATION.REPLY_MESSAGE_NOT_FOUND');
    expect(mountBase().find('.cursor-pointer').exists()).toBe(false);

    // A context without reply data gives an empty preview.
    const noReply = mountBase({ inReplyTo: undefined });
    expect(noReply.find('.cursor-pointer').exists()).toBe(false);
    expect(noReply.vm.replyToPreview).toBe('');
  });
});
