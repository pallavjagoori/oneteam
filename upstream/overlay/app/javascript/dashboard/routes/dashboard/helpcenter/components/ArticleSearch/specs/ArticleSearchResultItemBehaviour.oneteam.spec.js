/**
 * OneTeam behaviour spec for one help center article search result.
 *
 * Covers the title, locale and category (or "uncategorized"), previewing
 * the article, inserting it, and copying its link with an alert, each
 * without bubbling to the result's own click.
 */
import { mount, flushPromises } from '@vue/test-utils';
import ArticleSearchResultItem from '../ArticleSearchResultItem.vue';
import { useAlert } from 'dashboard/composables';
import { copyTextToClipboard } from 'shared/helpers/clipboard';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('shared/helpers/clipboard', () => ({
  copyTextToClipboard: vi.fn(),
}));

const Button = {
  name: 'Button',
  props: ['icon'],
  emits: ['click'],
  template: '<span :class="icon" @click.stop="$emit(\'click\', $event)" />',
};
const mountItem = props =>
  mount(ArticleSearchResultItem, {
    props: { id: 5, url: 'https://kb/a', locale: 'en', ...props },
    global: { stubs: { Button } },
  });

describe('ArticleSearchResultItem behaviour', () => {
  it('previews, inserts and copies', async () => {
    const wrapper = mountItem({ title: 'Refunds', category: 'Billing' });
    expect(wrapper.find('h4').text()).toBe('Refunds');
    expect(wrapper.find('p').text()).toContain('en');
    expect(wrapper.find('p').text()).toContain('Billing');
    await wrapper.trigger('click');
    expect(wrapper.emitted('preview')).toEqual([[5]]);

    const stop = vi.fn();
    const [copy, insert] = wrapper.findAllComponents(Button);
    insert.vm.$emit('click', { stopPropagation: stop });
    copy.vm.$emit('click', { stopPropagation: stop });
    await flushPromises();
    expect(wrapper.emitted('insert')).toEqual([[5]]);
    expect(copyTextToClipboard).toHaveBeenCalledWith('https://kb/a');
    expect(useAlert).toHaveBeenCalledWith('CONTACT_PANEL.COPY_SUCCESSFUL');
    expect(stop).toHaveBeenCalledTimes(2);
  });

  it('shows defaults without a title or category', () => {
    const wrapper = mountItem();
    expect(wrapper.find('h4').text()).toBe('Untitled');
    expect(wrapper.find('p').text()).toContain(
      'HELP_CENTER.ARTICLE_SEARCH_RESULT.UNCATEGORIZED'
    );
  });
});
