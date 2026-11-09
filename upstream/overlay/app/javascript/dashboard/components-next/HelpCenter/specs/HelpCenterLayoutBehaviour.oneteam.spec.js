/**
 * OneTeam behaviour spec for the help center layout.
 *
 * Covers the active portal name and breadcrumb, toggling and closing the
 * portal switcher, opening the create portal dialog, pagination, and
 * hiding the header and footer.
 */
import { mount } from '@vue/test-utils';
import { computed } from 'vue';
import HelpCenterLayout from '../HelpCenterLayout.vue';

const openDialog = vi.fn();
const env = vi.hoisted(() => ({ portals: [] }));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { portalSlug: 'docs' } }),
}));
vi.mock('dashboard/composables/store.js', () => ({
  useMapGetter: () => computed(() => env.portals),
}));
vi.mock('@vueuse/components', () => ({
  OnClickOutside: {
    name: 'OnClickOutside',
    emits: ['trigger'],
    template: '<div><slot /></div>',
  },
}));

/**
 * Mounts the layout.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountLayout = props =>
  mount(HelpCenterLayout, {
    props,
    slots: { content: '<p class="content" />' },
    global: {
      stubs: {
        Button: {
          props: ['variant'],
          emits: ['click'],
          template:
            '<button :data-variant="variant" @click="$emit(\'click\')" />',
        },
        PortalSwitcher: {
          name: 'PortalSwitcher',
          emits: ['close', 'createPortal'],
          template: '<div class="switcher" />',
        },
        CreatePortalDialog: {
          setup: () => ({ dialogRef: { open: openDialog } }),
          template: '<div />',
        },
        PaginationFooter: {
          name: 'PaginationFooter',
          emits: ['update:currentPage'],
          template: '<nav class="pages" />',
        },
      },
    },
  });

describe('HelpCenterLayout behaviour', () => {
  beforeEach(() => {
    env.portals = [{ slug: 'docs', name: 'Docs' }];
  });

  it('switches portals and pages', async () => {
    const wrapper = mountLayout({ breadcrumbLabel: 'Articles' });
    expect(wrapper.text()).toContain('Docs');
    expect(wrapper.text()).toContain('Articles');
    const toggle = wrapper.find('button');
    expect(toggle.attributes('data-variant')).toBe('ghost');
    await toggle.trigger('click');
    expect(toggle.attributes('data-variant')).toBe('faded');
    const switcher = wrapper.findComponent({ name: 'PortalSwitcher' });
    switcher.vm.$emit('createPortal');
    expect(openDialog).toHaveBeenCalled();
    switcher.vm.$emit('close');
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.switcher').exists()).toBe(false);
    await toggle.trigger('click');
    wrapper.findComponent({ name: 'OnClickOutside' }).vm.$emit('trigger');
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.switcher').exists()).toBe(false);
    wrapper
      .findComponent({ name: 'PaginationFooter' })
      .vm.$emit('update:currentPage', 2);
    expect(wrapper.emitted('update:currentPage')).toEqual([[2]]);
  });

  it('omits the portal nav without an active portal', () => {
    env.portals = [{ slug: 'blog', name: 'Blog' }];
    const wrapper = mountLayout({ breadcrumbLabel: 'Articles' });
    expect(wrapper.find('nav.flex').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Articles');
  });

  it('shows the portal without a breadcrumb', () => {
    const wrapper = mountLayout();
    expect(wrapper.text()).toContain('Docs');
    expect(wrapper.find('.bg-n-weak').exists()).toBe(false);
  });

  it('hides the header and footer', () => {
    const wrapper = mountLayout({
      showHeaderTitle: false,
      showPaginationFooter: false,
    });
    expect(wrapper.find('button').exists()).toBe(false);
    expect(wrapper.find('.pages').exists()).toBe(false);
    expect(wrapper.find('.content').exists()).toBe(true);
  });
});
