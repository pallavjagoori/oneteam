/**
 * OneTeam behaviour spec for the article editor author, category and
 * properties controls.
 *
 * Covers the default author and category for new articles (current
 * user, category from the route, first category), the saved author and
 * category for existing ones, the sorted menus, picking from them, the
 * properties panel, and closing menus on outside clicks.
 */
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import Controls from '../ArticleEditorControls.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: name => env.getters[name],
}));
vi.mock('@vueuse/components', () => ({
  OnClickOutside: {
    name: 'OnClickOutside',
    emits: ['trigger'],
    template: '<div class="outside"><slot /></div>',
  },
}));

const Button = {
  name: 'Button',
  props: ['label', 'icon', 'disabled'],
  emits: ['click'],
  template:
    '<button :data-icon="icon" :disabled="disabled" @click="$emit(\'click\')"><slot />{{ label }}</button>',
};
const DropdownMenu = {
  name: 'DropdownMenu',
  props: ['menuItems'],
  emits: ['action'],
  template: '<div class="menu" />',
};
const Properties = {
  name: 'ArticleEditorProperties',
  props: ['article'],
  emits: ['saveArticle', 'saveSlug', 'previewArticle', 'close'],
  template: '<div class="props" />',
};

const agents = () => [
  { id: 1, name: 'Zed', thumbnail: 'z.png' },
  { id: 2, name: 'Amy', thumbnail: 'a.png' },
  { id: 3, name: 'Bob', thumbnail: 'b.png' },
];
const categories = () => [
  { id: 10, name: 'Billing', slug: 'billing', icon: '💳', icon_color: 'red' },
  { id: 11, name: 'Setup', slug: 'setup' },
];

const mountControls = async (article = {}) => {
  const wrapper = mount(Controls, {
    props: { article },
    global: {
      stubs: {
        Button,
        DropdownMenu,
        ArticleEditorProperties: Properties,
        Avatar: {
          props: ['name', 'src'],
          template: '<i class="avatar" :data-src="src" />',
        },
        EmojiIcon: {
          props: ['value'],
          template: '<i class="emoji">{{ value }}</i>',
        },
      },
    },
  });
  await flushPromises();
  return wrapper;
};

const buttons = wrapper => wrapper.findAllComponents(Button);
const menus = wrapper => wrapper.findAllComponents(DropdownMenu);
const outside = wrapper => wrapper.findAll('.outside');

describe('ArticleEditorControls behaviour', () => {
  beforeEach(() => {
    env.route = { params: {} };
    env.getters = {
      'agents/getAgents': ref(agents()),
      'categories/allCategories': ref(categories()),
      getCurrentUserID: ref(1),
    };
  });

  it('defaults a new article to me and the first category', async () => {
    const wrapper = await mountControls();
    expect(buttons(wrapper)[0].text()).toBe('Zed');
    expect(wrapper.find('.avatar').attributes('data-src')).toBe('z.png');
    expect(buttons(wrapper)[1].text()).toContain('Billing');
    expect(wrapper.find('.emoji').text()).toBe('💳');
    expect(buttons(wrapper)[1].props('icon')).toBe('');
    expect(buttons(wrapper)[2].props('disabled')).toBe(true);
    expect(wrapper.emitted('setCategory')).toBeUndefined();
  });

  it('sorts the author menu with the selection first and picks an author', async () => {
    const wrapper = await mountControls();
    await buttons(wrapper)[0].trigger('click');
    expect(
      menus(wrapper)[0]
        .props('menuItems')
        .map(i => i.label)
    ).toEqual(['Zed', 'Amy', 'Bob']);
    expect(menus(wrapper)[0].props('menuItems')[0]).toEqual({
      label: 'Zed',
      value: 1,
      thumbnail: { name: 'Zed', src: 'z.png' },
      isSelected: true,
      action: 'assignAuthor',
    });
    menus(wrapper)[0].vm.$emit('action', { action: 'assignAuthor', value: 3 });
    await flushPromises();
    expect(wrapper.emitted('setAuthor')).toEqual([[3]]);
    expect(menus(wrapper)).toHaveLength(0);
    expect(buttons(wrapper)[0].text()).toBe('Bob');
    await buttons(wrapper)[0].trigger('click');
    expect(
      menus(wrapper)[0]
        .props('menuItems')
        .map(i => i.label)
    ).toEqual(['Bob', 'Amy', 'Zed']);
    // Unknown actions are ignored.
    menus(wrapper)[0].vm.$emit('action', { action: 'other', value: 1 });
    expect(menus(wrapper)).toHaveLength(1);
    outside(wrapper)[0].trigger('click');
    wrapper
      .findAllComponents({ name: 'OnClickOutside' })[0]
      .vm.$emit('trigger');
    await flushPromises();
    expect(menus(wrapper)).toHaveLength(0);
  });

  it('hides the author menu with a single agent and shows a dash without one', async () => {
    env.getters['agents/getAgents'].value = [{ id: 1, available_name: 'Solo' }];
    let wrapper = await mountControls();
    expect(buttons(wrapper)[0].text()).toBe('Solo');
    await buttons(wrapper)[0].trigger('click');
    expect(menus(wrapper)).toHaveLength(0);

    env.getters['agents/getAgents'].value = [];
    wrapper = await mountControls();
    expect(buttons(wrapper)[0].text()).toBe('-');
  });

  it('uses the category from the route and picks another one', async () => {
    env.route = { params: { categorySlug: 'setup' } };
    const wrapper = await mountControls();
    expect(wrapper.emitted('setCategory')).toEqual([[11]]);
    expect(buttons(wrapper)[1].text()).toContain('Setup');
    expect(buttons(wrapper)[1].props('icon')).toBe('i-lucide-shapes');
    await buttons(wrapper)[1].trigger('click');
    expect(
      menus(wrapper)[0]
        .props('menuItems')
        .map(i => i.label)
    ).toEqual(['Setup', 'Billing']);
    menus(wrapper)[0].vm.$emit('action', {
      action: 'assignCategory',
      value: 10,
    });
    await flushPromises();
    expect(wrapper.emitted('setCategory')).toEqual([[11], [10]]);
    expect(menus(wrapper)).toHaveLength(0);
    expect(buttons(wrapper)[1].text()).toContain('Billing');
    await buttons(wrapper)[1].trigger('click');
    wrapper
      .findAllComponents({ name: 'OnClickOutside' })[1]
      .vm.$emit('trigger');
    await flushPromises();
    expect(menus(wrapper)).toHaveLength(0);
  });

  it('falls back to the first category for an unknown route slug', async () => {
    env.route = { params: { categorySlug: 'gone' } };
    const wrapper = await mountControls();
    expect(wrapper.emitted('setCategory')).toBeUndefined();
    expect(buttons(wrapper)[1].text()).toContain('Billing');
  });

  it('shows uncategorized and no menu without categories', async () => {
    env.getters['categories/allCategories'].value = [];
    const wrapper = await mountControls();
    expect(buttons(wrapper)[1].text()).toContain(
      'HELP_CENTER.EDIT_ARTICLE_PAGE.EDIT_ARTICLE.UNCATEGORIZED'
    );
    await buttons(wrapper)[1].trigger('click');
    expect(menus(wrapper)).toHaveLength(0);
  });

  it('shows uncategorized when a picked category disappears', async () => {
    const wrapper = await mountControls();
    await buttons(wrapper)[1].trigger('click');
    menus(wrapper)[0].vm.$emit('action', {
      action: 'assignCategory',
      value: 11,
    });
    env.getters['categories/allCategories'].value = [categories()[0]];
    await flushPromises();
    expect(buttons(wrapper)[1].text()).toContain('UNCATEGORIZED');
  });

  it('saves author and category changes on an existing article', async () => {
    const wrapper = await mountControls({
      id: 5,
      author: { id: 2, name: 'Amy', thumbnail: 'a.png' },
      category: { id: 11 },
    });
    expect(buttons(wrapper)[0].text()).toBe('Amy');
    expect(buttons(wrapper)[1].text()).toContain('Setup');
    await buttons(wrapper)[0].trigger('click');
    expect(menus(wrapper)[0].props('menuItems')[0].label).toBe('Amy');
    menus(wrapper)[0].vm.$emit('action', { action: 'assignAuthor', value: 3 });
    expect(wrapper.emitted('saveArticle')).toEqual([[{ author_id: 3 }]]);
    expect(wrapper.emitted('setAuthor')).toBeUndefined();

    await buttons(wrapper)[1].trigger('click');
    expect(menus(wrapper)[0].props('menuItems')[0]).toMatchObject({
      label: 'Setup',
      isSelected: true,
    });
    menus(wrapper)[0].vm.$emit('action', {
      action: 'assignCategory',
      value: 10,
    });
    expect(wrapper.emitted('saveArticle')[1]).toEqual([{ category_id: 10 }]);
  });

  it('shows a dash for an existing article without an author', async () => {
    env.route = { params: { categorySlug: 'setup' } };
    const wrapper = await mountControls({ id: 5 });
    expect(buttons(wrapper)[0].text()).toBe('-');
    expect(wrapper.emitted('setCategory')).toBeUndefined();
    await buttons(wrapper)[0].trigger('click');
    // Without a saved author, the current user is marked as selected.
    expect(menus(wrapper)[0].props('menuItems')[0].label).toBe('Zed');
  });

  it('opens the properties panel and forwards its events', async () => {
    const wrapper = await mountControls({ id: 5, author: { id: 1 } });
    await buttons(wrapper)[2].trigger('click');
    const props = wrapper.findComponent(Properties);
    expect(props.props('article')).toEqual({ id: 5, author: { id: 1 } });
    props.vm.$emit('saveArticle', { title: 'SEO' });
    props.vm.$emit('saveSlug', 'new-slug');
    props.vm.$emit('previewArticle');
    expect(wrapper.emitted('saveArticle')).toEqual([
      [{ meta: { title: 'SEO' } }],
      [{ slug: 'new-slug' }],
    ]);
    expect(wrapper.emitted('previewArticle')).toHaveLength(1);
    props.vm.$emit('close');
    await flushPromises();
    expect(wrapper.findComponent(Properties).exists()).toBe(false);
    await buttons(wrapper)[2].trigger('click');
    wrapper
      .findAllComponents({ name: 'OnClickOutside' })[2]
      .vm.$emit('trigger');
    await flushPromises();
    expect(wrapper.findComponent(Properties).exists()).toBe(false);
  });

  it('uses an empty article by default', async () => {
    const wrapper = mount(Controls, {
      global: {
        stubs: { Button, DropdownMenu, Avatar: true, EmojiIcon: true },
      },
    });
    await flushPromises();
    expect(wrapper.findAllComponents(Button)[0].text()).toBe('Zed');
  });
});
