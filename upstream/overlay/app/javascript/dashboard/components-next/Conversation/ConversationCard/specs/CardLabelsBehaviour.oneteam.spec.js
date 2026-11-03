/**
 * OneTeam behaviour spec for the label row on the new conversation card.
 *
 * Covers showing only the conversation's labels with their colours,
 * starting with one label, fitting as many labels as the measured width
 * allows (short and long names are measured differently), always keeping
 * at least one, truncating the last visible label, and doing nothing
 * before the row is measured or when there are no labels.
 */
import { mount } from '@vue/test-utils';
import CardLabels from '../CardLabels.vue';

let resize;
const accountLabels = [
  { id: 1, title: 'bug', color: '#f00' },
  { id: 2, title: 'billing', color: '#0f0' },
  { id: 3, title: 'vip', color: '#00f' },
  { id: 4, title: 'unused', color: '#999' },
];

const mountLabels = (conversationLabels = ['bug', 'billing', 'vip']) =>
  mount(CardLabels, {
    props: { conversationLabels, accountLabels },
    global: {
      directives: {
        resize: {
          mounted: (el, { value }) => {
            resize = value;
          },
        },
      },
    },
  });

const titles = wrapper => wrapper.findAll('span').map(s => s.text());
const setWidth = width =>
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(width);

describe('CardLabels behaviour', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts with one label in its colour', () => {
    const wrapper = mountLabels();
    expect(titles(wrapper)).toEqual(['bug']);
    expect(wrapper.find('.rounded-full').attributes('style')).toContain(
      'background-color: rgb(255, 0, 0)'
    );
    expect(wrapper.find('span').classes()).toContain('truncate');
  });

  it('fits as many labels as the width allows', async () => {
    const wrapper = mountLabels();
    // Average width: bug 36, billing 54, vip 36 -> 42.
    setWidth(130);
    resize();
    await wrapper.vm.$nextTick();
    expect(titles(wrapper)).toEqual(['bug', 'billing', 'vip']);
    const spans = wrapper.findAll('span');
    expect(spans[0].classes()).not.toContain('truncate');
    expect(spans[2].classes()).toContain('truncate');

    setWidth(10);
    resize();
    await wrapper.vm.$nextTick();
    expect(titles(wrapper)).toEqual(['bug']);
  });

  it('handles no labels and a missing container', async () => {
    const wrapper = mountLabels([]);
    setWidth(200);
    resize();
    await wrapper.vm.$nextTick();
    expect(titles(wrapper)).toEqual([]);

    wrapper.vm.containerRef = null;
    wrapper.vm.updateVisibleLabels();
    expect(wrapper.vm.maxLabels).toBe(2);

    expect(wrapper.vm.calculateLabelWidth({})).toBe(12);
  });
});
