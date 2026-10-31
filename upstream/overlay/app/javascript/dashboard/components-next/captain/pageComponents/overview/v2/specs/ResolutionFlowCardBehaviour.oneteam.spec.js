/**
 * OneTeam behaviour spec for the Captain overview resolution flow card.
 *
 * Covers loading skeletons, empty states, building the Sankey data (only
 * connected nodes, labels and colours for flow and reason nodes), taking
 * the aggregate "Other reasons" node out of keyboard navigation, drilling
 * down from nodes, links and the hand-off reason list, and the read-only
 * list without drilldown.
 */
import { h } from 'vue';
import { mount } from '@vue/test-utils';
import ResolutionFlowCard from '../ResolutionFlowCard.vue';

vi.mock('@chatwoot/viz', () => ({
  SankeyChart: {
    name: 'SankeyChart',
    props: ['data', 'onItemClick', 'formatValue'],
    setup(props) {
      return () =>
        h('svg', { class: 'sankey' }, [
          ...props.data.nodes.map(node =>
            h('g', {
              'data-node-id': node.id,
              tabindex: 0,
              role: 'button',
              class: 'cw-viz-sankey__node-group--clickable',
            })
          ),
          ...props.data.links.map(link =>
            h(
              'g',
              {
                class:
                  'cw-viz-sankey__link-group cw-viz-sankey__link-group--clickable',
                tabindex: 0,
              },
              [h('path', { 'data-target': link.target })]
            )
          ),
        ]);
    },
  },
}));

const flow = {
  sankey: {
    nodes: [
      { id: 'conversations_handled' },
      { id: 'resolved_by_captain' },
      { id: 'handed_off' },
      { id: 'handoff_reason_missing_knowledge' },
      { id: 'handoff_reason_brand_new' },
      { id: 'other_reasons' },
      { id: 'mystery' },
      { id: 'stayed_closed' },
    ],
    links: [
      {
        source: 'conversations_handled',
        target: 'resolved_by_captain',
        value: 80,
      },
      { source: 'conversations_handled', target: 'handed_off', value: 20 },
      {
        source: 'handed_off',
        target: 'handoff_reason_missing_knowledge',
        value: 12,
      },
      { source: 'handed_off', target: 'handoff_reason_brand_new', value: 3 },
      { source: 'handed_off', target: 'other_reasons', value: 5 },
      { source: 'handed_off', target: 'mystery', value: 1 },
      { source: 'resolved_by_captain', target: 'stayed_closed', value: 0 },
    ],
  },
  handoff_distribution: [
    { category: 'missing_knowledge', count: 1200, percentage: 60 },
    { category: 'brand_new', count: 3, percentage: 1 },
  ],
};

const mountCard = props =>
  mount(ResolutionFlowCard, {
    props,
    global: { stubs: { OverviewPanel: { template: '<div><slot /></div>' } } },
  });
const chart = wrapper => wrapper.findComponent({ name: 'SankeyChart' });

describe('ResolutionFlowCard behaviour', () => {
  it('shows skeletons while loading and empty states without data', () => {
    expect(mountCard({ loading: true }).findAll('.animate-pulse')).toHaveLength(
      7
    );
    const empty = mountCard({
      flow: { sankey: { nodes: [{ id: 'x' }], links: [] } },
    });
    expect(empty.findAll('p, .grid').map(n => n.text())).toEqual([
      'CAPTAIN.OVERVIEW.V2.EMPTY',
      'CAPTAIN.OVERVIEW.V2.EMPTY',
    ]);
    expect(mountCard().text()).toContain('CAPTAIN.OVERVIEW.V2.EMPTY');
  });

  it('builds labelled, coloured nodes for connected items only', () => {
    const wrapper = mountCard({ flow });
    const { nodes, links } = chart(wrapper).props('data');
    expect(links).toHaveLength(6);
    expect(nodes.map(n => n.id)).not.toContain('stayed_closed');
    const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
    expect(byId.conversations_handled).toMatchObject({
      label: 'CAPTAIN.OVERVIEW.V2.RESOLUTION_FLOW.NODES.HANDLED',
      color: 'rgb(var(--iris-9))',
    });
    expect(byId.handed_off.color).toBe('rgb(var(--amber-9))');
    expect(byId.handoff_reason_missing_knowledge.label).toBe(
      'CAPTAIN.OVERVIEW.V2.HANDOFF_REASONS.MISSING_KNOWLEDGE'
    );
    expect(byId.handoff_reason_brand_new.label).toBe(
      'CAPTAIN.OVERVIEW.V2.HANDOFF_REASONS.UNCLASSIFIED'
    );
    expect(byId.mystery.label).toBe(
      'CAPTAIN.OVERVIEW.V2.RESOLUTION_FLOW.NODES.OTHER_REASONS'
    );
    expect(chart(wrapper).props('onItemClick')).toBeUndefined();
    expect(chart(wrapper).props('formatValue')(1200)).toBe(
      (1200).toLocaleString()
    );
  });

  it('takes the "Other reasons" node out of keyboard navigation', async () => {
    const wrapper = mountCard({ flow, canDrilldown: true });
    const other = wrapper.find('[data-node-id="other_reasons"]');
    expect(other.attributes('tabindex')).toBeUndefined();
    expect(other.attributes('role')).toBeUndefined();
    expect(other.classes()).not.toContain(
      'cw-viz-sankey__node-group--clickable'
    );
    expect(
      wrapper.find('[data-node-id="handed_off"]').attributes('tabindex')
    ).toBe('0');
    await wrapper.setProps({ loading: false, flow: { ...flow } });
    expect(
      wrapper.find('[data-node-id="other_reasons"]').attributes('tabindex')
    ).toBeUndefined();
  });

  it('drills down from nodes and links', () => {
    const wrapper = mountCard({ flow, canDrilldown: true });
    const click = chart(wrapper).props('onItemClick');
    click({ itemType: 'node', id: 'resolved_by_captain', value: 80 });
    click({
      itemType: 'link',
      targetId: 'handoff_reason_missing_knowledge',
      value: 12,
    });
    click({ itemType: 'node', id: 'other_reasons', value: 5 });
    expect(wrapper.emitted('drilldown')).toEqual([
      [
        {
          key: 'auto_resolution_rate',
          label:
            'CAPTAIN.OVERVIEW.V2.RESOLUTION_FLOW.NODES.RESOLVED_BY_CAPTAIN',
          value: '80',
        },
      ],
      [
        {
          key: 'handoff_reason',
          reason: 'missing_knowledge',
          label: 'CAPTAIN.OVERVIEW.V2.HANDOFF_REASONS.MISSING_KNOWLEDGE',
          value: '12',
        },
      ],
    ]);
  });

  it('lists hand-off reasons as buttons only when drilldown is allowed', async () => {
    const readOnly = mountCard({ flow });
    expect(readOnly.findAll('button')).toHaveLength(0);
    expect(readOnly.text()).toContain((1200).toLocaleString());
    expect(readOnly.text()).toContain(
      'CAPTAIN.OVERVIEW.V2.HANDOFF_REASONS.PERCENTAGE'
    );
    await readOnly.find('.text-start').trigger('click');
    expect(readOnly.emitted('drilldown')).toBeUndefined();

    const wrapper = mountCard({ flow, canDrilldown: true });
    await wrapper.findAll('button')[1].trigger('click');
    expect(wrapper.emitted('drilldown')).toEqual([
      [
        {
          key: 'handoff_reason',
          reason: 'brand_new',
          label: 'CAPTAIN.OVERVIEW.V2.HANDOFF_REASONS.UNCLASSIFIED',
          value: '3',
        },
      ],
    ]);
  });
});
