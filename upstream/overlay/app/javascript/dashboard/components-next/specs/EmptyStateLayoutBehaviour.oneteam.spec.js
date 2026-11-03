/**
 * OneTeam behaviour spec for the shared empty state layout.
 *
 * Covers the backdrop of sample items, the title and optional subtitle,
 * and permission-gated actions.
 */
import { mount } from '@vue/test-utils';
import EmptyStateLayout from '../EmptyStateLayout.vue';

const Policy = {
  name: 'Policy',
  props: ['permissions'],
  template: '<div class="policy"><slot /></div>',
};

/**
 * Mounts the layout with sample slots.
 *
 * @param {object} props Layout props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountLayout = props =>
  mount(EmptyStateLayout, {
    props: { title: 'No contacts', subtitle: 'Add one', ...props },
    slots: {
      'empty-state-item': '<p class="sample">Sample</p>',
      actions: '<button>Add</button>',
    },
    global: { stubs: { Policy } },
  });

describe('EmptyStateLayout behaviour', () => {
  it('shows the backdrop, title, subtitle and gated actions', () => {
    const wrapper = mountLayout({ actionPerms: ['administrator'] });
    expect(wrapper.find('.sample').exists()).toBe(true);
    expect(wrapper.get('h2').text()).toBe('No contacts');
    expect(wrapper.get('p.max-w-xl').text()).toBe('Add one');
    expect(wrapper.getComponent(Policy).props('permissions')).toEqual([
      'administrator',
    ]);
    expect(wrapper.get('.policy button').text()).toBe('Add');
    expect(wrapper.find('.mt-48').exists()).toBe(false);
  });

  it('drops the backdrop and an empty subtitle', () => {
    const wrapper = mountLayout({ subtitle: '', showBackdrop: false });
    expect(wrapper.find('.sample').exists()).toBe(false);
    expect(wrapper.find('p.max-w-xl').exists()).toBe(false);
    expect(wrapper.find('.mt-48').exists()).toBe(true);
    expect(wrapper.getComponent(Policy).props('permissions')).toEqual([]);
  });
});
