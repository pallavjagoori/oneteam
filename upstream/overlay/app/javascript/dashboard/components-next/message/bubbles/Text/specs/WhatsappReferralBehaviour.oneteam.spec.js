/**
 * OneTeam behaviour spec for the WhatsApp click-to-chat ad referral card.
 *
 * Covers linking to safe http(s) ad URLs only, picking the thumbnail,
 * image, media or video URL, rendering videos (with a play overlay) or
 * images, hiding broken media, and the headline and body text with and
 * without a link.
 */
import { mount } from '@vue/test-utils';
import WhatsappReferral from '../WhatsappReferral.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

/**
 * Mounts the card for a referral.
 *
 * @param {object} referral Referral data.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountCard = referral =>
  mount(WhatsappReferral, {
    props: { referral },
    global: { stubs: { Icon: true } },
  });

describe('WhatsappReferral behaviour', () => {
  it('links to the ad with its thumbnail, headline and body', () => {
    const wrapper = mountCard({
      sourceUrl: 'https://ads.test/x',
      thumbnailUrl: 'https://cdn.test/t.jpg',
      mediaType: 'video',
      headline: 'Sale',
      body: 'Half off',
    });
    expect(wrapper.get('a').attributes('href')).toBe('https://ads.test/x');
    const img = wrapper.get('img');
    expect(img.attributes('src')).toBe('https://cdn.test/t.jpg');
    expect(img.attributes('alt')).toBe('Sale');
    expect(wrapper.find('.bg-n-alpha-black2').exists()).toBe(true);
    expect(wrapper.text()).toContain('Half off');
  });

  it('plays videos without a thumbnail and hides broken media', async () => {
    const wrapper = mountCard({
      sourceUrl: 'http://ads.test/v',
      videoUrl: 'https://cdn.test/v.mp4',
      mediaContentType: 'video/mp4',
    });
    const video = wrapper.get('video');
    expect(video.attributes('src')).toBe('https://cdn.test/v.mp4');
    await video.trigger('error');
    expect(wrapper.find('video').exists()).toBe(false);
  });

  it('falls back through image and media URLs', async () => {
    const image = mountCard({
      sourceUrl: 'https://ads.test',
      imageUrl: 'https://cdn.test/i.png',
    });
    expect(image.get('img').attributes('alt')).toBe(
      'CONVERSATION.WHATSAPP_REFERRAL.AD'
    );
    expect(image.find('.bg-n-alpha-black2').exists()).toBe(false);
    await image.get('img').trigger('error');
    expect(image.find('img').exists()).toBe(false);

    const media = mountCard({
      sourceUrl: 'https://ads.test',
      mediaUrl: 'https://cdn.test/m.png',
    });
    expect(media.get('img').attributes('src')).toBe('https://cdn.test/m.png');
  });

  it('drops unsafe or invalid URLs', () => {
    const wrapper = mountCard({
      sourceUrl: 'ftp://ads.test',
      imageUrl: 'not a url',
      headline: 'Sale',
      body: 'Body',
    });
    expect(wrapper.find('a').exists()).toBe(false);
    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.text()).toContain('Sale');
    expect(wrapper.text()).toContain('Body');

    const badMedia = mountCard({
      sourceUrl: 'https://ads.test',
      imageUrl: 'not a url',
    });
    expect(badMedia.find('a').exists()).toBe(true);
    expect(badMedia.find('img').exists()).toBe(false);
  });

  it('shows just the label without details', () => {
    expect(mountCard({}).text()).toBe('CONVERSATION.WHATSAPP_REFERRAL.AD');
    const linked = mountCard({ sourceUrl: 'https://ads.test' });
    expect(linked.findAll('p')).toHaveLength(0);
  });
});
