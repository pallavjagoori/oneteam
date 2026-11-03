/**
 * OneTeam behaviour spec for the contact merge form's primary contact picker.
 *
 * Covers forwarding the picked contact and search queries, and the
 * searching versus empty placeholder.
 */
import { mount } from '@vue/test-utils';
import ContactMergeForm from '../ContactMergeForm.vue';

const ComboBox = {
  name: 'ComboBox',
  props: ['modelValue', 'emptyState'],
  emits: ['update:modelValue', 'search'],
  template: '<div class="combo" />',
};

/**
 * Mounts the form with the given props.
 *
 * @param {object} props - Prop overrides.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountForm = props =>
  mount(ContactMergeForm, {
    props: { selectedContact: { id: 1, name: 'Ann' }, ...props },
    global: { stubs: { ComboBox, Avatar: true, Button: true, Icon: true } },
  });

describe('ContactMergeForm behaviour', () => {
  it('forwards the picked contact and search query', () => {
    const wrapper = mountForm();
    const combo = wrapper.getComponent(ComboBox);
    expect(combo.props('emptyState')).toBe(
      'CONTACTS_LAYOUT.SIDEBAR.MERGE.EMPTY_STATE'
    );
    combo.vm.$emit('update:modelValue', 7);
    combo.vm.$emit('search', 'bo');
    expect(wrapper.emitted('update:primaryContactId')).toEqual([[7]]);
    expect(wrapper.emitted('search')).toEqual([['bo']]);
  });

  it('shows the searching placeholder while searching', () => {
    const combo = mountForm({ isSearching: true }).getComponent(ComboBox);
    expect(combo.props('emptyState')).toBe(
      'CONTACTS_LAYOUT.SIDEBAR.MERGE.IS_SEARCHING'
    );
  });
});
