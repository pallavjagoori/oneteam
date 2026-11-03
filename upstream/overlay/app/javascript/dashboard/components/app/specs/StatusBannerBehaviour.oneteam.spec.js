/**
 * OneTeam behaviour spec for the platform StatusBanner.
 *
 * Covers banner colours, hiding dismissed banners and persisting a
 * dismissal to local storage.
 */
import { computed, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { LocalStorage } from 'shared/helpers/localStorage';
import { LOCAL_STORAGE_KEYS } from 'dashboard/constants/localStorage';
import StatusBanner from '../StatusBanner.vue';

const globalConfig = ref({});

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => computed(() => globalConfig.value),
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: key => key }),
}));

const BannerStub = {
  name: 'Banner',
  props: { color: String },
  emits: ['action'],
  template: '<div><slot /><button @click="$emit(\'action\')" /></div>',
};

/**
 * Mounts StatusBanner with a Banner stub.
 *
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountBanner = () =>
  mount(StatusBanner, {
    global: {
      directives: { dompurifyHtml: {} },
      stubs: { Banner: BannerStub },
    },
  });

describe('StatusBanner behaviour', () => {
  beforeEach(() => {
    localStorage.clear();
    globalConfig.value = {
      activePlatformBanners: [
        { id: 1, updated_at: 't1', banner_type: 'error', banner_message: 'A' },
        { id: 2, updated_at: 't2', banner_type: 'other', banner_message: 'B' },
      ],
    };
  });

  it('renders nothing without a global config', () => {
    globalConfig.value = null;
    expect(mountBanner().findAllComponents(BannerStub)).toHaveLength(0);
  });

  it('maps banner types to colours', () => {
    const banners = mountBanner().findAllComponents(BannerStub);
    expect(banners.map(b => b.props('color'))).toEqual(['ruby', 'slate']);
  });

  it('skips banners dismissed earlier', () => {
    LocalStorage.set(LOCAL_STORAGE_KEYS.DISMISSED_PLATFORM_BANNERS, ['1-t1']);
    expect(mountBanner().findAllComponents(BannerStub)).toHaveLength(1);
  });

  it('dismisses a banner once and stores the key', async () => {
    const wrapper = mountBanner();
    const { dismissBanner } = wrapper.vm.$.setupState;
    dismissBanner(globalConfig.value.activePlatformBanners[1]);
    dismissBanner(globalConfig.value.activePlatformBanners[1]);
    await wrapper
      .findAllComponents(BannerStub)[0]
      .find('button')
      .trigger('click');
    expect(
      LocalStorage.get(LOCAL_STORAGE_KEYS.DISMISSED_PLATFORM_BANNERS)
    ).toEqual(['2-t2', '1-t1']);
    expect(wrapper.findAllComponents(BannerStub)).toHaveLength(0);
  });
});
