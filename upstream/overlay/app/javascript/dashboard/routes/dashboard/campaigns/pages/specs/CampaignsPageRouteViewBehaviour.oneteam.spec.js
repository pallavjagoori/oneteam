/**
 * OneTeam behaviour spec for the campaigns route view.
 *
 * Covers loading campaigns and labels on mount and rendering the routed
 * page with or without keep-alive.
 */
import { markRaw } from 'vue';
import { mount } from '@vue/test-utils';
import CampaignsPageRouteView from '../CampaignsPageRouteView.vue';

const dispatch = vi.hoisted(() => vi.fn());

vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch }),
}));

const Page = markRaw({ name: 'Page', template: '<p class="page" />' });
const RouterView = {
  name: 'RouterView',
  setup: () => ({ Page }),
  template: '<div><slot :Component="Page" /></div>',
};

describe('CampaignsPageRouteView behaviour', () => {
  it.each([true, false])(
    'loads data and renders the page (keepAlive %s)',
    keepAlive => {
      dispatch.mockClear();
      const wrapper = mount(CampaignsPageRouteView, {
        props: { keepAlive },
        global: { stubs: { RouterView } },
      });
      expect(dispatch.mock.calls).toEqual([['campaigns/get'], ['labels/get']]);
      expect(wrapper.find('.page').exists()).toBe(true);
    }
  );
});
