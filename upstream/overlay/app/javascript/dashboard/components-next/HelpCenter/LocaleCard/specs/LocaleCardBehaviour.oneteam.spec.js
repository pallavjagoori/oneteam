/**
 * OneTeam behaviour spec for a help center locale card.
 *
 * Covers the label with code, default and draft badges, article and
 * category counts, the labelled actions menu for each locale state,
 * choosing an action and closing the menu (also on an outside click),
 * and hiding the menu when there are no actions.
 */
import { mount } from '@vue/test-utils';
import LocaleCard from '../LocaleCard.vue';

const env = vi.hoisted(() => ({ empty: false }));
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
    useNow: () => appRef(new Date(2026, 10, 18, 12)),
  };
});
vi.mock('dashboard/helper/portalHelper', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...actual,
    buildLocaleMenuItems: args =>
      env.empty ? [] : actual.buildLocaleMenuItems(args),
  };
});

const DropdownMenu = {
  name: 'DropdownMenu',
  props: ['menuItems'],
  emits: ['action'],
  template: '<ul />',
};
const mountCard = props =>
  mount(LocaleCard, {
    props: {
      locale: 'English',
      localeCode: 'en',
      isDefault: false,
      isDraft: false,
      articleCount: 4,
      categoryCount: 2,
      ...props,
    },
    global: {
      stubs: {
        DropdownMenu,
        CardLayout: { template: '<section><slot /></section>' },
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
const labels = async wrapper => {
  await wrapper.find('button').trigger('click');
  return wrapper
    .findComponent(DropdownMenu)
    .props('menuItems')
    .map(item => item.label.split('.').pop());
};

describe('LocaleCard behaviour', () => {
  beforeEach(() => {
    env.empty = false;
  });

  it('shows the default locale and its menu', async () => {
    const wrapper = mountCard({ isDefault: true });
    expect(wrapper.text()).toContain('English (en)');
    expect(wrapper.text()).toContain('LOCALE_CARD.DEFAULT');
    expect(wrapper.text()).toContain('LOCALE_CARD.ARTICLES_COUNT');
    expect(await labels(wrapper)).toEqual([
      'MAKE_DEFAULT',
      'MOVE_TO_DRAFT',
      'CUSTOMIZE_CONTENT',
      'SELECT_POPULAR_CONTENT',
      'DELETE',
    ]);
    await wrapper
      .findComponent(DropdownMenu)
      .vm.$emit('action', { action: 'customize-content', value: 'x' });
    expect(wrapper.emitted('action')).toEqual([
      [{ action: 'customize-content', value: 'x' }],
    ]);
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);
  });

  it('shows draft and published locales and closes outside', async () => {
    const draft = mountCard({ isDraft: true });
    expect(draft.text()).toContain('LOCALE_CARD.DRAFT');
    expect((await labels(draft))[0]).toBe('PUBLISH_LOCALE');
    outside();
    await draft.vm.$nextTick();
    expect(draft.findComponent(DropdownMenu).exists()).toBe(false);

    const live = mountCard();
    expect(live.text()).not.toContain('LOCALE_CARD.D');
    expect(await labels(live)).toHaveLength(5);
  });

  it('hides the menu without actions', () => {
    env.empty = true;
    expect(mountCard().find('button').exists()).toBe(false);
  });
});
