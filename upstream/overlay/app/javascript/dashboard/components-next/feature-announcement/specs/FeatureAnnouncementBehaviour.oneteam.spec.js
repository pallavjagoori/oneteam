/**
 * OneTeam behaviour spec for the feature announcement dialog.
 *
 * Covers what the upstream spec leaves out: the thumbnail strip scroll
 * buttons, the footer previous arrow, swipes that change nothing,
 * thumbnails without a preview image, and the escape key hint.
 */
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { subDays } from 'date-fns';
import FeatureAnnouncement from '../FeatureAnnouncement.vue';

const env = vi.hoisted(() => ({ updateUISettings: vi.fn(), swipe: null }));

vi.mock('dashboard/composables/store', async () => {
  const { computed, ref } = await import('vue');
  env.announcements = ref([]);
  env.isRTL = ref(false);
  const globalConfig = computed(() => ({
    activeFeatureAnnouncements: env.announcements.value,
  }));
  return {
    useMapGetter: key =>
      ({ 'globalConfig/get': globalConfig, 'accounts/isRTL': env.isRTL })[key],
  };
});
vi.mock('dashboard/composables/useAccount', async () => {
  const { ref } = await import('vue');
  return {
    useAccount: () => ({
      currentAccount: ref({ created_at: subDays(new Date(), 30) }),
    }),
  };
});
vi.mock('dashboard/composables/useUISettings', async () => {
  const { ref } = await import('vue');
  return {
    useUISettings: () => ({
      uiSettings: ref({}),
      updateUISettings: env.updateUISettings,
    }),
  };
});
vi.mock('@vueuse/core', async () => {
  const { reactive } = await import('vue');
  return {
    useScroll: () => ({
      arrivedState: reactive({ left: false, right: false, bottom: false }),
      measure: vi.fn(),
    }),
    useSwipe: (_, options) => {
      env.swipe = options;
    },
  };
});

const ButtonStub = {
  props: ['label', 'disabled'],
  emits: ['click'],
  template:
    '<button type="button" :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
};

/**
 * Builds an announcement.
 *
 * @param {number} id announcement id
 * @param {string} videoUrl video link
 * @returns {object}
 */
const item = (id, videoUrl) => ({
  id,
  title: `Item ${id}`,
  banner_message: 'Hello',
  video_url: videoUrl,
  updated_at: '2026-09-29T10:00:00.000Z',
});

/**
 * Mounts the dialog.
 *
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountDialog = () =>
  mount(FeatureAnnouncement, {
    attachTo: document.body,
    global: {
      stubs: {
        Button: ButtonStub,
        Icon: true,
        I18nT: { template: '<span class="hint"><slot name="key" /></span>' },
      },
      directives: { 'dompurify-html': {} },
    },
  });

/**
 * Finds the button inside the given area by its aria label.
 *
 * @param {import('@vue/test-utils').VueWrapper} wrapper mounted dialog
 * @param {string} label label key suffix
 * @param {string} area selector of the enclosing area
 * @returns {import('@vue/test-utils').DOMWrapper}
 */
const arrow = (wrapper, label, area) =>
  wrapper
    .findAll(`button[aria-label="FEATURE_ANNOUNCEMENT.${label}"]`)
    .find(button => button.element.closest(area));

describe('FeatureAnnouncement behaviour', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn();
    Element.prototype.scrollBy = vi.fn();
    env.isRTL.value = false;
    env.announcements.value = [
      item(1, 'https://youtu.be/abc'),
      item(2, 'https://vimeo.com/000000000'),
    ];
  });

  it('scrolls the strip and steps back from the footer', async () => {
    const wrapper = mountDialog();
    const strip = wrapper.find('.no-scrollbar').element;
    Object.defineProperty(strip, 'clientWidth', { value: 100 });

    expect(wrapper.findAll('.no-scrollbar img')).toHaveLength(1);
    await arrow(wrapper, 'NEXT', '.relative.w-full').trigger('click');
    await arrow(wrapper, 'PREVIOUS', '.relative.w-full').trigger('click');
    expect(Element.prototype.scrollBy).toHaveBeenCalledWith({
      left: 80,
      behavior: 'smooth',
    });
    expect(Element.prototype.scrollBy).toHaveBeenCalledWith({
      left: -80,
      behavior: 'smooth',
    });

    await arrow(wrapper, 'NEXT', '.border-t').trigger('click');
    expect(wrapper.find('h1').text()).toBe('Item 2');
    await arrow(wrapper, 'PREVIOUS', '.border-t').trigger('click');
    expect(wrapper.find('h1').text()).toBe('Item 1');
  });

  it('swipes right in RTL and ignores other directions', async () => {
    env.isRTL.value = true;
    const wrapper = mountDialog();
    const target = wrapper.find('h1').element;

    env.swipe.onSwipeEnd({ target }, 'up');
    await nextTick();
    expect(wrapper.find('h1').text()).toBe('Item 1');

    env.swipe.onSwipeEnd({ target }, 'right');
    await nextTick();
    expect(wrapper.find('h1').text()).toBe('Item 2');
  });

  it('shows the escape key hint for a single announcement', () => {
    env.announcements.value = [item(1, 'https://youtu.be/abc')];
    const wrapper = mountDialog();
    expect(wrapper.find('.hint kbd').text()).toBe(
      'FEATURE_ANNOUNCEMENT.ESCAPE_KEY'
    );
  });
});
