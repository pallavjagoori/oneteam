/**
 * OneTeam behaviour spec for the draggable help center category grid.
 *
 * Covers the card details (article count defaulting to zero), opening a
 * category, forwarding card actions with the category, dragging only
 * when allowed and there is more than one category, and the reorder
 * payload that hands the existing positions (or index-based ones when
 * missing) to the categories in their new order. It also follows
 * category updates from the parent.
 */
import { mount } from '@vue/test-utils';
import CategoryList from '../CategoryList.vue';

vi.mock('vuedraggable', () => ({
  default: {
    name: 'Draggable',
    props: ['modelValue', 'disabled', 'itemKey'],
    emits: ['update:modelValue', 'end'],
    template:
      '<ul><template v-for="element in modelValue" :key="element.id"><slot name="item" :element="element" /></template></ul>',
  },
}));

const CategoryCard = {
  name: 'CategoryCard',
  props: ['id', 'title', 'articlesCount', 'slug', 'iconColor'],
  emits: ['click', 'action'],
  template: '<div class="card">{{ title }}</div>',
};

const categories = [
  {
    id: 1,
    name: 'Billing',
    slug: 'billing',
    position: 3,
    meta: { articles_count: 4 },
  },
  { id: 2, name: 'Setup', slug: 'setup', position: 5 },
  { id: 3, name: 'Help', slug: 'help', position: null },
];

const mountList = props =>
  mount(CategoryList, {
    props: { categories, ...props },
    global: { stubs: { CategoryCard } },
  });

const draggable = wrapper => wrapper.findComponent({ name: 'Draggable' });

describe('CategoryList behaviour', () => {
  it('shows cards and forwards clicks and actions', async () => {
    const wrapper = mountList();
    const cards = wrapper.findAllComponents(CategoryCard);
    expect(cards.map(c => c.props('articlesCount'))).toEqual([4, 0, 0]);
    expect(cards[0].classes()).toContain('cursor-grab');
    expect(draggable(wrapper).props('disabled')).toBe(false);

    await cards[1].vm.$emit('click');
    expect(wrapper.emitted('click')[0]).toEqual(['setup']);
    await cards[0].vm.$emit('action', {
      action: 'delete',
      value: 'delete',
      id: 1,
    });
    expect(wrapper.emitted('action')[0][0]).toEqual({
      action: 'delete',
      value: 'delete',
      id: 1,
      category: categories[0],
    });
  });

  it('reorders using the existing positions', async () => {
    const wrapper = mountList();
    await draggable(wrapper).vm.$emit('update:modelValue', [
      categories[2],
      categories[0],
      categories[1],
    ]);
    await draggable(wrapper).vm.$emit('end');
    // Positions 1 (index fallback for Help), 3 and 5, sorted, in the new order.
    expect(wrapper.emitted('reorder')[0][0]).toEqual({ 3: 1, 1: 3, 2: 5 });
  });

  it('turns dragging off when disabled or with one category', async () => {
    const disabled = mountList({ disableDrag: true });
    expect(draggable(disabled).props('disabled')).toBe(true);
    expect(disabled.findComponent(CategoryCard).classes()).not.toContain(
      'cursor-grab'
    );

    const single = mountList({ categories: [categories[0]] });
    expect(draggable(single).props('disabled')).toBe(true);
    await single.setProps({ categories: categories.slice(0, 2) });
    expect(draggable(single).props('disabled')).toBe(false);
    expect(single.findAllComponents(CategoryCard)).toHaveLength(2);
  });
});
