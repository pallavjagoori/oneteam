/**
 * OneTeam behaviour spec for a metric hint popover on the Captain
 * overview.
 *
 * Covers the trigger label and open styling, the description and the
 * optional note, and keeping clicks from reaching the card.
 */
import { mount } from '@vue/test-utils';
import MetricHint from '../MetricHint.vue';

const env = vi.hoisted(() => ({ open: false }));

const Popover = {
  name: 'Popover',
  props: ['align'],
  setup: () => ({ env }),
  template: '<div><slot :is-open="env.open" /><slot name="content" /></div>',
};

/**
 * Mounts the hint inside a clickable parent.
 *
 * @param {object} props Hint props.
 * @param {Function} parentClick Parent click listener.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountHint = (props, parentClick = () => {}) =>
  mount(
    {
      components: { MetricHint },
      props: ['hintProps'],
      methods: { parentClick },
      template:
        '<div @click="parentClick"><MetricHint v-bind="hintProps" /></div>',
    },
    {
      props: { hintProps: { label: 'About', description: 'Desc', ...props } },
      global: { stubs: { Popover } },
    }
  );

describe('MetricHint behaviour', () => {
  it('explains the metric with a note while open', async () => {
    env.open = true;
    const parentClick = vi.fn();
    const wrapper = mountHint({ note: 'Updated hourly' }, parentClick);
    const button = wrapper.get('button');
    expect(button.attributes('aria-label')).toBe('About');
    expect(button.classes()).toContain('text-n-slate-12');
    expect(wrapper.text()).toContain('Desc');
    expect(wrapper.text()).toContain('Updated hourly');
    await button.trigger('click');
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('shows a muted trigger and no note by default', () => {
    env.open = false;
    const wrapper = mountHint();
    expect(wrapper.get('button').classes()).toContain('text-n-slate-8');
    expect(wrapper.findAll('p')).toHaveLength(1);
  });
});
