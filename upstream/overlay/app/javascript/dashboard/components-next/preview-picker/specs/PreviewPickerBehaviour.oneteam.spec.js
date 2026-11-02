/**
 * OneTeam behaviour spec for the searchable picker with a preview pane
 * (used by the canned response and article pickers).
 *
 * Covers focusing the search, the side, stacked and hidden preview
 * layouts, group headings, the selected option and its preview, hovering
 * and clicking options, filters, the loading and empty states, and
 * scrolling the list so the selected option stays visible (up, down,
 * already visible and missing).
 */
import { mount } from '@vue/test-utils';
import PreviewPicker from '../PreviewPicker.vue';

const items = [
  {
    id: 1,
    title: 'Refund',
    subtitle: '<b>Money back</b>',
    label: 'Refund policy',
    group: 'Billing',
  },
  { id: 2, title: 'Invoice', label: 'Invoices', group: 'Billing' },
  { id: 3, title: 'Reset', label: 'Password reset', group: 'Account' },
  { id: 4, title: 'Ungrouped', label: 'Other' },
];

const mountPicker = (props = {}, slots = {}) =>
  mount(PreviewPicker, {
    props: {
      items,
      searchPlaceholder: 'Search',
      emptyLabel: 'Nothing',
      ...props,
    },
    slots: {
      preview:
        '<template #preview="{ item }"><p class="preview">{{ item && item.title }}</p></template>',
      ...slots,
    },
    attachTo: document.body,
    global: {
      stubs: { Icon: true, Spinner: { template: '<i class="spinner" />' } },
      directives: {
        dompurifyHtml: (el, binding) => {
          el.innerHTML = binding.value;
        },
      },
    },
  });

const options = wrapper => wrapper.findAll('[role="option"]');

const rect = (top, bottom) => () => ({ top, bottom });

describe('PreviewPicker behaviour', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('shows grouped options with a side preview', async () => {
    const wrapper = mountPicker({ selectedIndex: 2 });
    expect(document.activeElement).toBe(wrapper.find('input').element);
    const headings = wrapper.findAll('[role="presentation"]');
    expect(headings.map(h => h.text())).toEqual(['Billing', 'Account']);
    expect(headings[0].classes()).not.toContain('pt-2');
    expect(headings[1].classes()).toContain('pt-2');
    expect(options(wrapper)[0].text()).toContain('Money back');
    expect(options(wrapper)[2].attributes('aria-selected')).toBe('true');
    expect(wrapper.find('input').attributes('aria-activedescendant')).toBe(
      options(wrapper)[2].attributes('id')
    );
    expect(wrapper.text()).toContain('Password reset');
    expect(wrapper.find('.preview').text()).toBe('Reset');
    expect(wrapper.find('.w-2\\/5').exists()).toBe(true);

    await options(wrapper)[0].trigger('mousemove');
    expect(wrapper.emitted('update:selectedIndex')[0]).toEqual([0]);
    await options(wrapper)[3].trigger('click');
    expect(wrapper.emitted('select')[0]).toEqual([3]);
    await wrapper.find('input').setValue('ref');
    expect(wrapper.emitted('update:search')[0]).toEqual(['ref']);
  });

  it('stacks the preview or hides it', () => {
    const stacked = mountPicker(
      { previewLayout: 'stacked' },
      { filters: '<span class="filter">All</span>' }
    );
    expect(stacked.classes()).toContain('flex-col');
    expect(stacked.find('.h-28').exists()).toBe(true);
    expect(stacked.find('.filter').exists()).toBe(true);
    const down = new MouseEvent('mousedown', { cancelable: true });
    stacked.find('.filter').element.parentElement.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    expect(stacked.text()).not.toContain('Refund policy');

    const none = mountPicker({ previewLayout: 'none' });
    expect(none.find('.preview').exists()).toBe(false);
    expect(none.find('.w-full.flex.flex-col').exists()).toBe(true);
  });

  it('shows the loading and empty states', () => {
    const loading = mountPicker({ items: [], isLoading: true });
    expect(loading.find('.spinner').exists()).toBe(true);
    expect(loading.find('input').attributes('aria-activedescendant')).toBe(
      undefined
    );
    expect(loading.find('.preview').exists()).toBe(false);

    const empty = mountPicker({ items: [] });
    expect(empty.find('[role="status"]').text()).toBe('Nothing');
  });

  it('scrolls the selected option into view', async () => {
    const wrapper = mountPicker({ selectedIndex: 1 });
    const list = wrapper.find('.overflow-y-auto').element;
    list.getBoundingClientRect = rect(100, 200);
    const item = options(wrapper)[1].element;

    list.scrollTop = 50;
    item.getBoundingClientRect = rect(80, 110);
    wrapper.vm.scrollSelectedIntoView();
    await wrapper.vm.$nextTick();
    expect(list.scrollTop).toBe(30);

    item.getBoundingClientRect = rect(180, 230);
    wrapper.vm.scrollSelectedIntoView();
    await wrapper.vm.$nextTick();
    expect(list.scrollTop).toBe(60);

    item.getBoundingClientRect = rect(120, 150);
    wrapper.vm.scrollSelectedIntoView();
    await wrapper.vm.$nextTick();
    expect(list.scrollTop).toBe(60);

    await wrapper.setProps({ selectedIndex: 9 });
    wrapper.vm.scrollSelectedIntoView();
    await wrapper.vm.$nextTick();
    expect(list.scrollTop).toBe(60);
  });
});
