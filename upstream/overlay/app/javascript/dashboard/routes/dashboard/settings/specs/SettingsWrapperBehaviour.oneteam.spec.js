/**
 * OneTeam behaviour spec for the settings route wrapper.
 *
 * Covers keying the routed page by full path or, for query-driven pages, by
 * path, with and without keep-alive.
 */
import { markRaw, reactive } from 'vue';
import { mount } from '@vue/test-utils';
import SettingsWrapper from '../SettingsWrapper.vue';

const env = vi.hoisted(() => ({ route: null }));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
}));

const Page = markRaw({ name: 'Page', template: '<p class="page" />' });
const RouterView = {
  setup: () => ({ Page }),
  template: '<div><slot :Component="Page" /></div>',
};

/**
 * Mounts the wrapper for a route.
 *
 * @param {object} route - Route path, fullPath and meta.
 * @param {object} props - Component props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountWrapper = (route, props = {}) => {
  env.route = reactive(route);
  return mount(SettingsWrapper, {
    props,
    global: { stubs: { RouterView } },
  });
};

describe('SettingsWrapper behaviour', () => {
  it('keys by path for query-driven pages inside keep-alive', () => {
    const wrapper = mountWrapper({
      path: '/a',
      fullPath: '/a?page=2',
      meta: { reuseOnQueryChange: true },
    });
    expect(wrapper.findComponent(Page).vm.$.vnode.key).toBe('/a');
  });

  it('keys by full path without keep-alive', () => {
    const wrapper = mountWrapper(
      { path: '/a', fullPath: '/a?page=2', meta: {} },
      { keepAlive: false }
    );
    expect(wrapper.findComponent(Page).vm.$.vnode.key).toBe('/a?page=2');
  });
});
