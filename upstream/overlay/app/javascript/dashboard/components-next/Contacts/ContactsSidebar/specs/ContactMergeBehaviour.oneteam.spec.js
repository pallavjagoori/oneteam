/**
 * OneTeam behaviour spec for the contact merge panel.
 *
 * Covers searching for a primary contact (excluding the current one,
 * loading flag, search errors), requiring a primary contact, merging
 * (tracking, payload with the route id fallback, redirect, success and
 * error alerts), and cancelling (resetting, or leaving the tab when
 * nothing was picked).
 */
import { computed } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert, useTrack } from 'dashboard/composables';
import ContactMerge from '../ContactMerge.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn(), useTrack: vi.fn() }));
vi.mock('@chatwoot/utils', async importOriginal => ({
  ...(await importOriginal()),
  debounce: fn => fn,
}));
vi.mock('dashboard/api/contacts', () => ({
  default: { search: (...args) => env.search(...args) },
}));
vi.mock('vue-router', () => ({ useRoute: () => ({ params: { contactId: '88' } }) }));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
  useMapGetter: () => computed(() => env.uiFlags),
}));

const MergeForm = {
  name: 'ContactMergeForm',
  props: ['primaryContactId', 'primaryContactList', 'isSearching', 'hasError', 'errorMessage'],
  emits: ['update:primaryContactId', 'search'],
  template: '<div class="merge-form" />',
};
const Button = {
  name: 'Button',
  props: { label: String, isLoading: Boolean, disabled: Boolean },
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};

const mountMerge = (selectedContact = { id: 5, name: 'Dup' }) =>
  mount(ContactMerge, {
    props: { selectedContact },
    global: { stubs: { ContactMergeForm: MergeForm, Button } },
  });
const form = wrapper => wrapper.findComponent(MergeForm);
const buttons = wrapper => wrapper.findAll('button');

describe('Contact merge behaviour', () => {
  beforeEach(() => {
    env.uiFlags = { isMerging: false };
    env.dispatch = vi.fn().mockResolvedValue();
    env.search = vi.fn().mockResolvedValue({
      data: { payload: [{ id: 5, name: 'Dup' }, { id: 6, name: 'Main' }] },
    });
  });

  it('searches for other contacts to merge into', async () => {
    let finish;
    env.search.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    const wrapper = mountMerge();
    await form(wrapper).vm.$emit('search', 'ma');
    expect(form(wrapper).props('isSearching')).toBe(true);
    finish({ data: { payload: [{ id: 5, name: 'Dup' }, { id: 6, name: 'Main' }] } });
    await flushPromises();
    expect(env.search).toHaveBeenCalledWith('ma');
    expect(form(wrapper).props()).toMatchObject({
      isSearching: false,
      primaryContactList: [{ value: 6, label: '(ID: 6) Main' }],
    });
  });

  it('reports search failures', async () => {
    env.search.mockRejectedValueOnce(new Error('x'));
    const wrapper = mountMerge();
    await form(wrapper).vm.$emit('search', 'ma');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('CONTACTS_LAYOUT.SIDEBAR.MERGE.SEARCH_ERROR_MESSAGE');
    expect(form(wrapper).props('isSearching')).toBe(false);
  });

  it('requires a primary contact', async () => {
    const wrapper = mountMerge();
    await buttons(wrapper)[1].trigger('click');
    await flushPromises();
    expect(env.dispatch).not.toHaveBeenCalled();
    expect(form(wrapper).props()).toMatchObject({
      hasError: true,
      errorMessage: 'CONTACTS_LAYOUT.SIDEBAR.MERGE.PRIMARY_REQUIRED_ERROR',
    });
  });

  it('merges into the chosen contact', async () => {
    const wrapper = mountMerge();
    await form(wrapper).vm.$emit('update:primaryContactId', 6);
    await buttons(wrapper)[1].trigger('click');
    await flushPromises();
    expect(useTrack).toHaveBeenCalled();
    expect(env.dispatch).toHaveBeenCalledWith('contacts/merge', { childId: 5, parentId: 6 });
    expect(wrapper.emitted('goToContactsList')).toHaveLength(1);
    expect(useAlert).toHaveBeenCalledWith('CONTACTS_LAYOUT.SIDEBAR.MERGE.SUCCESS_MESSAGE');
    expect(form(wrapper).props('primaryContactId')).toBe(null);
    expect(wrapper.emitted('resetTab')).toBeUndefined();
  });

  it('falls back to the route contact id and reports merge failures', async () => {
    env.dispatch.mockRejectedValueOnce(new Error('x'));
    const wrapper = mountMerge({ name: 'No id' });
    await form(wrapper).vm.$emit('update:primaryContactId', 6);
    await buttons(wrapper)[1].trigger('click');
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('contacts/merge', { childId: '88', parentId: 6 });
    expect(useAlert).toHaveBeenCalledWith('CONTACTS_LAYOUT.SIDEBAR.MERGE.ERROR_MESSAGE');
  });

  it('shows the merging state', () => {
    env.uiFlags = { isMerging: true };
    const wrapper = mountMerge();
    expect(wrapper.findAllComponents(Button)[1].props()).toMatchObject({ isLoading: true, disabled: true });
  });

  it('cancels by clearing the pick or leaving the tab', async () => {
    const wrapper = mountMerge();
    await form(wrapper).vm.$emit('update:primaryContactId', 6);
    await buttons(wrapper)[0].trigger('click');
    expect(form(wrapper).props('primaryContactId')).toBe(null);
    expect(wrapper.emitted('resetTab')).toBeUndefined();
    await buttons(wrapper)[0].trigger('click');
    expect(wrapper.emitted('resetTab')).toHaveLength(1);
  });
});
