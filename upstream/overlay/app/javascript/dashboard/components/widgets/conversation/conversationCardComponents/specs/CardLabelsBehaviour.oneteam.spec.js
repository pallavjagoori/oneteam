/**
 * OneTeam behaviour spec for the label row on the classic conversation
 * card.
 *
 * Covers showing the conversation's labels, hiding labels that do not
 * fit, the expand and collapse button (only with more than one label),
 * leaving room for the "before" slot, re-measuring when labels change,
 * and rendering nothing without labels or a slot.
 */
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import CardLabels from '../CardLabels.vue';

const env = vi.hoisted(() => ({ labels: null }));

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => env.labels,
}));

let resize;
const WootLabel = {
  name: 'WootLabel',
  props: ['title'],
  template: '<span class="label">{{ title }}</span>',
};

const mountLabels = (conversationLabels, slots) =>
  mount(CardLabels, {
    props: { conversationLabels },
    slots,
    global: {
      stubs: { WootLabel, FluentIcon: true },
      directives: {
        resize: {
          mounted: (el, { value }) => {
            resize = value;
          },
        },
      },
    },
  });

const size = (label, container) => {
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(label);
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(container);
};
const hidden = wrapper =>
  wrapper
    .findAll('.label')
    .filter(l => l.classes().includes('invisible'))
    .map(l => l.text());

describe('Classic CardLabels behaviour', () => {
  beforeEach(() => {
    env.labels = ref([
      { id: 1, title: 'bug' },
      { id: 2, title: 'billing' },
      { id: 3, title: 'vip' },
    ]);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing without labels or a slot', () => {
    size(50, 500);
    expect(mountLabels([]).find('.label').exists()).toBe(false);
    expect(mountLabels([]).find('.flex').exists()).toBe(false);
  });

  it('hides labels that do not fit and toggles them', async () => {
    size(50, 100);
    const wrapper = mountLabels(['bug', 'billing', 'vip']);
    await wrapper.vm.$nextTick();
    expect(hidden(wrapper)).toEqual(['billing', 'vip']);
    const button = wrapper.find('button');
    expect(button.attributes('title')).toBe('CONVERSATION.CARD.SHOW_LABELS');

    const click = new MouseEvent('click', { bubbles: true });
    const stop = vi.spyOn(click, 'stopPropagation');
    button.element.dispatchEvent(click);
    await wrapper.vm.$nextTick();
    expect(stop).toHaveBeenCalled();
    expect(hidden(wrapper)).toEqual([]);
    expect(wrapper.find('button').attributes('title')).toBe(
      'CONVERSATION.CARD.HIDE_LABELS'
    );
    await wrapper.find('button').trigger('click');
    expect(hidden(wrapper)).toEqual(['billing', 'vip']);
  });

  it('keeps a single overflowing label without the expand button', () => {
    size(200, 100);
    const wrapper = mountLabels(['bug']);
    expect(wrapper.find('button').exists()).toBe(false);
  });

  it('leaves room for the before slot and re-measures on change', async () => {
    size(50, 200);
    const wrapper = mountLabels(['bug', 'billing', 'vip'], {
      before: '<b class="before" />',
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.before').exists()).toBe(true);
    expect(hidden(wrapper)).toEqual(['billing', 'vip']);

    vi.restoreAllMocks();
    size(50, 500);
    await wrapper.setProps({ conversationLabels: ['bug', 'billing'] });
    // The watcher measures on the next tick, which then re-renders.
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    expect(hidden(wrapper)).toEqual([]);
    expect(wrapper.find('button').exists()).toBe(false);

    resize();
    wrapper.vm.labelContainer = null;
    expect(wrapper.vm.computeVisibleLabelPosition()).toBeUndefined();
  });
});
