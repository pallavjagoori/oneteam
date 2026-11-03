/**
 * OneTeam behaviour spec for the feature spotlight card.
 *
 * Covers the thumbnail and its light/dark fallbacks after a load error,
 * the note, opening the video and learn-more links, a custom actions
 * slot, and hiding the actions.
 */
import { mount } from '@vue/test-utils';
import FeatureSpotlight from '../FeatureSpotlight.vue';

const Button = {
  name: 'NextButton',
  props: ['label', 'icon'],
  emits: ['click'],
  template: '<button :data-icon="icon" />',
};

/**
 * Mounts the card with a stubbed button.
 *
 * @param {object} props Card props.
 * @param {object} slots Slots to render.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountCard = (props = {}, slots = {}) =>
  mount(FeatureSpotlight, {
    props: { title: 'Captain', ...props },
    slots,
    global: { stubs: { Button }, mocks: { $t: key => key } },
  });

describe('FeatureSpotlight behaviour', () => {
  it('falls back to the light and dark thumbnails on error', async () => {
    const wrapper = mountCard({
      thumbnail: 'main.png',
      fallbackThumbnail: 'light.png',
      fallbackThumbnailDark: 'dark.png',
      note: 'New!',
    });
    expect(wrapper.findAll('img').map(i => i.attributes('src'))).toEqual([
      'main.png',
    ]);
    expect(wrapper.text()).toContain('New!');
    await wrapper.get('img').trigger('error');
    expect(wrapper.findAll('img').map(i => i.attributes('src'))).toEqual([
      'dark.png',
      'light.png',
    ]);
  });

  it('opens the video and learn-more links', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => {});
    const wrapper = mountCard({ videoUrl: 'v.mp4', learnMoreUrl: 'docs' });
    wrapper.findAllComponents(Button).forEach(b => b.vm.$emit('click'));
    expect(open.mock.calls).toEqual([
      ['v.mp4', '_blank'],
      ['docs', '_blank'],
    ]);
    open.mockClear();
    wrapper.vm.$.setupState.openLink('');
    expect(open).not.toHaveBeenCalled();
  });

  it('renders custom actions or hides them', () => {
    const custom = mountCard({}, { actions: '<a class="custom" />' });
    expect(custom.find('.custom').exists()).toBe(true);
    expect(custom.findAll('img')).toHaveLength(0);
    const hidden = mountCard({ hideActions: true, videoUrl: 'v' });
    expect(hidden.findComponent(Button).exists()).toBe(false);
  });
});
