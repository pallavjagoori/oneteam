/**
 * OneTeam behaviour spec for the help center articles header controls.
 *
 * Covers the status tabs with counts and the active tab from the route,
 * the locale menu (remembering the last locale), the category menu
 * (with "all categories" only while a category is picked, the active
 * category name and emoji, and hiding it with no categories), closing
 * menus on an outside click, and the new-article button.
 */
import { mount } from '@vue/test-utils';
import ArticleHeaderControls from '../ArticleHeaderControls.vue';

const route = { params: {} };
const updateUISettings = vi.fn();

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => route,
}));
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({ updateUISettings }),
}));

const TabBar = {
  name: 'TabBar',
  props: ['tabs', 'initialActiveTab'],
  emits: ['tabChanged'],
  template: '<div class="tabs" />',
};
const Button = {
  name: 'Button',
  props: ['label', 'icon'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}<slot /></button>',
};
const DropdownMenu = {
  name: 'DropdownMenu',
  props: ['menuItems'],
  emits: ['action'],
  template: '<div class="menu" />',
};
const OnClickOutside = {
  name: 'OnClickOutside',
  emits: ['trigger'],
  template: '<div class="outside"><slot /></div>',
};
const EmojiIcon = {
  name: 'EmojiIcon',
  props: ['value', 'color'],
  template: '<i class="emoji" />',
};

const categories = [
  { name: 'Billing', slug: 'billing', icon: '💳', icon_color: 'blue' },
  { name: 'Setup', slug: 'setup' },
];
const locales = [
  { name: 'English', code: 'en' },
  { name: 'French', code: 'fr' },
];
const meta = {
  articlesCount: 9,
  mineArticlesCount: 3,
  draftArticlesCount: 2,
  archivedArticlesCount: 1,
};

const mountControls = (props = {}) =>
  mount(ArticleHeaderControls, {
    props: { categories, allowedLocales: locales, meta, ...props },
    global: {
      stubs: { TabBar, Button, DropdownMenu, OnClickOutside, EmojiIcon },
    },
  });

const buttons = wrapper => wrapper.findAllComponents(Button);

describe('ArticleHeaderControls behaviour', () => {
  beforeEach(() => {
    route.params = { locale: 'fr' };
  });

  it('shows tabs with counts and the active tab', async () => {
    let wrapper = mountControls();
    const tabBar = wrapper.findComponent(TabBar);
    expect(tabBar.props('tabs').map(t => [t.value, t.count])).toEqual([
      ['all', 9],
      ['mine', 3],
      ['draft', 2],
      ['archived', 1],
    ]);
    expect(tabBar.props('initialActiveTab')).toBe(0);
    await tabBar.vm.$emit('tabChanged', 'draft');
    expect(wrapper.emitted('tabChange')[0]).toEqual(['draft']);

    route.params = { tab: 'archived' };
    wrapper = mountControls();
    expect(wrapper.findComponent(TabBar).props('initialActiveTab')).toBe(3);
  });

  it('switches locale and remembers it', async () => {
    const wrapper = mountControls();
    const localeButton = buttons(wrapper)[0];
    expect(localeButton.props('label')).toBe('French');
    await localeButton.trigger('click');
    const menu = wrapper.findComponent(DropdownMenu);
    expect(menu.props('menuItems')).toEqual([
      { label: 'English', value: 'en', action: 'filter' },
      { label: 'French', value: 'fr', action: 'filter' },
    ]);
    await menu.vm.$emit('action', { value: 'en' });
    expect(wrapper.emitted('localeChange')[0]).toEqual(['en']);
    expect(updateUISettings).toHaveBeenCalledWith({
      last_active_locale_code: 'en',
    });
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);

    await localeButton.trigger('click');
    await wrapper.findAllComponents(OnClickOutside)[0].vm.$emit('trigger');
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);
  });

  it('filters by category', async () => {
    const wrapper = mountControls();
    const categoryButton = buttons(wrapper)[1];
    expect(categoryButton.text()).toBe(
      'HELP_CENTER.ARTICLES_PAGE.ARTICLES_HEADER.CATEGORY.ALL'
    );
    expect(wrapper.findComponent(EmojiIcon).exists()).toBe(false);
    await categoryButton.trigger('click');
    const menu = wrapper.findComponent(DropdownMenu);
    expect(menu.props('menuItems').map(i => i.value)).toEqual([
      'billing',
      'setup',
    ]);
    expect(menu.props('menuItems')[0]).toMatchObject({
      emoji: '💳',
      iconColor: 'blue',
    });
    await menu.vm.$emit('action', { value: 'setup' });
    expect(wrapper.emitted('categoryChange')[0]).toEqual(['setup']);
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);

    await categoryButton.trigger('click');
    await wrapper.findAllComponents(OnClickOutside)[1].vm.$emit('trigger');
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);
  });

  it('offers all categories while one is active', async () => {
    route.params = { locale: 'en', categorySlug: 'billing' };
    const wrapper = mountControls();
    const categoryButton = buttons(wrapper)[1];
    expect(categoryButton.text()).toBe('Billing');
    expect(wrapper.findComponent(EmojiIcon).props()).toEqual({
      value: '💳',
      color: 'blue',
    });
    await categoryButton.trigger('click');
    expect(
      wrapper
        .findComponent(DropdownMenu)
        .props('menuItems')
        .map(i => i.value)
    ).toEqual(['all', 'billing', 'setup']);
  });

  it('hides the category menu without categories and adds articles', async () => {
    const wrapper = mountControls({ categories: [] });
    expect(wrapper.findAllComponents(OnClickOutside)).toHaveLength(1);
    const newButton = buttons(wrapper)[1];
    expect(newButton.props('label')).toBe(
      'HELP_CENTER.ARTICLES_PAGE.ARTICLES_HEADER.NEW_ARTICLE'
    );
    await newButton.trigger('click');
    expect(wrapper.emitted('newArticle')).toHaveLength(1);
  });
});
