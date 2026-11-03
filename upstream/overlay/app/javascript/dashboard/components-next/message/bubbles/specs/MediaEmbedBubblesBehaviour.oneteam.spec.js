/**
 * OneTeam behaviour spec for the audio and embed message bubbles.
 *
 * Covers passing the first attachment to the audio chip and framing an
 * embedded attachment.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import AudioBubble from '../Audio.vue';
import EmbedBubble from '../Embed.vue';

const attachment = { id: 1, dataUrl: 'https://media.example/clip' };

vi.mock('../../provider.js', () => ({
  useMessageContext: () => ({ attachments: ref([attachment]) }),
}));
vi.mock('../Base.vue', () => ({
  default: { name: 'BaseBubble', template: '<div><slot /></div>' },
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const AudioChip = {
  name: 'AudioChip',
  props: ['attachment'],
  template: '<span />',
};

describe('audio and embed bubbles behaviour', () => {
  it('plays the first attachment', () => {
    const wrapper = mount(AudioBubble, { global: { stubs: { AudioChip } } });
    expect(wrapper.getComponent(AudioChip).props('attachment')).toEqual(
      attachment
    );
  });

  it('frames an embedded attachment', () => {
    const frame = mount(EmbedBubble).get('iframe');
    expect(frame.attributes('src')).toBe('https://media.example/clip');
    expect(frame.attributes('title')).toBe(
      'CHAT_LIST.ATTACHMENTS.embed.CONTENT'
    );
  });
});
