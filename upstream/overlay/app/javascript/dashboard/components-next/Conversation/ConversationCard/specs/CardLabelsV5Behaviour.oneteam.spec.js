/**
 * OneTeam behaviour spec for the conversation card's label row.
 *
 * Measures fake element widths to cover which labels fit, the "+N"
 * overflow button and its tooltip, expanding and collapsing all labels,
 * the read-only (disableToggle) mode including the "N labels" summary
 * when none fit, the "before" slot taking up space, recalculating on
 * resize and when labels change, and the empty states.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { computed, reactive } from 'vue';
import CardLabelsV5 from '../CardLabelsV5.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: name => computed(() => env.state[name]),
}));
vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  useThrottleFn: fn => fn,
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({
    t: (key, params) => (params ? `${key}:${params.count}` : key),
  }),
}));

const Label = {
  name: 'Label',
  props: ['label', 'compact'],
  template: '<span class="label">{{ label.title }}</span>',
};
const HiddenLabel = { ...Label, inheritAttrs: false };
const Button = {
  name: 'Button',
  props: ['label', 'icon', 'noAnimation'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\', $event)">{{ label }}</button>',
};

const accountLabels = [
  { id: 1, title: 'a' },
  { id: 2, title: 'b' },
  { id: 3, title: 'c' },
  { id: 4, title: 'unused' },
];

const tooltip = (el, binding) => {
  el.dataset.tip = binding.value.content;
};

const mountRow = async ({ props, slots, width = 300, label = Label } = {}) => {
  env.containerWidth = width;
  const wrapper = mount(CardLabelsV5, {
    props: { labels: ['a', 'b', 'c'], ...props },
    slots,
    global: {
      stubs: { Label: label, Button },
      directives: {
        tooltip: { mounted: tooltip, updated: tooltip },
        resize: {
          mounted: (el, binding) => {
            env.resize = binding.value;
          },
        },
      },
    },
  });
  await flushPromises();
  return wrapper;
};
const button = wrapper => wrapper.findComponent(Button);
const hidden = wrapper =>
  wrapper.findAll('.label').filter(l => l.classes().includes('invisible'));

beforeEach(() => {
  env.state = reactive({ 'labels/getLabels': accountLabels });
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(
    function width() {
      return this.hasAttribute('data-before-slot') ? 100 : 50;
    }
  );
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(
    () => env.containerWidth
  );
});

describe('CardLabelsV5 behaviour', () => {
  it('renders nothing without labels or a before slot', async () => {
    const wrapper = await mountRow({ props: { labels: [] } });
    expect(wrapper.find('[data-labels-container]').exists()).toBe(false);
  });

  it('renders the before slot alone without labels', async () => {
    const wrapper = await mountRow({
      props: { labels: [] },
      slots: { before: '<i data-before-slot>B</i>' },
    });
    expect(wrapper.text()).toBe('B');
    expect(button(wrapper).exists()).toBe(false);
  });

  it('shows every label when they all fit', async () => {
    const wrapper = await mountRow({ props: { class: 'extra' } });
    expect(wrapper.findAll('.label').map(l => l.text())).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(wrapper.find('[data-labels-container]').classes()).toContain(
      'extra'
    );
    expect(hidden(wrapper)).toHaveLength(0);
    expect(button(wrapper).exists()).toBe(false);
  });

  it('hides overflowing labels behind a +N button that expands them', async () => {
    const wrapper = await mountRow({ width: 160 });
    expect(hidden(wrapper).map(l => l.text())).toEqual(['c']);
    expect(button(wrapper).props()).toMatchObject({
      label: 1,
      icon: 'i-lucide-plus',
      noAnimation: false,
    });
    expect(button(wrapper).attributes('data-tip')).toBe(
      'CONVERSATION.CARD.SHOW_LABELS'
    );

    await button(wrapper).trigger('click');
    await flushPromises();
    expect(hidden(wrapper)).toHaveLength(0);
    expect(wrapper.find('[data-labels-container]').classes()).toContain(
      'flex-wrap'
    );
    expect(button(wrapper).props()).toMatchObject({
      label: '',
      icon: 'i-lucide-chevron-left',
    });
    expect(button(wrapper).attributes('data-tip')).toBe(
      'CONVERSATION.CARD.HIDE_LABELS'
    );

    await button(wrapper).trigger('click');
    await flushPromises();
    expect(hidden(wrapper)).toHaveLength(1);
  });

  it('lists hidden labels in the tooltip when toggling is disabled', async () => {
    const wrapper = await mountRow({
      props: { disableToggle: true },
      width: 160,
    });
    expect(button(wrapper).attributes('data-tip')).toBe('c');
    expect(button(wrapper).classes()).toContain('cursor-default');
    await button(wrapper).trigger('click');
    await flushPromises();
    expect(hidden(wrapper)).toHaveLength(1);
  });

  it('summarises all labels when none fit and toggling is disabled', async () => {
    const wrapper = await mountRow({
      props: { disableToggle: true },
      width: 40,
    });
    expect(hidden(wrapper)).toHaveLength(3);
    expect(button(wrapper).props('label')).toBe(
      'CONVERSATION.CARD.LABELS_COUNT:3'
    );
    expect(button(wrapper).attributes('data-tip')).toBe('a, b, c');
  });

  it('leaves room for the before slot', async () => {
    const wrapper = await mountRow({
      width: 200,
      slots: { before: '<i data-before-slot>B</i>' },
    });
    expect(hidden(wrapper)).toHaveLength(3);
    expect(button(wrapper).props('label')).toBe(3);
  });

  it('recalculates on resize and when labels change', async () => {
    const wrapper = await mountRow();
    env.containerWidth = 160;
    env.resize();
    await flushPromises();
    expect(hidden(wrapper)).toHaveLength(1);
    env.containerWidth = 300;
    await wrapper.setProps({ labels: ['a', 'b'] });
    await flushPromises();
    expect(hidden(wrapper)).toHaveLength(0);
    expect(button(wrapper).exists()).toBe(false);
  });

  it('shows no button when labels cannot be measured', async () => {
    const wrapper = await mountRow({ width: 40, label: HiddenLabel });
    expect(button(wrapper).exists()).toBe(false);
  });
});
