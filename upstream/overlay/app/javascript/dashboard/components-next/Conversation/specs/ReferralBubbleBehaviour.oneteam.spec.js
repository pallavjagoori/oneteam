/**
 * OneTeam behaviour spec for the Click-to-WhatsApp ReferralBubble.
 *
 * Covers ad and post labels, video and image thumbnails, hiding media
 * after a load error and resetting it for a new referral, and the
 * optional headline, body, source link and welcome message.
 */
import { mount } from '@vue/test-utils';
import ReferralBubble from '../ReferralBubble.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

/**
 * Mounts the bubble.
 *
 * @param {object} referral referral data
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountBubble = referral => mount(ReferralBubble, { props: { referral } });

describe('ReferralBubble behaviour', () => {
  it('renders a bare ad referral', () => {
    const wrapper = mountBubble({});
    expect(wrapper.text()).toContain('CONVERSATION.REFERRAL.AD_LABEL');
    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.find('h4').exists()).toBe(false);
    expect(wrapper.find('a').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('WELCOME_MESSAGE_LABEL');
  });

  it('renders a full video post with a play overlay', () => {
    const wrapper = mountBubble({
      source_type: 'post',
      media_type: 'video',
      video_url: 'https://v',
      thumbnail_url: 'https://t.png',
      headline: 'Sale',
      body: 'Half price',
      source_url: 'https://ad',
      welcome_message: { text: 'Hi there' },
    });
    expect(wrapper.text()).toContain('CONVERSATION.REFERRAL.POST_LABEL');
    expect(wrapper.find('img').attributes('src')).toBe('https://t.png');
    expect(wrapper.find('.i-lucide-play').exists()).toBe(true);
    expect(wrapper.text()).toContain('Sale');
    expect(wrapper.text()).toContain('Half price');
    expect(wrapper.text()).toContain('Hi there');
    expect(wrapper.findAll('a')).toHaveLength(2);
  });

  it('hides a broken image and retries for a new referral', async () => {
    const image = { media_type: 'image', image_url: 'https://i.png' };
    const wrapper = mountBubble(image);
    expect(wrapper.find('.i-lucide-play').exists()).toBe(false);
    await wrapper.find('img').trigger('error');
    expect(wrapper.find('img').exists()).toBe(false);
    await wrapper.setProps({ referral: { ...image } });
    expect(wrapper.find('img').exists()).toBe(true);
  });

  it('skips media types without a url', () => {
    expect(
      mountBubble({ media_type: 'video', thumbnail_url: 'https://t' })
        .find('img')
        .exists()
    ).toBe(false);
    expect(
      mountBubble({ media_type: 'image', thumbnail_url: 'https://t' })
        .find('img')
        .exists()
    ).toBe(false);
    expect(
      mountBubble({ media_type: 'video', video_url: 'https://v' })
        .find('img')
        .exists()
    ).toBe(false);
  });
});
