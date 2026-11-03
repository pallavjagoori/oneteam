/**
 * OneTeam behaviour spec for FeatureSpotlightPopover.
 *
 * Covers toggling the popup, the thumbnail and its fallbacks after an
 * image error, the note, the video and learn-more links, hidden actions
 * and closing on outside click.
 */
import { mount } from '@vue/test-utils';
import FeatureSpotlightPopover from '../FeatureSpotlightPopover.vue';

const outside = vi.hoisted(() => ({ handler: null }));

vi.mock('@vueuse/components', () => ({
  vOnClickOutside: {
    mounted: (el, binding) => {
      [outside.handler] = binding.value;
    },
  },
}));

vi.mock('@vueuse/core', async importOriginal => {
  const { ref: vueRef } = await import('vue');
  return {
    ...(await importOriginal()),
    useToggle: () => {
      const state = vueRef(false);
      return [
        state,
        value => {
          state.value = value;
        },
      ];
    },
  };
});

/**
 * Mounts the popover and opens it.
 *
 * @param {object} props component props
 * @returns {Promise<import('@vue/test-utils').VueWrapper>}
 */
const openPopover = async props => {
  const wrapper = mount(FeatureSpotlightPopover, {
    props: { buttonLabel: 'New', title: 'Feature', ...props },
    global: {
      mocks: { $t: key => key },
      stubs: {
        Button: {
          props: { label: String },
          emits: ['click'],
          template: '<button :data-label="label" @click="$emit(\'click\')" />',
        },
      },
    },
  });
  await wrapper.find('[data-label="New"]').trigger('click');
  return wrapper;
};

describe('FeatureSpotlightPopover behaviour', () => {
  beforeEach(() => {
    window.open = vi.fn();
  });

  it('opens with the thumbnail, note and both links', async () => {
    const wrapper = await openPopover({
      thumbnail: '/thumb.png',
      note: 'Try it',
      videoUrl: '/video',
      learnMoreUrl: '/docs',
    });
    expect(wrapper.find('img').attributes('src')).toBe('/thumb.png');
    expect(wrapper.text()).toContain('Try it');
    await wrapper
      .find('[data-label="FEATURE_SPOTLIGHT.WATCH_VIDEO"]')
      .trigger('click');
    await wrapper
      .find('[data-label="FEATURE_SPOTLIGHT.LEARN_MORE"]')
      .trigger('click');
    expect(window.open.mock.calls).toEqual([
      ['/video', '_blank'],
      ['/docs', '_blank'],
    ]);
  });

  it('falls back to the light and dark thumbnails after an error', async () => {
    const wrapper = await openPopover({
      thumbnail: '/broken.png',
      fallbackThumbnail: '/light.png',
      fallbackThumbnailDark: '/dark.png',
    });
    await wrapper.find('img').trigger('error');
    expect(wrapper.findAll('img').map(img => img.attributes('src'))).toEqual([
      '/dark.png',
      '/light.png',
    ]);
  });

  it('shows no image, note or links when none are given', async () => {
    const wrapper = await openPopover({});
    expect(wrapper.findAll('img')).toHaveLength(0);
    expect(wrapper.find('p').exists()).toBe(false);
    expect(wrapper.findAll('button')).toHaveLength(1);
    wrapper.vm.$.setupState.openLink('');
    expect(window.open).not.toHaveBeenCalled();
  });

  it('hides the actions and closes on outside click', async () => {
    const wrapper = await openPopover({ hideActions: true, videoUrl: '/v' });
    expect(
      wrapper.find('[data-label="FEATURE_SPOTLIGHT.WATCH_VIDEO"]').exists()
    ).toBe(false);
    outside.handler();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('section').exists()).toBe(false);
    outside.handler();
  });

  it('closes again from the toggle button', async () => {
    const wrapper = await openPopover({});
    await wrapper.find('[data-label="New"]').trigger('click');
    expect(wrapper.find('section').exists()).toBe(false);
  });
});
