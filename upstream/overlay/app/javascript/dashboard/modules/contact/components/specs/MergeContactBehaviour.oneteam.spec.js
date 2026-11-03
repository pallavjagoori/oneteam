/**
 * OneTeam behaviour spec for the merge contact form.
 *
 * Covers mapping search results into the picker, forwarding searches,
 * the validation error when submitting without a primary contact, the
 * summary names, submitting the picked contact, and cancelling.
 */
import { mount } from '@vue/test-utils';
import MergeContact from '../MergeContact.vue';

const Form = {
  name: 'ContactMergeForm',
  props: ['primaryContactList', 'hasError', 'errorMessage'],
  emits: ['update:primaryContactId', 'search'],
  template: '<div />',
};
const Summary = {
  name: 'MergeContactSummary',
  props: ['primaryContactName', 'parentContactName'],
  template: '<div />',
};

const results = [
  { id: 7, name: 'Ada', email: 'a@x.io', phone_number: '1', thumbnail: 't' },
];
const mountForm = () =>
  mount(MergeContact, {
    props: { primaryContact: { id: 1, name: 'Bob' }, searchResults: results },
    global: {
      stubs: {
        ContactMergeForm: Form,
        MergeContactSummary: Summary,
        NextButton: {
          props: ['type'],
          emits: ['click'],
          template: '<button :type="type" @click="$emit(\'click\', $event)" />',
        },
      },
    },
  });

describe('MergeContact behaviour', () => {
  it('validates, picks and submits a contact', async () => {
    const wrapper = mountForm();
    const form = wrapper.findComponent(Form);
    expect(form.props('primaryContactList')).toEqual([
      {
        id: 7,
        label: 'Ada',
        value: 7,
        meta: { thumbnail: 't', email: 'a@x.io', phoneNumber: '1' },
      },
    ]);
    await form.vm.$emit('search', 'ad');
    expect(wrapper.emitted('search')).toEqual([['ad']]);
    expect(form.props('errorMessage')).toBe('');

    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('submit')).toBeUndefined();
    expect(form.props()).toMatchObject({
      hasError: true,
      errorMessage: 'MERGE_CONTACTS.FORM.CHILD_CONTACT.ERROR',
    });

    await form.vm.$emit('update:primaryContactId', 99);
    expect(wrapper.findComponent(Summary).props('parentContactName')).toBe('');
    await form.vm.$emit('update:primaryContactId', 7);
    expect(wrapper.findComponent(Summary).props()).toEqual({
      primaryContactName: 'Bob',
      parentContactName: 'Ada',
    });
    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('submit')).toEqual([[7]]);

    await wrapper.find('button[type="reset"]').trigger('click');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });
});
