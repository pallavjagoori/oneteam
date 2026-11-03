/**
 * OneTeam behaviour spec for the search MessageContent snippet.
 *
 * Covers the content source order (voice transcript, content, email
 * subject, audio transcription), highlighting with escaping, the author
 * prefix and the read more / read less toggles.
 */
import { mount } from '@vue/test-utils';
import MessageContent from '../MessageContent.vue';

const expand = vi.hoisted(() => ({ state: null }));

vi.mock('shared/composables/useExpandableContent', async () => {
  const { ref: vueRef } = await import('vue');
  return {
    useExpandableContent: () => {
      expand.state = {
        contentElement: vueRef(null),
        showReadMore: vueRef(false),
        showReadLess: vueRef(false),
        toggleExpanded: vi.fn(),
      };
      return expand.state;
    },
  };
});

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

/**
 * Mounts MessageContent and returns the highlighted HTML.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountContent = props =>
  mount(MessageContent, {
    props,
    global: { directives: { dompurifyHtml: {} } },
  });

const html = wrapper => wrapper.vm.$.setupState.highlightedContent;

describe('MessageContent behaviour', () => {
  it.each([
    [
      {
        contentType: 'voice_call',
        call: { transcript: 'call text' },
        content: 'x',
      },
      'call text',
    ],
    [{ contentType: 'voice_call', call: {}, content: 'plain' }, 'plain'],
    [{ contentAttributes: { email: { subject: 'Subject' } } }, 'Subject'],
    [{ contentAttributes: {} }, ''],
    [
      {
        attachments: [
          { fileType: 'image' },
          { fileType: 'audio', transcribedText: 'voice' },
        ],
      },
      'voice',
    ],
    [{ attachments: [{ fileType: 'audio' }] }, ''],
    [{}, ''],
  ])('picks the content for %o', (message, expected) => {
    expect(mountContent({ message }).vm.$.setupState.messageContent).toBe(
      expected
    );
  });

  it('escapes HTML and highlights the search term', () => {
    const wrapper = mountContent({
      message: { content: 'Price <b> is 5.00' },
      searchTerm: '5.00',
    });
    expect(html(wrapper)).toContain('&lt;b&gt;');
    expect(html(wrapper)).toContain(
      '<span class="searchkey--highlight">5.00</span>'
    );
  });

  it('returns escaped text without a search term', () => {
    const wrapper = mountContent({ message: { content: 'Hello' } });
    expect(html(wrapper).trim()).toBe('Hello');
    expect(wrapper.text()).not.toContain('SEARCH.WROTE');
  });

  it('shows the author prefix', () => {
    const wrapper = mountContent({
      author: 'Jane',
      message: { content: 'Hi' },
    });
    expect(wrapper.text()).toContain('Jane SEARCH.WROTE');
  });

  it('toggles read more and read less', async () => {
    const wrapper = mountContent({ message: { content: 'Long' } });
    expand.state.showReadMore.value = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.classes()).toContain('grid-cols-[1fr_auto]');
    await wrapper.find('button').trigger('click');
    expect(expand.state.toggleExpanded).toHaveBeenCalledWith(true);
    expand.state.showReadMore.value = false;
    expand.state.showReadLess.value = true;
    await wrapper.vm.$nextTick();
    await wrapper.find('button').trigger('click');
    expect(expand.state.toggleExpanded).toHaveBeenCalledWith(false);
  });
});
