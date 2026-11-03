/**
 * Covers FormattedContent: activity messages render raw, others go through
 * the message formatter.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import FormattedContent from '../FormattedContent.vue';

const variant = ref('activity');
vi.mock('../../../provider.js', () => ({
  useMessageContext: () => ({ variant }),
}));

/**
 * Mounts the content and returns the HTML passed to v-dompurify-html.
 *
 * @param {string} content - Message content.
 * @returns {string} The bound HTML.
 */
const renderedHtml = content => {
  let html = '';
  mount(FormattedContent, {
    props: { content },
    global: {
      directives: {
        dompurifyHtml: {
          mounted: (el, binding) => {
            html = binding.value;
          },
        },
      },
    },
  });
  return html;
};

describe('FormattedContent', () => {
  it('keeps activity content as is', () => {
    variant.value = 'activity';
    expect(renderedHtml('**bold**')).toBe('**bold**');
  });

  it('formats other variants as markdown', () => {
    variant.value = 'user';
    expect(renderedHtml('**bold**')).toContain('<strong>bold</strong>');
  });
});
