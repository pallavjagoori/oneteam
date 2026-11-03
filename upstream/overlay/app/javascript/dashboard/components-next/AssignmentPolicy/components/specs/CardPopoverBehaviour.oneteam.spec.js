/**
 * OneTeam behaviour spec for the assignment policy CardPopover.
 *
 * Covers hiding without a count, fetching and toggling, the loading
 * spinner, item rows with icons or avatars, and closing on outside click.
 */
import { mount } from '@vue/test-utils';
import CardPopover from '../CardPopover.vue';

const outside = vi.hoisted(() => ({ handler: null }));

vi.mock('@vueuse/components', () => ({
  vOnClickOutside: {
    mounted: (el, binding) => {
      outside.handler = binding.value;
    },
  },
}));

vi.mock('@vueuse/core', async importOriginal => {
  const { ref: vueRef } = await import('vue');
  return {
    ...(await importOriginal()),
    useToggle: () => {
      const state = vueRef(false);
      return [
        state,
        value => {
          state.value = value;
        },
      ];
    },
  };
});

/**
 * Mounts the popover.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountPopover = props =>
  mount(CardPopover, {
    props: { count: 2, title: 'Inboxes', icon: 'i-lucide-inbox', ...props },
    global: {
      stubs: {
        Icon: { props: ['icon'], template: '<i :class="icon" />' },
        Avatar: { template: '<span class="avatar" />' },
        Spinner: { template: '<i class="spinner" />' },
      },
    },
  });

describe('CardPopover behaviour', () => {
  it('renders no button without a count', () => {
    expect(mountPopover({ count: 0 }).find('button').exists()).toBe(false);
  });

  it('fetches, shows the spinner and closes on outside click', async () => {
    const wrapper = mountPopover({ isFetching: true });
    outside.handler();
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('fetch')).toHaveLength(1);
    expect(wrapper.find('.spinner').exists()).toBe(true);
    outside.handler();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).not.toContain('Inboxes');
  });

  it('lists items with icons or avatars, ids and emails', async () => {
    const wrapper = mountPopover({
      items: [
        { id: 1, name: 'Email', icon: 'i-lucide-mail' },
        { name: 'Jane', email: 'jane@x.co', avatarUrl: '/j.png' },
      ],
    });
    await wrapper.find('button').trigger('click');
    expect(wrapper.find('.i-lucide-mail').exists()).toBe(true);
    expect(wrapper.find('.avatar').exists()).toBe(true);
    expect(wrapper.text()).toContain('#1');
    expect(wrapper.text()).toContain('jane@x.co');
    await wrapper.find('button').trigger('click');
    expect(wrapper.text()).not.toContain('Jane');
  });
});
