/**
 * OneTeam behaviour spec for a help center category card.
 *
 * Covers the title, icon (or none), article count and description (with
 * the "no description" fallback), opening the category by slug, and the
 * edit/delete actions menu including closing on an outside click.
 */
import { mount } from '@vue/test-utils';
import CategoryCard from '../CategoryCard.vue';

let outside;
vi.mock('@vueuse/core', async importOriginal => {
  const { ref: appRef } = await import('vue');
  return {
    ...(await importOriginal()),
    useToggle: () => {
      const state = appRef(false);
      const toggle = value => {
        state.value = typeof value === 'boolean' ? value : !state.value;
      };
      return [state, toggle];
    },
  };
});

const DropdownMenu = {
  name: 'DropdownMenu',
  props: ['menuItems'],
  emits: ['action'],
  template: '<ul />',
};

const mountCard = props =>
  mount(CategoryCard, {
    props: {
      id: 2,
      title: 'Billing',
      icon: '',
      description: '',
      articlesCount: 3,
      slug: 'billing',
      ...props,
    },
    global: {
      stubs: {
        DropdownMenu,
        CardLayout: { template: '<section><slot /></section>' },
        EmojiIcon: { props: ['value'], template: '<em>{{ value }}</em>' },
        Button: {
          emits: ['click'],
          template: '<button @click="$emit(\'click\')" />',
        },
      },
      directives: {
        onClickaway: {
          mounted: (el, binding) => {
            outside = binding.value;
          },
        },
      },
    },
  });

describe('CategoryCard behaviour', () => {
  it('shows details, opens the category and runs actions', async () => {
    const wrapper = mountCard({ icon: '💳', description: 'Payments' });
    expect(wrapper.find('em').text()).toBe('💳');
    expect(wrapper.text()).toContain('Billing');
    expect(wrapper.text()).toContain(
      'HELP_CENTER.CATEGORY_PAGE.CATEGORY_CARD.ARTICLES_COUNT'
    );
    const description = wrapper.find('.line-clamp-3');
    expect(description.text()).toBe('Payments');
    expect(description.classes()).toContain('text-n-slate-11');

    await wrapper.find('.cursor-pointer').trigger('click');
    expect(wrapper.emitted('click')).toEqual([['billing']]);

    await wrapper.find('button').trigger('click');
    const menu = wrapper.findComponent(DropdownMenu);
    expect(menu.props('menuItems').map(item => item.action)).toEqual([
      'edit',
      'delete',
    ]);
    await menu.vm.$emit('action', { action: 'edit', value: 'edit' });
    expect(wrapper.emitted('action')).toEqual([
      [{ action: 'edit', value: 'edit', id: 2 }],
    ]);
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);
  });

  it('falls back without an icon or description and closes outside', async () => {
    const wrapper = mountCard();
    expect(wrapper.find('em').exists()).toBe(false);
    const description = wrapper.find('.line-clamp-3');
    expect(description.text()).toBe('No description added');
    expect(description.classes()).toContain('text-n-slate-9');
    await wrapper.find('button').trigger('click');
    outside();
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);
  });
});
