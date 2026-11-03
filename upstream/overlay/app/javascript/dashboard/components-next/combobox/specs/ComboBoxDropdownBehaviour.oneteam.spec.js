/**
 * OneTeam behaviour spec for ComboBoxDropdown.
 *
 * Covers single and multiple selection marks, search input, the loading
 * spinner, default and custom placeholder and empty texts, selecting an
 * option and the exposed focus.
 */
import { mount } from '@vue/test-utils';
import ComboBoxDropdown from '../ComboBoxDropdown.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

const options = [
  { value: 1, label: 'One' },
  { value: 2, label: 'Two' },
];

/**
 * Mounts the dropdown.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountDropdown = props =>
  mount(ComboBoxDropdown, {
    props: { open: true, options, ...props },
    attachTo: document.body,
    global: {
      stubs: {
        Spinner: { template: '<i class="spinner" />' },
        Icon: { template: '<i class="search-icon" />' },
      },
    },
  });

const selected = wrapper =>
  wrapper.findAll('[role="option"]').map(li => li.attributes('aria-selected'));

describe('ComboBoxDropdown behaviour', () => {
  it('marks a single selected value', () => {
    const wrapper = mountDropdown({ selectedValues: 2 });
    expect(selected(wrapper)).toEqual(['false', 'true']);
    expect(wrapper.findAll('.i-lucide-check')).toHaveLength(1);
    expect(wrapper.find('.search-icon').exists()).toBe(true);
    expect(wrapper.find('input').attributes('placeholder')).toBe(
      'COMBOBOX.SEARCH_PLACEHOLDER'
    );
    wrapper.unmount();
  });

  it('marks multiple selected values and shows the spinner', () => {
    const wrapper = mountDropdown({
      multiple: true,
      selectedValues: [1, 2],
      loading: true,
      searchPlaceholder: 'Find',
    });
    expect(selected(wrapper)).toEqual(['true', 'true']);
    expect(wrapper.find('.spinner').exists()).toBe(true);
    expect(wrapper.find('input').attributes('placeholder')).toBe('Find');
    wrapper.unmount();
  });

  it('emits search and select', async () => {
    const wrapper = mountDropdown({});
    await wrapper.find('input').setValue('tw');
    await wrapper.findAll('[role="option"]')[1].trigger('click');
    expect(wrapper.emitted('search')).toEqual([['tw']]);
    expect(wrapper.emitted('update:searchValue')).toEqual([['tw']]);
    expect(wrapper.emitted('select')).toEqual([[options[1]]]);
    wrapper.unmount();
  });

  it('shows the default and custom empty state', async () => {
    const wrapper = mountDropdown({ options: [] });
    expect(wrapper.text()).toContain('COMBOBOX.EMPTY_STATE');
    await wrapper.setProps({ emptyState: 'Nothing' });
    expect(wrapper.text()).toContain('Nothing');
    wrapper.unmount();
  });

  it('focuses the search input', () => {
    const wrapper = mountDropdown({});
    wrapper.vm.focus();
    expect(document.activeElement).toBe(wrapper.find('input').element);
    wrapper.unmount();
  });
});
