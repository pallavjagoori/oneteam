/**
 * OneTeam behaviour spec for the help center category page header.
 *
 * Covers the list view (locale menu and switching, category count,
 * search, creating a category for the current or first portal) and the
 * single-category view (breadcrumb with count and emoji, going back to
 * the list, editing the category, starting a new article), plus closing
 * menus and dialogs on outside clicks.
 */
import { reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import CategoryHeaderControls from '../CategoryHeaderControls.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
  useRouter: () => env.router,
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({
    t: (key, args) => (args ? `${key} ${JSON.stringify(args)}` : key),
  }),
}));
vi.mock('dashboard/composables/store.js', () => ({
  useStoreGetters: () => ({
    'portals/portalBySlug': { value: slug => ({ name: `Portal ${slug}` }) },
    'portals/allPortals': { value: [{ name: 'First portal' }] },
  }),
}));

const NextButton = {
  name: 'Button',
  props: ['label'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};
const Outside = {
  name: 'OnClickOutside',
  emits: ['trigger'],
  template: '<div class="outside"><slot /></div>',
};
const Menu = {
  name: 'DropdownMenu',
  props: ['menuItems'],
  emits: ['action'],
  template: '<ul />',
};
const Dialog = {
  name: 'CategoryDialog',
  props: [
    'mode',
    'selectedCategory',
    'portalName',
    'activeLocaleName',
    'activeLocaleCode',
  ],
  emits: ['close'],
  template: '<div class="dialog" />',
};
const Crumbs = {
  name: 'Breadcrumb',
  props: ['items'],
  emits: ['click'],
  template: '<nav />',
};
const SearchInput = {
  name: 'Input',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<input />',
};

const categories = [
  {
    slug: 'faq',
    name: 'FAQ',
    icon: '❓',
    icon_color: '#f00',
    meta: { articles_count: 4 },
  },
  { slug: 'misc', name: 'Misc' },
];
const locales = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
];

const mountHeader = async (props = {}, params = {}) => {
  env.route = reactive({
    params: { portalSlug: 'docs', locale: 'en', ...params },
  });
  env.router = { push: vi.fn() };
  const wrapper = mount(CategoryHeaderControls, {
    props: { categories, allowedLocales: locales, ...props },
    global: {
      stubs: {
        Button: NextButton,
        OnClickOutside: Outside,
        DropdownMenu: Menu,
        CategoryDialog: Dialog,
        Breadcrumb: Crumbs,
        Input: SearchInput,
      },
    },
  });
  await flushPromises();
  return wrapper;
};

const button = (wrapper, label) =>
  wrapper.findAll('button').find(b => b.text().includes(label));

describe('Category header controls behaviour', () => {
  it('switches locales from the menu', async () => {
    const wrapper = await mountHeader();
    expect(wrapper.text()).toContain('CATEGORIES_COUNT {"n":2}');
    await button(wrapper, 'English').trigger('click');
    expect(wrapper.findComponent(Menu).props('menuItems')).toEqual([
      { label: 'English', value: 'en', action: 'filter' },
      { label: 'French', value: 'fr', action: 'filter' },
    ]);
    await wrapper.findComponent(Menu).vm.$emit('action', { value: 'fr' });
    expect(wrapper.emitted('localeChange')).toEqual([['fr']]);
    expect(wrapper.findComponent(Menu).exists()).toBe(false);
    await button(wrapper, 'English').trigger('click');
    await wrapper.findAllComponents(Outside)[0].vm.$emit('trigger');
    expect(wrapper.findComponent(Menu).exists()).toBe(false);
  });

  it('searches and creates categories for the current portal', async () => {
    const wrapper = await mountHeader();
    await wrapper
      .findComponent(SearchInput)
      .vm.$emit('update:modelValue', 'bill');
    expect(wrapper.emitted('update:searchQuery')).toEqual([['bill']]);
    await button(wrapper, 'NEW_CATEGORY').trigger('click');
    expect(wrapper.findComponent(Dialog).props()).toMatchObject({
      mode: 'create',
      portalName: 'Portal docs',
      activeLocaleName: 'English',
      activeLocaleCode: 'en',
    });
    await wrapper.findComponent(Dialog).vm.$emit('close');
    expect(wrapper.find('.dialog').exists()).toBe(false);
    await button(wrapper, 'NEW_CATEGORY').trigger('click');
    await wrapper.findAllComponents(Outside)[1].vm.$emit('trigger');
    expect(wrapper.find('.dialog').exists()).toBe(false);
  });

  it('falls back to the first portal and an unknown locale', async () => {
    const wrapper = await mountHeader(
      { categories: null },
      { portalSlug: undefined, locale: 'de' }
    );
    expect(wrapper.text()).toContain('CATEGORIES_COUNT {}');
    await button(wrapper, 'NEW_CATEGORY').trigger('click');
    expect(wrapper.findComponent(Dialog).props()).toMatchObject({
      portalName: 'First portal',
      activeLocaleName: '',
      activeLocaleCode: '',
    });
  });

  it('shows a selected category and edits it', async () => {
    const wrapper = await mountHeader(
      { hasSelectedCategory: true },
      { categorySlug: 'faq' }
    );
    const items = wrapper.findComponent(Crumbs).props('items');
    expect(items[0].label).toContain('"localeCode":"en"');
    expect(items[1]).toMatchObject({ emoji: '❓', iconColor: '#f00' });
    expect(items[1].label).toContain('"categoryName":"FAQ","categoryCount":4');
    wrapper.findComponent(Crumbs).vm.$emit('click');
    expect(env.router.push).toHaveBeenCalledWith({
      name: 'portals_categories_index',
      params: { portalSlug: 'docs', locale: 'en' },
    });

    await button(wrapper, 'EDIT_CATEGORY').trigger('click');
    expect(wrapper.findComponent(Dialog).props('selectedCategory')).toEqual(
      categories[0]
    );
    await wrapper.findComponent(Dialog).vm.$emit('close');
    expect(wrapper.find('.dialog').exists()).toBe(false);
    await button(wrapper, 'EDIT_CATEGORY').trigger('click');
    await wrapper.findComponent(Outside).vm.$emit('trigger');
    expect(wrapper.find('.dialog').exists()).toBe(false);
    await button(wrapper, 'NEW_ARTICLE').trigger('click');
    expect(wrapper.emitted('newArticle')).toHaveLength(1);
  });

  it('counts zero articles and handles a missing category', async () => {
    let wrapper = await mountHeader(
      { hasSelectedCategory: true },
      { categorySlug: 'misc' }
    );
    expect(wrapper.findComponent(Crumbs).props('items')[1].label).toContain(
      '"categoryCount":0'
    );
    wrapper = await mountHeader(
      { hasSelectedCategory: true },
      { categorySlug: 'gone' }
    );
    expect(wrapper.findComponent(Crumbs).props('items')).toHaveLength(1);
  });
});
