/**
 * OneTeam behaviour spec for the sidebar changelog button.
 *
 * Covers hiding the button while the changelog loads or has no posts,
 * toggling the changelog card, and closing it on an outside click.
 */
import { mount } from '@vue/test-utils';
import SidebarChangelogButton from '../SidebarChangelogButton.vue';

const env = vi.hoisted(() => ({ outside: null }));

vi.mock('@vueuse/core', async importOriginal => {
  const { ref } = await import('vue');
  return {
    ...(await importOriginal()),
    useToggle: initial => {
      const value = ref(initial);
      const toggle = next => {
        value.value = typeof next === 'boolean' ? next : !value.value;
      };
      return [value, toggle];
    },
  };
});
vi.mock('@vueuse/components', () => ({
  vOnClickOutside: (el, binding) => {
    env.outside = binding.value;
  },
}));

const Button = {
  name: 'NextButton',
  emits: ['click'],
  template: '<button class="toggle" @click="$emit(\'click\')" />',
};

/**
 * Builds a changelog card stub with the given exposed state.
 *
 * @param {boolean} isLoading Whether posts are loading.
 * @param {Array} unDismissedPosts Posts still to show.
 * @returns {object} The stub component.
 */
const cardStub = (isLoading, unDismissedPosts) => ({
  name: 'SidebarChangelogCard',
  data: () => ({ isLoading, unDismissedPosts }),
  template: '<div class="card" />',
});

/**
 * Mounts the button with a card stub.
 *
 * @param {object} card Card stub.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountButton = card =>
  mount(SidebarChangelogButton, {
    attachTo: document.body,
    global: { stubs: { Button, SidebarChangelogCard: card } },
  });

describe('SidebarChangelogButton behaviour', () => {
  it('toggles the card and closes it on an outside click', async () => {
    const wrapper = mountButton(cardStub(false, [{ id: 1 }]));
    await wrapper.vm.$nextTick();
    const panel = wrapper.get('.absolute');
    expect(panel.isVisible()).toBe(false);
    await wrapper.get('.toggle').trigger('click');
    expect(panel.isVisible()).toBe(true);
    expect(wrapper.get('.toggle').classes()).toContain('!bg-n-alpha-2');
    env.outside();
    await wrapper.vm.$nextTick();
    expect(panel.isVisible()).toBe(false);
    env.outside();
    await wrapper.vm.$nextTick();
    expect(panel.isVisible()).toBe(false);
    wrapper.unmount();
  });

  it.each([
    ['loading', cardStub(true, [{ id: 1 }])],
    ['empty', cardStub(false, [])],
  ])('hides the button while %s', async (_, card) => {
    const wrapper = mountButton(card);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.toggle').exists()).toBe(false);
    wrapper.unmount();
  });
});
