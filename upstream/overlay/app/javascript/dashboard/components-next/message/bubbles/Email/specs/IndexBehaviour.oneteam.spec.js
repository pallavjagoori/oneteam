/**
 * OneTeam behaviour spec for the email message bubble.
 *
 * Covers expanding tall emails, plain outgoing replies, toggling the
 * quoted history, translations and the see-original toggle, captain
 * messages, attachments, and emails without email attributes.
 */
import { defineComponent, ref } from 'vue';
import { mount } from '@vue/test-utils';
import EmailBubble from '../Index.vue';
import { provideMessageContext } from '../../../provider.js';
import { MESSAGE_TYPES } from '../../../constants';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables/useTranslations', () => ({
  useTranslations: () => env.translations,
}));
vi.mock('vue-letter', () => ({
  Letter: {
    name: 'Letter',
    props: ['html', 'text', 'className', 'allowedCssProperties'],
    template: '<div class="letter-render">{{ html }}</div>',
  },
}));

const quoted = '<p>Latest</p><div class="gmail_quote">Older</div>';

/**
 * Mounts the bubble inside a message context.
 *
 * @param {object} context message context overrides
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountBubble = (context = {}) => {
  const Host = defineComponent({
    components: { EmailBubble },
    setup() {
      provideMessageContext({
        content: ref('Latest'),
        contentAttributes: ref({ email: { htmlContent: { full: quoted } } }),
        attachments: ref([]),
        messageType: ref(MESSAGE_TYPES.INCOMING),
        showingOriginal: ref(false),
        isCaptainMessage: ref(false),
        ...context,
      });
    },
    template: '<EmailBubble />',
  });
  return mount(Host, {
    global: {
      mocks: {
        $t: key => key,
        $store: { getters: { getSelectedChatAttachments: [] } },
      },
      stubs: {
        BaseBubble: { template: '<div class="bubble"><slot /></div>' },
        EmailMeta: true,
        AttachmentChips: {
          name: 'AttachmentChips',
          template: '<div class="chips" />',
        },
        TranslationToggle: {
          name: 'TranslationToggle',
          emits: ['toggle'],
          template: '<button class="toggle" @click="$emit(\'toggle\')" />',
        },
        FormattedContent: {
          name: 'FormattedContent',
          props: ['content'],
          template: '<div class="formatted">{{ content }}</div>',
        },
        Icon: true,
      },
    },
  });
};

describe('Email bubble behaviour', () => {
  beforeEach(() => {
    env.translations = {
      hasTranslations: ref(false),
      translationContent: ref(''),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('expands tall emails and toggles the quoted history', async () => {
    vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockReturnValue(500);
    const wrapper = mountBubble();
    await wrapper.vm.$nextTick();
    const expand = wrapper
      .findAll('button')
      .find(b => b.text() === 'EMAIL_HEADER.EXPAND');
    await expand.trigger('click');
    expect(wrapper.find('.overflow-y-scroll').exists()).toBe(true);

    const quote = wrapper
      .findAll('button')
      .find(b => b.text().includes('QUOTED'));
    expect(wrapper.find('.letter-render').text()).not.toContain('Older');
    await quote.trigger('click');
    expect(wrapper.find('.letter-render').text()).toContain('Older');
    expect(quote.text()).toBe('CHAT_LIST.HIDE_QUOTED_TEXT');
  });

  it('renders plain outgoing replies with attachments', () => {
    const wrapper = mountBubble({
      messageType: ref(MESSAGE_TYPES.OUTGOING),
      contentAttributes: ref(null),
      attachments: ref([{ id: 1 }]),
    });
    expect(wrapper.find('.formatted').text()).toBe('Latest');
    expect(wrapper.find('.chips').exists()).toBe(true);
  });

  it('shows translations and switches to the original', async () => {
    env.translations = {
      hasTranslations: ref(true),
      translationContent: ref('Hola'),
    };
    const showingOriginal = ref(false);
    const wrapper = mountBubble({
      showingOriginal,
      messageType: ref(MESSAGE_TYPES.OUTGOING),
      contentAttributes: ref({}),
    });
    expect(wrapper.find('.formatted').text()).toBe('Hola');
    await wrapper.find('.toggle').trigger('click');
    expect(showingOriginal.value).toBe(true);
    expect(wrapper.find('.formatted').text()).toBe('Latest');
  });

  it('keys letters by translation state and hides the toggle for captain', async () => {
    env.translations = {
      hasTranslations: ref(true),
      translationContent: ref('<p>Hola</p>'),
    };
    const showingOriginal = ref(false);
    const wrapper = mountBubble({ showingOriginal });
    expect(wrapper.find('.letter-render').text()).toContain('Hola');
    showingOriginal.value = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.letter-render').text()).toContain('Latest');

    env.translations = {
      hasTranslations: ref(false),

      translationContent: ref(''),
    };

    const captain = mountBubble({
      isCaptainMessage: ref(true),
      contentAttributes: ref({ email: { textContent: { full: 'Text only' } } }),
    });
    expect(captain.find('.toggle').exists()).toBe(false);
    expect(captain.find('.letter-render').text()).toBe('Text only');
  });
});
