/**
 * OneTeam behaviour spec for the Captain overview "no inboxes" banner.
 *
 * Covers fetching inboxes for the assistant, showing the banner only when
 * loaded with no inboxes, opening the inboxes page and dismissing it.
 */
import { reactive } from 'vue';
import { mount } from '@vue/test-utils';
import InboxBanner from '../InboxBanner.vue';

const env = vi.hoisted(() => ({
  push: vi.fn(),
  dispatch: vi.fn(),
  getters: {},
  route: null,
}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
  useRouter: () => ({ push: env.push }),
}));
vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return {
    useStore: () => ({ dispatch: env.dispatch }),
    useMapGetter: name => computed(() => env.getters[name]),
  };
});

/**
 * Mounts the banner for an assistant with the given inboxes.
 *
 * @param {object} options - Assistant id, inboxes and loading flag.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountBanner = ({ assistantId = '5', inboxes = [], fetching = false }) => {
  env.route = reactive({ params: { accountId: '1', assistantId } });
  env.getters = {
    'captainInboxes/getRecords': inboxes,
    'captainInboxes/getUIFlags': { fetchingList: fetching },
  };
  return mount(InboxBanner, { global: { mocks: { $t: key => key } } });
};

describe('InboxBanner behaviour', () => {
  it('opens the inboxes page and can be dismissed', async () => {
    const wrapper = mountBanner({});
    expect(env.dispatch).toHaveBeenCalledWith('captainInboxes/get', {
      assistantId: '5',
    });
    const [open, dismiss] = wrapper.findAll('button');
    await open.trigger('click');
    expect(env.push).toHaveBeenCalledWith({
      name: 'captain_assistants_inboxes_index',
      params: { accountId: '1', assistantId: '5' },
    });
    await dismiss.trigger('click');
    expect(wrapper.find('button').exists()).toBe(false);

    env.route.params.assistantId = '6';
    await wrapper.vm.$nextTick();
    expect(wrapper.find('button').exists()).toBe(true);
    expect(env.dispatch).toHaveBeenLastCalledWith('captainInboxes/get', {
      assistantId: '6',
    });
  });

  it('stays hidden while loading, with inboxes, or without an assistant', () => {
    expect(mountBanner({ fetching: true }).find('button').exists()).toBe(false);
    expect(
      mountBanner({ inboxes: [{ id: 1 }] })
        .find('button')
        .exists()
    ).toBe(false);
    env.dispatch.mockClear();
    mountBanner({ assistantId: '' });
    expect(env.dispatch).not.toHaveBeenCalled();
  });
});
