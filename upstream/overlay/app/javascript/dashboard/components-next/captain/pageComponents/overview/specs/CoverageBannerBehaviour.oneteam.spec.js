/**
 * OneTeam behaviour spec for the Captain knowledge coverage banner.
 *
 * Covers showing the banner only for thin coverage with a large FAQ
 * backlog, opening the suggestions page, dismissing per assistant, and
 * re-reading the dismissal when the assistant changes.
 */
import { mount } from '@vue/test-utils';
import { reactive } from 'vue';
import CoverageBanner from '../CoverageBanner.vue';

const route = vi.hoisted(() => ({ current: null }));
const push = vi.hoisted(() => vi.fn());

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => route.current,
  useRouter: () => ({ push }),
}));

/**
 * Mounts the banner.
 *
 * @param {object} [knowledge] Knowledge stats, or null to use the default.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountBanner = knowledge =>
  mount(CoverageBanner, {
    props: knowledge ? { knowledge } : {},
    global: {
      mocks: { $t: (key, args) => (args ? `${key}:${args.count}` : key) },
    },
  });

describe('CoverageBanner behaviour', () => {
  beforeEach(() => {
    window.localStorage.clear();
    route.current = reactive({ params: { accountId: 1, assistantId: 7 } });
  });

  it('nudges to review suggestions and remembers a dismissal', async () => {
    const wrapper = mountBanner({ coverage: 40, suggestions: 150 });
    expect(wrapper.classes()).not.toContain('hidden');
    expect(wrapper.text()).toContain(
      'CAPTAIN.OVERVIEW.COVERAGE_BANNER.TEXT:150'
    );
    const [open, close] = wrapper.findAll('button');
    await open.trigger('click');
    expect(push).toHaveBeenCalledWith({
      name: 'captain_assistants_faq_suggestions',
      params: { accountId: 1, assistantId: 7 },
    });
    await close.trigger('click');
    expect(wrapper.classes()).toContain('hidden');
    route.current.params = { accountId: 1, assistantId: 8 };
    await wrapper.vm.$nextTick();
    expect(wrapper.classes()).not.toContain('hidden');
    route.current.params = { accountId: 1, assistantId: 7 };
    await wrapper.vm.$nextTick();
    expect(wrapper.classes()).toContain('hidden');
  });

  it('stays hidden with good coverage, a small backlog or no stats', () => {
    expect(mountBanner({ coverage: 80, suggestions: 150 }).classes()).toContain(
      'hidden'
    );
    expect(mountBanner({ coverage: 10, suggestions: 50 }).classes()).toContain(
      'hidden'
    );
    expect(mountBanner({ suggestions: 150 }).classes()).not.toContain('hidden');
    expect(mountBanner({ coverage: 10 }).classes()).toContain('hidden');
    expect(mountBanner().classes()).toContain('hidden');
  });
});
