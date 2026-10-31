/**
 * OneTeam behaviour spec for the help-center article card.
 *
 * Covers status labels and colours, pending-edit badges, author and
 * category fallbacks, the actions menu per status (with translate only
 * on enterprise accounts with Captain tasks, and discard-draft for
 * pending edits), routing un-publish actions through the pending-changes
 * popover, other actions, opening, selecting, hovering and the popover
 * results.
 */
import { reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import ArticleCard from '../ArticleCard.vue';

const env = vi.hoisted(() => ({}));

vi.mock('@vueuse/core', async importOriginal => {
  const { ref: appRef } = await import('vue');
  return {
    ...(await importOriginal()),
    useToggle: () => {
      const state = appRef(false);
      return [
        state,
        value => {
          state.value = typeof value === 'boolean' ? value : !state.value;
        },
      ];
    },
  };
});
vi.mock('dashboard/composables/store.js', async () => {
  const { computed } = await import('vue');
  return { useMapGetter: name => computed(() => env.getters[name]) };
});
vi.mock('dashboard/composables/useConfig', () => ({
  useConfig: () => ({ isEnterprise: env.enterprise }),
}));
vi.mock('shared/helpers/timeHelper', () => ({
  dynamicTime: () => '2 days ago',
}));
vi.mock('shared/composables/useExactTimestamp', () => ({
  useExactTimestamp: () => ts => `exact-${ts}`,
}));

const Menu = {
  name: 'DropdownMenu',
  props: ['menuItems'],
  emits: ['action'],
  template: '<ul class="menu" />',
};
const Popover = {
  name: 'ArticlePendingChangesPopover',
  props: ['articleId'],
  emits: ['resolved', 'failed'],
  methods: { open: status => env.popoverOpen(status) },
  template: '<div />',
};
const NextButton = {
  name: 'Button',
  props: ['icon'],
  template: '<button class="menu-toggle" />',
};
const Checkbox = {
  name: 'Checkbox',
  props: ['modelValue'],
  emits: ['change'],
  template: '<input type="checkbox" />',
};

const mountCard = (props = {}) =>
  mount(ArticleCard, {
    props: {
      id: 7,
      title: 'How to',
      status: 'published',
      category: { slug: 'faq', name: 'FAQ', icon: '📘' },
      views: 3,
      updatedAt: 100,
      ...props,
    },
    global: {
      stubs: {
        DropdownMenu: Menu,
        ArticlePendingChangesPopover: Popover,
        Button: NextButton,
        Checkbox,
        CardLayout: { template: '<div class="card"><slot /></div>' },
        Avatar: true,
        Icon: true,
        EmojiIcon: true,
      },
      directives: {
        tooltip: {},
        onClickaway: {
          mounted: (el, { value }) => {
            env.outside = value;
          },
        },
      },
    },
  });

const openMenu = async wrapper => {
  await wrapper.find('.menu-toggle').trigger('click');
  return wrapper.findComponent(Menu);
};
const actions = async wrapper =>
  (await openMenu(wrapper)).props('menuItems').map(item => item.action);

describe('ArticleCard behaviour', () => {
  beforeEach(() => {
    env.enterprise = true;
    env.getters = reactive({
      getCurrentAccountId: 1,
      'accounts/isFeatureEnabledonAccount': () => true,
    });
    env.popoverOpen = vi.fn();
  });

  it('shows status, author and category details', () => {
    let wrapper = mountCard({ author: { name: 'Ana', thumbnail: 'a.png' } });
    expect(wrapper.text()).toContain(
      'HELP_CENTER.ARTICLES_PAGE.ARTICLE_CARD.CARD.STATUS.PUBLISHED'
    );
    expect(wrapper.find('.text-n-teal-11').exists()).toBe(true);
    expect(wrapper.text()).toContain('Ana');
    expect(wrapper.text()).toContain('FAQ');
    expect(wrapper.text()).toContain('2 days ago');
    expect(wrapper.find('emoji-icon-stub').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('PENDING_EDITS');

    wrapper = mountCard({
      status: 'draft',
      author: { availableName: 'Bo' },
      category: {},
      hasPendingChanges: true,
    });
    expect(wrapper.find('.text-n-amber-11').exists()).toBe(true);
    expect(wrapper.text()).toContain('STATUS.DRAFT');
    expect(wrapper.text()).toContain('Bo');
    expect(wrapper.text()).toContain('CATEGORY.UNCATEGORISED');
    expect(wrapper.text()).toContain('CARD.PENDING_EDITS');
    expect(wrapper.find('emoji-icon-stub').exists()).toBe(false);

    wrapper = mountCard({ status: 'archived', category: null });
    expect(wrapper.find('.text-n-slate-12.rounded-md').exists()).toBe(true);
    expect(wrapper.text()).toContain('STATUS.ARCHIVED');
    expect(wrapper.text()).toContain('-');
    expect(mountCard({ author: {} }).text()).toContain('-');
  });

  it('builds the actions menu for each status', async () => {
    expect(await actions(mountCard())).toEqual([
      'draft',
      'archive',
      'translate',
      'delete',
    ]);
    expect(
      await actions(mountCard({ status: 'draft', hasPendingChanges: true }))
    ).toEqual(['publish', 'archive', 'translate', 'discard-draft', 'delete']);
    expect(await actions(mountCard({ status: 'archived' }))).toEqual([
      'publish',
      'draft',
      'translate',
      'delete',
    ]);
    expect(await actions(mountCard({ status: 'unknown' }))).toEqual([
      'draft',
      'archive',
      'translate',
      'delete',
    ]);
    env.getters['accounts/isFeatureEnabledonAccount'] = () => false;
    expect(await actions(mountCard())).toEqual(['draft', 'archive', 'delete']);
    env.enterprise = false;
    expect(await actions(mountCard())).toEqual(['draft', 'archive', 'delete']);
  });

  it('opens and closes the menu', async () => {
    const wrapper = mountCard();
    await openMenu(wrapper);
    expect(wrapper.findComponent(Menu).exists()).toBe(true);
    env.outside();
    await flushPromises();
    expect(wrapper.findComponent(Menu).exists()).toBe(false);
  });

  it('routes un-publishing with pending edits through the popover', async () => {
    const wrapper = mountCard({ hasPendingChanges: true });
    let menu = await openMenu(wrapper);
    await menu.vm.$emit('action', { action: 'draft', value: 'draft' });
    expect(env.popoverOpen).toHaveBeenCalledWith(0);
    expect(wrapper.findComponent(Menu).exists()).toBe(false);
    menu = await openMenu(wrapper);
    await menu.vm.$emit('action', { action: 'archive', value: 'archived' });
    expect(env.popoverOpen).toHaveBeenCalledWith(2);
    menu = await openMenu(wrapper);
    await menu.vm.$emit('action', { action: 'delete', value: 'delete' });
    expect(wrapper.emitted('articleAction')).toEqual([
      [{ action: 'delete', value: 'delete', id: 7 }],
    ]);

    await wrapper.findComponent(Popover).vm.$emit('resolved', { id: 7 });
    await wrapper.findComponent(Popover).vm.$emit('failed', 'oops');
    expect(wrapper.emitted('draftResolved')).toEqual([[{ id: 7 }]]);
    expect(wrapper.emitted('draftFailed')).toEqual([['oops']]);
  });

  it('emits status actions directly without pending edits', async () => {
    const wrapper = mountCard();
    const menu = await openMenu(wrapper);
    await menu.vm.$emit('action', { action: 'archive', value: 'archived' });
    expect(env.popoverOpen).not.toHaveBeenCalled();
    expect(wrapper.emitted('articleAction')).toEqual([
      [{ action: 'archive', value: 'archived', id: 7 }],
    ]);
  });

  it('opens, selects and reports hover', async () => {
    const wrapper = mountCard({ showSelectionControl: true });
    await wrapper.find('.cursor-pointer').trigger('click');
    expect(wrapper.emitted('openArticle')).toEqual([[7]]);
    await wrapper.findComponent(Checkbox).vm.$emit('change');
    expect(wrapper.emitted('toggleSelect')).toEqual([[7]]);
    await wrapper.find('.card').trigger('mouseenter');
    await wrapper.find('.card').trigger('mouseleave');
    expect(wrapper.emitted('hover')).toEqual([[true], [false]]);
  });
});
