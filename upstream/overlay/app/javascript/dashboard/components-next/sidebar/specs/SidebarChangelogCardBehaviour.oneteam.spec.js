/**
 * OneTeam behaviour spec for the sidebar changelog card.
 *
 * Covers loading posts from the changelog hub (including a missing list
 * and a failed request), pruning dismissed slugs that left the feed,
 * hiding dismissed posts, dismissing with the short animation delay
 * (capped history, no duplicates, index reset), and opening the blog
 * post on read more and on an image click.
 */
import { ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import changelogAPI from 'dashboard/api/changelog';
import SidebarChangelogCard from '../SidebarChangelogCard.vue';

const uiSettings = ref({});
const updateUISettings = vi.fn(settings => {
  uiSettings.value = { ...uiSettings.value, ...settings };
});

vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({ uiSettings, updateUISettings }),
}));
vi.mock('dashboard/api/changelog', () => ({
  default: { fetchFromHub: vi.fn() },
}));

const Card = {
  name: 'GroupedStackedChangelogCard',
  props: ['posts', 'currentIndex', 'dismissingSlugs'],
  emits: ['readMore', 'dismiss', 'imgClick'],
  template: '<div class="card" />',
};

const posts = slugs => slugs.map(slug => ({ slug, title: slug }));

const mountCard = async (response, dismissed) => {
  uiSettings.value = dismissed ? { changelog_dismissed_slugs: dismissed } : {};
  if (response instanceof Error) {
    changelogAPI.fetchFromHub.mockRejectedValue(response);
  } else {
    changelogAPI.fetchFromHub.mockResolvedValue({ data: response });
  }
  const wrapper = mount(SidebarChangelogCard, {
    attrs: { 'data-extra': 'yes' },
    global: {
      stubs: {
        GroupedStackedChangelogCard: Card,
      },
    },
  });
  await flushPromises();
  return wrapper;
};

describe('SidebarChangelogCard behaviour', () => {
  beforeEach(() => {
    updateUISettings.mockImplementation(settings => {
      uiSettings.value = { ...uiSettings.value, ...settings };
    });
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when the feed is empty or fails', async () => {
    let wrapper = await mountCard({});
    expect(wrapper.findComponent(Card).exists()).toBe(false);
    expect(wrapper.vm.isLoading).toBe(false);
    expect(updateUISettings).not.toHaveBeenCalled();

    wrapper = await mountCard(new Error('down'));
    expect(wrapper.findComponent(Card).exists()).toBe(false);
    expect(wrapper.vm.isLoading).toBe(false);
  });

  it('shows undismissed posts and prunes stale dismissed slugs', async () => {
    const wrapper = await mountCard({ posts: posts(['a', 'b', 'c']) }, [
      'b',
      'gone',
    ]);
    expect(updateUISettings).toHaveBeenCalledWith({
      changelog_dismissed_slugs: ['b'],
    });
    const card = wrapper.findComponent(Card);
    expect(card.props('posts').map(p => p.slug)).toEqual(['a', 'c']);
    expect(card.props('currentIndex')).toBe(0);
    expect(card.attributes('data-extra')).toBe('yes');
  });

  it('keeps settings untouched when nothing is stale', async () => {
    await mountCard({ posts: posts(['a', 'b']) }, ['a']);
    expect(updateUISettings).not.toHaveBeenCalled();
  });

  it('dismisses a post after the animation delay', async () => {
    vi.useFakeTimers();
    const wrapper = await mountCard({ posts: posts(['a', 'b']) });
    const card = wrapper.findComponent(Card);
    await card.vm.$emit('imgClick', { index: 1 });
    expect(window.open).toHaveBeenCalledWith(
      'https://www.chatwoot.com/blog/b',
      '_blank'
    );
    expect(card.props('currentIndex')).toBe(1);

    await card.vm.$emit('dismiss', 'b');
    expect(card.props('dismissingSlugs')).toEqual(['b']);
    vi.advanceTimersByTime(200);
    await flushPromises();
    expect(updateUISettings).toHaveBeenLastCalledWith({
      changelog_dismissed_slugs: ['b'],
    });
    expect(card.props('dismissingSlugs')).toEqual([]);
    expect(card.props('currentIndex')).toBe(0);
    expect(card.props('posts').map(p => p.slug)).toEqual(['a']);
  });

  it('keeps the index when it is still in range', async () => {
    vi.useFakeTimers();
    const wrapper = await mountCard({ posts: posts(['a', 'b', 'c']) });
    const card = wrapper.findComponent(Card);
    await card.vm.$emit('dismiss', 'c');
    vi.advanceTimersByTime(200);
    await flushPromises();
    expect(card.props('currentIndex')).toBe(0);
    expect(card.props('posts').map(p => p.slug)).toEqual(['a', 'b']);
  });

  it('caps dismissed history and ignores repeat dismissals', async () => {
    vi.useFakeTimers();
    const feed = posts(['s1', 's2', 's3', 's4', 's5', 's6', 's7']);
    const wrapper = await mountCard({ posts: feed }, [
      's1',
      's2',
      's3',
      's4',
      's5',
    ]);
    const card = wrapper.findComponent(Card);
    expect(card.props('posts').map(p => p.slug)).toEqual(['s6', 's7']);

    await card.vm.$emit('dismiss', 's6');
    vi.advanceTimersByTime(200);
    await flushPromises();
    expect(updateUISettings).toHaveBeenLastCalledWith({
      changelog_dismissed_slugs: ['s2', 's3', 's4', 's5', 's6'],
    });

    updateUISettings.mockClear();
    await card.vm.$emit('dismiss', 's6');
    vi.advanceTimersByTime(200);
    await flushPromises();
    expect(updateUISettings).not.toHaveBeenCalled();
  });

  it('opens nothing when the current post is missing', async () => {
    const wrapper = await mountCard({ posts: posts(['a']) });
    const card = wrapper.findComponent(Card);
    await card.vm.$emit('imgClick', { index: 4 });
    expect(window.open).not.toHaveBeenCalled();
    await card.vm.$emit('imgClick', { index: 0 });
    await card.vm.$emit('readMore');
    expect(window.open).toHaveBeenCalledTimes(2);
  });
});
