/**
 * OneTeam behaviour spec for the global search input.
 *
 * Covers autofocus on mount, the "/" shortcut to focus and Escape to
 * blur, the debounced search (ignoring single characters unless they are
 * digits), showing recent searches when focused with an empty query and
 * hiding them while typing or after blur, picking or clearing recent
 * searches, and recording a search through the exposed helper.
 */
import { mount } from '@vue/test-utils';
import SearchInput from '../SearchInput.vue';

vi.mock('@chatwoot/utils', () => ({ debounce: fn => fn }));

const RecentSearches = {
  name: 'RecentSearches',
  emits: ['selectSearch', 'clearAll'],
  methods: { addRecentSearch: vi.fn() },
  template: '<div class="recent" />',
};

const mountInput = (props = {}) =>
  mount(SearchInput, {
    props,
    attachTo: document.body,
    global: { stubs: { RecentSearches, FluentIcon: true }, mocks: { $t: key => key } },
  });
const recentShown = wrapper =>
  wrapper.find('.recent').element.parentElement.parentElement.className.includes('opacity-100');

describe('Search input behaviour', () => {
  let wrapper;

  afterEach(() => {
    wrapper?.unmount();
  });

  it('focuses on mount and shows recent searches for an empty query', async () => {
    wrapper = mountInput();
    await wrapper.vm.$nextTick();
    expect(document.activeElement).toBe(wrapper.find('input').element);
    expect(wrapper.classes()).toContain('border-n-brand');
    expect(recentShown(wrapper)).toBe(true);
  });

  it('handles the slash and Escape shortcuts', async () => {
    wrapper = mountInput({ modelValue: 'billing' });
    expect(recentShown(wrapper)).toBe(false);
    const input = wrapper.find('input').element;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.activeElement).not.toBe(input);
    await wrapper.vm.$nextTick();
    expect(wrapper.classes()).toContain('border-n-strong');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(document.activeElement).not.toBe(input);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }));
    expect(document.activeElement).toBe(input);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }));
    expect(document.activeElement).toBe(input);
  });

  it('emits searches and toggles recent searches while typing', async () => {
    wrapper = mountInput();
    const input = wrapper.find('input');
    await input.setValue('a');
    await input.setValue('7');
    await input.setValue('refund');
    expect(wrapper.emitted('search')).toEqual([[''], ['7'], ['refund']]);
    expect(recentShown(wrapper)).toBe(false);
    await input.setValue(' ');
    expect(recentShown(wrapper)).toBe(true);
    await input.trigger('blur');
    expect(recentShown(wrapper)).toBe(false);
    await input.setValue('');
    expect(recentShown(wrapper)).toBe(false);
  });

  it('picks or clears recent searches and records new ones', async () => {
    wrapper = mountInput();
    const recent = wrapper.findComponent(RecentSearches);
    recent.vm.$emit('selectSearch', 'late refund');
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('selectRecentSearch')).toEqual([['late refund']]);
    expect(wrapper.emitted('update:modelValue')).toEqual([['late refund']]);
    expect(recentShown(wrapper)).toBe(false);

    await wrapper.find('input').trigger('blur');
    await wrapper.find('input').setValue('');
    await wrapper.find('input').trigger('focus');
    expect(recentShown(wrapper)).toBe(true);
    recent.vm.$emit('clearAll');
    await wrapper.vm.$nextTick();
    expect(recentShown(wrapper)).toBe(false);

    wrapper.vm.addToRecentSearches('vip');
    expect(RecentSearches.methods.addRecentSearch).toHaveBeenCalledWith('vip');
  });
});
