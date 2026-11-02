/**
 * OneTeam behaviour spec for the text message bubble.
 *
 * Covers the empty-message notice, showing the translation or the
 * original (and toggling between them, which is hidden on Captain
 * messages), the shimmer while a translation is pending, animating the
 * bubble height when the text swaps (skipped for reduced motion), the
 * WhatsApp contact-info request states (ignored on failed messages), and
 * the submitted email on template messages.
 */
import { nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import TextBubble from '../Index.vue';

const env = vi.hoisted(() => ({}));

vi.mock('../../../provider.js', () => ({
  useMessageContext: () => env.context,
}));
vi.mock('dashboard/composables/useTranslations', () => ({
  useTranslations: () => ({
    hasTranslations: env.hasTranslations,
    translationContent: env.translationContent,
  }),
}));
vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return {
    useMapGetter: () => computed(() => id => ({ pending: env.pending[id] })),
  };
});
vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  usePreferredReducedMotion: () => env.motion,
}));

const TranslationToggle = {
  name: 'TranslationToggle',
  props: ['showingOriginal'],
  emits: ['toggle'],
  template: '<button class="toggle" @click="$emit(\'toggle\')" />',
};

const mountBubble = (overrides = {}) => {
  env.context = {
    id: ref(5),
    content: ref('Hola'),
    attachments: ref([]),
    contentAttributes: ref({}),
    messageType: ref(1),
    contactSide: ref(true),
    status: ref('sent'),
    showingOriginal: ref(false),
    isCaptainMessage: ref(false),
    ...Object.fromEntries(
      Object.entries(overrides).map(([key, value]) => [key, ref(value)])
    ),
  };
  return mount(TextBubble, {
    global: {
      stubs: {
        transition: false,
        BaseBubble: { template: '<div class="bubble"><slot /></div>' },
        FormattedContent: {
          props: ['content'],
          template: '<p class="text">{{ content }}</p>',
        },
        AttachmentChips: true,
        TranslationToggle,
      },
    },
  });
};

const wait = () =>
  new Promise(resolve => {
    setTimeout(resolve, 60);
  });

describe('Text bubble behaviour', () => {
  beforeEach(() => {
    env.hasTranslations = ref(true);
    env.translationContent = ref('Hello');
    env.pending = {};
    env.motion = ref('no-preference');
    HTMLElement.prototype.animate = vi.fn();
  });

  afterEach(() => {
    delete HTMLElement.prototype.animate;
  });

  it('swaps between the translation and the original', async () => {
    const wrapper = mountBubble();
    expect(wrapper.find('.text').text()).toBe('Hello');
    await wrapper.find('.toggle').trigger('click');
    expect(env.context.showingOriginal.value).toBe(true);
    await nextTick();
    await wait();
    expect(wrapper.find('.text').text()).toBe('Hola');
    expect(HTMLElement.prototype.animate).toHaveBeenCalledWith(
      { height: ['0px', '0px'] },
      { duration: 300, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }
    );

    env.motion.value = 'reduce';
    HTMLElement.prototype.animate.mockClear();
    await wrapper.find('.toggle').trigger('click');
    await nextTick();
    await wait();
    expect(wrapper.find('.text').text()).toBe('Hello');
    expect(HTMLElement.prototype.animate).not.toHaveBeenCalled();
  });

  it('shows the original when there is no translation and shimmers while translating', () => {
    env.hasTranslations.value = false;
    env.pending = { 5: true };
    const wrapper = mountBubble({ isCaptainMessage: true });
    expect(wrapper.find('.text').text()).toBe('Hola');
    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true);
    expect(wrapper.find('.animate-text-shimmer').exists()).toBe(true);
    expect(wrapper.find('.toggle').exists()).toBe(false);
  });

  it('notes an empty message', () => {
    env.hasTranslations.value = false;
    const wrapper = mountBubble({ content: '', attachments: null });
    expect(wrapper.text()).toContain('CONVERSATION.NO_CONTENT');
    expect(wrapper.find('.text').exists()).toBe(false);
    const withFile = mountBubble({ content: '', attachments: [{ id: 1 }] });
    expect(withFile.text()).not.toContain('CONVERSATION.NO_CONTENT');
  });

  it.each([
    ['pending', 'PENDING'],
    ['shared', 'SHARED'],
    ['identity_conflict', 'IDENTITY_CONFLICT'],
  ])('shows the %s contact-info request state', (state, key) => {
    const wrapper = mountBubble({
      contentAttributes: { whatsappContactInfo: { state } },
    });
    expect(wrapper.text()).toContain(
      `CONVERSATION.REQUEST_CONTACT_INFO.STATES.${key}`
    );
  });

  it('ignores contact-info states on failed messages', () => {
    const wrapper = mountBubble({
      status: 'failed',
      contentAttributes: { whatsappContactInfo: { state: 'pending' } },
    });
    expect(wrapper.text()).not.toContain('REQUEST_CONTACT_INFO');
    expect(mountBubble({ contentAttributes: null }).text()).not.toContain(
      'REQUEST_CONTACT_INFO'
    );
  });

  it('shows the email submitted on a template message', () => {
    const wrapper = mountBubble({
      messageType: 3,
      contentAttributes: { submittedEmail: 'ann@acme.io' },
    });
    expect(wrapper.text()).toContain('ann@acme.io');
    expect(mountBubble({ messageType: 3 }).find('.bg-n-alpha-3').exists()).toBe(
      false
    );
  });
});
