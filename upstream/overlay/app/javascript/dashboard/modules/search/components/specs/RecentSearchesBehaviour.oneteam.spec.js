/**
 * OneTeam behaviour spec for the recent searches list under the search
 * box.
 *
 * Covers loading saved searches (ignoring non-array data), rendering
 * nothing without history, marking the most recent one, recording new
 * searches (trimmed, de-duplicated case-insensitively, capped at three,
 * ignoring short queries), selecting one, and clearing them all.
 */
import { mount } from '@vue/test-utils';
import { LocalStorage } from 'shared/helpers/localStorage';
import { LOCAL_STORAGE_KEYS } from 'dashboard/constants/localStorage';
import RecentSearches from '../RecentSearches.vue';

const KEY = LOCAL_STORAGE_KEYS.RECENT_SEARCHES;
const Button = {
  name: 'NextButton',
  emits: ['click'],
  template: '<button class="clear" @click="$emit(\'click\')"><slot /></button>',
};

const mountList = async () => {
  const wrapper = mount(RecentSearches, {
    global: { stubs: { NextButton: Button, Button, Icon: true }, mocks: { $t: key => key } },
  });
  await wrapper.vm.$nextTick();
  return wrapper;
};
const entries = wrapper =>
  wrapper.findAll('button:not(.clear)').map(b => b.find('.truncate').text());

describe('Recent searches behaviour', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders nothing without valid history', async () => {
    expect((await mountList()).find('h3').exists()).toBe(false);
    LocalStorage.set(KEY, { not: 'a list' });
    expect((await mountList()).find('h3').exists()).toBe(false);
  });

  it('lists saved searches and lets the user pick one', async () => {
    LocalStorage.set(KEY, ['refund', 'invoice']);
    const wrapper = await mountList();
    expect(entries(wrapper)).toEqual(['refund', 'invoice']);
    expect(wrapper.findAll('button:not(.clear)')[0].text()).toContain('SEARCH.MOST_RECENT');
    expect(wrapper.findAll('button:not(.clear)')[1].text()).not.toContain('SEARCH.MOST_RECENT');
    await wrapper.findAll('button:not(.clear)')[1].trigger('click');
    expect(wrapper.emitted('selectSearch')).toEqual([['invoice']]);
  });

  it('records searches with trimming, de-duplication and a cap of three', async () => {
    const wrapper = await mountList();
    wrapper.vm.addRecentSearch('');
    wrapper.vm.addRecentSearch(' a ');
    wrapper.vm.addRecentSearch(' refund ');
    wrapper.vm.addRecentSearch('invoice');
    wrapper.vm.addRecentSearch('REFUND');
    wrapper.vm.addRecentSearch('vip');
    wrapper.vm.addRecentSearch('late');
    await wrapper.vm.$nextTick();
    expect(entries(wrapper)).toEqual(['late', 'vip', 'REFUND']);
    expect(LocalStorage.get(KEY)).toEqual(['late', 'vip', 'REFUND']);
    LocalStorage.set(KEY, ['other']);
    wrapper.vm.loadRecentSearches();
    await wrapper.vm.$nextTick();
    expect(entries(wrapper)).toEqual(['other']);
  });

  it('clears all searches', async () => {
    LocalStorage.set(KEY, ['refund']);
    const wrapper = await mountList();
    await wrapper.find('.clear').trigger('click');
    expect(wrapper.emitted('clearAll')).toHaveLength(1);
    expect(wrapper.find('h3').exists()).toBe(false);
    expect(LocalStorage.get(KEY)).toBeNull();
  });
});
