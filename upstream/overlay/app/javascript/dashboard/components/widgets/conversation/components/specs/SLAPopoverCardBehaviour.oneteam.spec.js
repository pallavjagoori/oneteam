/**
 * OneTeam behaviour spec for the SLA missed-events popover.
 *
 * Covers grouping misses into first response, next response and
 * resolution sections, skipping empty sections, capping next-response
 * misses at six, and the show more / hide toggle.
 *
 * Note: upstream slices next-response misses to six before checking
 * for "more than six", so the show-more button only appears once the
 * list is expanded; the toggle is driven through the component here.
 */
import { mount } from '@vue/test-utils';
import SLAPopoverCard from '../SLAPopoverCard.vue';

const SLAEventItem = {
  name: 'SLAEventItem',
  props: ['label', 'items'],
  template: '<div class="section"><slot name="showMore" /></div>',
};
const Button = {
  name: 'NextButton',
  props: ['label', 'icon'],
  emits: ['click'],
  template: '<button class="more" />',
};

const misses = (type, n) =>
  Array.from({ length: n }, (_, i) => ({
    id: `${type}${i}`,
    event_type: type,
  }));

/**
 * Mounts the popover with the given missed events.
 *
 * @param {Array} events SLA missed events.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountCard = events =>
  mount(SLAPopoverCard, {
    props: { slaMissedEvents: events },
    global: {
      stubs: { SLAEventItem, Button },
      mocks: { $t: (key, args) => (args ? `${key}:${args.count}` : key) },
    },
  });

describe('SLAPopoverCard behaviour', () => {
  it('groups misses by type and caps next responses at six', () => {
    const wrapper = mountCard([
      ...misses('frt', 1),
      ...misses('nrt', 8),
      ...misses('rt', 2),
    ]);
    const sections = wrapper.findAllComponents(SLAEventItem);
    expect(
      sections.map(s => [s.props('label'), s.props('items').length])
    ).toEqual([
      ['SLA.EVENTS.FRT', 1],
      ['SLA.EVENTS.NRT', 6],
      ['SLA.EVENTS.RT', 2],
    ]);
    expect(wrapper.findComponent(Button).exists()).toBe(false);
  });

  it('skips empty sections', () => {
    const wrapper = mountCard(misses('rt', 1));
    expect(wrapper.findAllComponents(SLAEventItem)).toHaveLength(1);
  });

  it('expands and collapses next-response misses', async () => {
    const wrapper = mountCard(misses('nrt', 8));
    wrapper.vm.$.setupState.toggleShowAllNRT();
    await wrapper.vm.$nextTick();
    const button = wrapper.getComponent(Button);
    expect(button.props()).toEqual({ label: 'SLA.EVENTS.HIDE:8', icon: '' });
    expect(wrapper.getComponent(SLAEventItem).props('items')).toHaveLength(8);
    button.vm.$emit('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(Button).exists()).toBe(false);
  });
});
