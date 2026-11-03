/**
 * OneTeam behaviour spec for the Year in Review sidebar banner.
 *
 * Covers opening and closing the review modal from the banner or its
 * button, dismissing the banner per account, and hiding it once
 * dismissed or on custom-branded installs.
 */
import { computed, ref } from 'vue';
import { mount } from '@vue/test-utils';
import YearInReviewBanner from '../YearInReviewBanner.vue';

const env = vi.hoisted(() => ({
  settings: null,
  update: vi.fn(),
  branded: false,
}));

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({
    uiSettings: env.settings,
    updateUISettings: env.update,
  }),
}));
vi.mock('dashboard/composables/store', () => ({
  useStoreGetters: () => ({
    'globalConfig/isACustomBrandedInstance': computed(() => env.branded),
    getCurrentAccountId: computed(() => 4),
  }),
}));

const YearInReviewModal = {
  name: 'YearInReviewModal',
  props: { show: Boolean },
  emits: ['close'],
  template: '<div />',
};

/**
 * Mounts the banner.
 *
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountBanner = () =>
  mount(YearInReviewBanner, {
    global: { stubs: { YearInReviewModal, Icon: true } },
  });

describe('YearInReviewBanner behaviour', () => {
  beforeEach(() => {
    env.settings = ref({});
    env.update = vi.fn();
    env.branded = false;
  });

  it('opens and closes the review', async () => {
    const wrapper = mountBanner();
    const modal = wrapper.getComponent(YearInReviewModal);
    await wrapper.get('.cursor-pointer').trigger('click');
    expect(modal.props('show')).toBe(true);
    modal.vm.$emit('close');
    await wrapper.vm.$nextTick();
    expect(modal.props('show')).toBe(false);
    await wrapper.findAll('button')[1].trigger('click');
    expect(modal.props('show')).toBe(true);
  });

  it('dismisses the banner without opening the review', async () => {
    const wrapper = mountBanner();
    await wrapper.findAll('button')[0].trigger('click');
    expect(env.update).toHaveBeenCalledWith({ yir_closed_4_2025: true });
    expect(wrapper.getComponent(YearInReviewModal).props('show')).toBe(false);
  });

  it('hides once dismissed or when custom branded', () => {
    env.settings.value = { yir_closed_4_2025: true };
    expect(mountBanner().find('div').exists()).toBe(false);
    env.settings.value = null;
    env.branded = true;
    expect(mountBanner().find('div').exists()).toBe(false);
  });
});
