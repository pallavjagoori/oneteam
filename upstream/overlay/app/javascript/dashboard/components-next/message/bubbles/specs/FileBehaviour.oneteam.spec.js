/**
 * OneTeam behaviour spec for the file message bubble.
 *
 * Covers the decoded file name and type from the URL, the download
 * action, and the unknown-file label for a missing URL or a URL that
 * ends in a slash.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import FileBubble from '../File.vue';

const env = vi.hoisted(() => ({ attachments: null }));

vi.mock('../../provider.js', () => ({
  useMessageContext: () => ({ attachments: env.attachments }),
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const BaseAttachmentBubble = {
  name: 'BaseAttachmentBubble',
  props: ['content', 'action'],
  template: '<div><slot name="icon" /></div>',
};
const FileIcon = { name: 'FileIcon', props: ['fileType'], template: '<i />' };

/**
 * Mounts the bubble for a file URL.
 *
 * @param {string|undefined} dataUrl Attachment URL.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountBubble = dataUrl => {
  env.attachments = ref([{ dataUrl }]);
  return mount(FileBubble, {
    global: {
      stubs: { BaseAttachmentBubble, FileIcon },
      mocks: { $t: key => key },
    },
  });
};

describe('File bubble behaviour', () => {
  it('names the file from its URL with a download action', () => {
    const wrapper = mountBubble('https://x.test/files/My%20Report.pdf');
    const bubble = wrapper.getComponent(BaseAttachmentBubble);
    expect(bubble.props('content')).toBe('My Report.pdf');
    expect(bubble.props('action')).toEqual({
      href: 'https://x.test/files/My%20Report.pdf',
      label: 'CONVERSATION.DOWNLOAD',
    });
    expect(wrapper.getComponent(FileIcon).props('fileType')).toBe('pdf');
  });

  it.each([undefined, 'https://x.test/files/'])(
    'labels an unknown file for %s',
    url => {
      expect(
        mountBubble(url).getComponent(BaseAttachmentBubble).props('content')
      ).toBe('CONVERSATION.UNKNOWN_FILE_TYPE');
    }
  );
});
