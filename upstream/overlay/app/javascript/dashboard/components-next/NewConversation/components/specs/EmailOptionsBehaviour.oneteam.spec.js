/**
 * OneTeam behaviour spec for the compose email options (subject, CC, BCC).
 *
 * Covers the subject v-model, splitting and joining CC/BCC lists, toggling
 * the BCC input, forwarding search and click-outside events, and the error
 * placeholder class.
 */
import { mount } from '@vue/test-utils';
import EmailOptions from '../EmailOptions.vue';

const InlineInput = {
  name: 'InlineInput',
  props: ['modelValue', 'customInputClass'],
  emits: ['update:modelValue'],
  template: '<input class="subject" />',
};
const RecipientsInput = {
  name: 'RecipientsInput',
  props: ['modelValue', 'label'],
  emits: ['input', 'onClickOutside', 'update:modelValue'],
  template: '<div class="recipients"><slot /></div>',
};
const Button = {
  name: 'NextButton',
  emits: ['click'],
  template: '<button class="bcc" @click="$emit(\'click\')" />',
};

/**
 * Mounts the options with the given props.
 *
 * @param {object} props - Prop overrides.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountOptions = props =>
  mount(EmailOptions, {
    props: { contacts: [], ...props },
    global: { stubs: { InlineInput, RecipientsInput, Button } },
  });

describe('EmailOptions behaviour', () => {
  it('updates the subject and CC list', () => {
    const wrapper = mountOptions({ ccEmails: 'a@x.test, b@x.test' });
    const subject = wrapper.getComponent(InlineInput);
    expect(subject.props('customInputClass')).toBe('');
    subject.vm.$emit('update:modelValue', 'Hello');
    expect(wrapper.emitted('update:subject')).toEqual([['Hello']]);

    const cc = wrapper.getComponent(RecipientsInput);
    expect(cc.props('modelValue')).toEqual(['a@x.test', 'b@x.test']);
    cc.vm.$emit('update:modelValue', ['c@x.test', 'd@x.test']);
    expect(wrapper.emitted('update:ccEmails')).toEqual([['c@x.test,d@x.test']]);
    cc.vm.$emit('input', 'c@');
    cc.vm.$emit('onClickOutside');
    expect(wrapper.emitted('searchCcEmails')).toEqual([['c@']]);
    expect(wrapper.emitted('updateDropdown')).toEqual([['cc', false]]);
  });

  it('toggles the BCC input and updates the BCC list', async () => {
    const wrapper = mountOptions({ bccEmails: 'z@x.test', hasErrors: true });
    expect(
      wrapper.getComponent(InlineInput).props('customInputClass')
    ).toContain('placeholder:!text-n-ruby-9');
    expect(wrapper.findAllComponents(RecipientsInput)).toHaveLength(1);
    await wrapper.find('.bcc').trigger('click');
    const bcc = wrapper.findAllComponents(RecipientsInput)[1];
    expect(bcc.props('modelValue')).toEqual(['z@x.test']);
    bcc.vm.$emit('update:modelValue', ['y@x.test']);
    bcc.vm.$emit('input', 'y@');
    bcc.vm.$emit('onClickOutside');
    expect(wrapper.emitted('update:bccEmails')).toEqual([['y@x.test']]);
    expect(wrapper.emitted('searchBccEmails')).toEqual([['y@']]);
    expect(wrapper.emitted('updateDropdown')).toEqual([['bcc', false]]);
    await wrapper.find('.bcc').trigger('click');
    expect(wrapper.findAllComponents(RecipientsInput)).toHaveLength(1);
  });

  it('shows an empty BCC list without addresses', async () => {
    const wrapper = mountOptions();
    expect(wrapper.getComponent(RecipientsInput).props('modelValue')).toEqual(
      []
    );
    await wrapper.find('.bcc').trigger('click');
    expect(
      wrapper.findAllComponents(RecipientsInput)[1].props('modelValue')
    ).toEqual([]);
  });
});
