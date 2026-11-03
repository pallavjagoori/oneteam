/**
 * OneTeam behaviour spec for the Captain overview metric card.
 *
 * Covers the standard, headline and spread layouts, trend colours and
 * arrows, supporting text, hints, descriptions, the loading skeleton,
 * compact spacing, keyboard and click activation, and the layout
 * validator.
 */
import { mount } from '@vue/test-utils';
import MetricCard from '../MetricCard.vue';

const MetricHint = {
  name: 'MetricHint',
  props: ['label', 'description', 'note'],
  template: '<i class="hint" />',
};

/**
 * Mounts the card.
 *
 * @param {object} props Card props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountCard = props =>
  mount(MetricCard, {
    props: { label: 'Resolved', value: '42', ...props },
    global: { stubs: { MetricHint } },
  });

describe('MetricCard behaviour', () => {
  it('shows a standard card with trend, supporting text and hint', () => {
    const wrapper = mountCard({
      trend: '+5%',
      trendUp: true,
      trendGood: true,
      supportingValue: '12',
      supportingText: 'today',
      description: 'Conversations',
      hint: 'How many',
      hintNote: 'Last 7 days',
    });
    expect(wrapper.classes()).toContain('gap-3');
    expect(wrapper.attributes('role')).toBeUndefined();
    expect(wrapper.text()).toContain('Resolved');
    expect(wrapper.text()).toContain('12 today');
    expect(wrapper.text()).toContain('Conversations');
    expect(wrapper.getComponent(MetricHint).props()).toEqual({
      label: 'Resolved',
      description: 'How many',
      note: 'Last 7 days',
    });
    const trend = wrapper.get('.text-n-teal-11');
    expect(trend.text()).toBe('+5%');
    expect(trend.find('.i-fluent-caret-up-12-filled').exists()).toBe(true);
    expect(trend.find('.\\!size-\\[0\\.65625rem\\]').exists()).toBe(false);
  });

  it('handles bad and neutral trends and partial supporting text', async () => {
    const wrapper = mountCard({
      trend: '-2%',
      trendUp: false,
      trendGood: false,
      supportingText: 'only text',
      compact: true,
    });
    expect(wrapper.classes()).toContain('gap-2');
    expect(wrapper.get('.text-n-ruby-11').text()).toBe('-2%');
    expect(wrapper.find('.i-fluent-caret-down-12-filled').exists()).toBe(true);
    expect(wrapper.text()).toContain('only text');
    await wrapper.setProps({
      trendGood: null,
      trendUp: null,
      supportingText: '',
    });
    expect(wrapper.get('.text-n-slate-11.shrink-0').text()).toBe('-2%');
    expect(wrapper.find('[class*="caret"]').exists()).toBe(false);
    await wrapper.setProps({ supportingValue: '3' });
    expect(wrapper.text()).toContain('3');
  });

  it('shows a headline card', async () => {
    const wrapper = mountCard({
      layout: 'headline',
      trend: '+1',
      trendUp: true,
      hint: 'Tip',
      description: 'Below',
    });
    expect(wrapper.classes()).toContain('justify-between');
    expect(wrapper.find('.i-fluent-caret-up-12-filled').exists()).toBe(true);
    expect(wrapper.findComponent(MetricHint).exists()).toBe(true);
    expect(wrapper.text()).toContain('Below');
    await wrapper.setProps({ trendUp: false });
    expect(wrapper.find('.i-fluent-caret-down-12-filled').exists()).toBe(true);
    await wrapper.setProps({ trendUp: null });
    expect(wrapper.find('[class*="caret"]').exists()).toBe(false);
    await wrapper.setProps({ trend: '', hint: '', description: '' });
    expect(wrapper.text()).toBe('42Resolved');
  });

  it('shows a spread card', async () => {
    const wrapper = mountCard({
      layout: 'spread',
      trend: '+1',
      trendUp: true,
      description: 'Spread text',
      valueClass: 'text-n-blue-11',
    });
    expect(wrapper.find('.\\!size-\\[0\\.65625rem\\]').exists()).toBe(true);
    expect(wrapper.get('.text-n-blue-11').text()).toBe('42');
    expect(wrapper.text()).toContain('Spread text');
    await wrapper.setProps({ description: '' });
    expect(wrapper.text()).not.toContain('Spread text');
  });

  it.each(['standard', 'headline', 'spread'])(
    'shows the skeleton while loading a %s card',
    layout => {
      const wrapper = mountCard({
        layout,
        loading: true,
        trend: '+1',
        description: 'Hidden',
      });
      expect(wrapper.findAll('.animate-pulse')).toHaveLength(2);
      expect(wrapper.text()).not.toContain('+1');
      expect(wrapper.text()).not.toContain('42');
    }
  );

  it('activates only when clickable', async () => {
    const wrapper = mountCard();
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeUndefined();
    await wrapper.setProps({ clickable: true });
    expect(wrapper.attributes()).toMatchObject({
      role: 'button',
      tabindex: '0',
    });
    await wrapper.trigger('click');
    await wrapper.trigger('keydown', { key: 'Enter' });
    await wrapper.trigger('keydown', { key: ' ' });
    expect(wrapper.emitted('click')).toHaveLength(3);
  });

  it('validates the layout', () => {
    const { validator } = MetricCard.props.layout;
    expect(validator('spread')).toBe(true);
    expect(validator('grid')).toBe(false);
  });
});
