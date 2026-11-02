/**
 * OneTeam behaviour spec for a help center article in search results.
 *
 * Covers the link to the article editor, the title, category and status
 * badges (archived, draft and published colours), the relative update
 * time with its exact-time tooltip, and the preview text: plain text
 * from the article body (cut at 300 characters), else the description,
 * else nothing.
 */
import { mount } from '@vue/test-utils';
import SearchResultArticleItem from '../SearchResultArticleItem.vue';

vi.mock('shared/helpers/timeHelper', () => ({
  dynamicTime: time => `ago:${time}`,
}));
vi.mock('shared/composables/useExactTimestamp', () => ({
  useExactTimestamp: () => time => `exact:${time}`,
}));

let tooltip;
const mountItem = (props = {}) =>
  mount(SearchResultArticleItem, {
    props: { portalSlug: 'docs', ...props },
    global: {
      stubs: {
        RouterLink: {
          props: ['to'],
          template: '<a :href="to"><slot /></a>',
        },
        CardLayout: { template: '<div class="card"><slot /></div>' },
      },
      directives: {
        tooltip: {
          mounted(_, binding) {
            tooltip = binding.value;
          },
        },
      },
    },
  });

describe('SearchResultArticleItem behaviour', () => {
  it('links to the article editor and shows its details', () => {
    const wrapper = mountItem({
      id: 7,
      accountId: 2,
      locale: 'en',
      title: 'Getting started',
      category: 'basics',
      status: 'archived',
      updatedAt: 1700,
      content: '**Hello** world',
    });
    expect(wrapper.find('a').attributes('href')).toBe(
      '/app/accounts/2/portals/docs/en/articles/edit/7'
    );
    expect(wrapper.find('h5').text()).toBe('Getting started');
    const badges = wrapper.findAll('span.rounded-md');
    expect(badges.map(b => b.text())).toEqual(['basics', 'archived']);
    expect(badges[1].classes()).toContain('text-n-slate-12');
    expect(wrapper.find('.w-px').exists()).toBe(true);
    expect(wrapper.text()).toContain('ago:1700');
    expect(tooltip.content).toBe('exact:1700');
    expect(wrapper.find('p').text()).toBe('Hello world');
  });

  it('colours draft and published articles', () => {
    const status = s =>
      mountItem({ status: s }).find('span.rounded-md').classes();
    expect(status('draft')).toContain('text-n-amber-11');
    expect(status('published')).toContain('text-n-teal-11');
  });

  it('falls back to the description and hides empty parts', () => {
    const wrapper = mountItem({ description: 'Short summary' });
    expect(wrapper.find('p').text()).toBe('Short summary');
    expect(wrapper.findAll('span')).toHaveLength(0);
    expect(wrapper.find('.w-px').exists()).toBe(false);
    expect(mountItem().find('p').exists()).toBe(false);
  });

  it('cuts long article text at 300 characters', () => {
    const text = mountItem({ content: 'a'.repeat(400) })
      .find('p')
      .text();
    expect(text).toBe(`${'a'.repeat(300)}...`);
  });
});
