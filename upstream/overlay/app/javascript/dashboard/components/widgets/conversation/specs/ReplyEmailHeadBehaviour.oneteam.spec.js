/**
 * OneTeam behaviour spec for the email reply's To, Cc, Bcc and Subject
 * fields.
 *
 * Covers the default subject (last custom outgoing subject, else
 * "Re: " plus the mail subject) and following it until the agent edits
 * the subject, keeping a given subject, revealing Cc and Bcc from
 * either row, showing them when they already hold addresses, syncing
 * outside changes in, and validating and saving addresses on blur.
 */
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import ReplyEmailHead from '../ReplyEmailHead.vue';

const chat = ref({});
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => chat,
}));

const WootInput = {
  name: 'WootInput',
  props: { modelValue: String, placeholder: String },
  emits: ['update:modelValue', 'blur'],
  template:
    '<input :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" @blur="$emit(\'blur\')" />',
};
const Button = {
  name: 'Button',
  props: { label: String },
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};

const P = 'CONVERSATION.REPLYBOX.EMAIL_HEAD';

const mountHead = (props = {}) =>
  mount(ReplyEmailHead, {
    props,
    global: { stubs: { WootInput, Button } },
  });

const field = (wrapper, placeholder) =>
  wrapper
    .findAll('input')
    .filter(i => i.attributes('placeholder') === placeholder);
const buttons = wrapper => wrapper.findAll('button').map(b => b.text());

describe('ReplyEmailHead behaviour', () => {
  beforeEach(() => {
    chat.value = { additional_attributes: { mail_subject: 'Order' } };
  });

  it('defaults the subject and follows it until edited', async () => {
    const wrapper = mountHead();
    expect(wrapper.emitted('update:subject')).toEqual([['Re: Order']]);

    await wrapper.setProps({ subject: 'Re: Order' });
    chat.value = {
      messages: [
        {
          message_type: 1,
          content_attributes: { email: { subject: 'Custom' } },
        },
        {
          message_type: 0,
          content_attributes: { email: { subject: 'Incoming' } },
        },
      ],
    };
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:subject').at(-1)).toEqual(['Custom']);

    await wrapper.setProps({ subject: 'My own subject' });
    chat.value = { additional_attributes: { mail_subject: 'Other' } };
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:subject')).toHaveLength(2);

    const subject = field(wrapper, `${P}.SUBJECT.PLACEHOLDER`)[0];
    await subject.setValue('Typed');
    expect(wrapper.emitted('update:subject').at(-1)).toEqual(['Typed']);
  });

  it('keeps a given subject', () => {
    expect(mountHead({ subject: 'Hello' }).emitted('update:subject')).toBe(
      undefined
    );
  });

  it('reveals Cc and Bcc fields', async () => {
    const wrapper = mountHead();
    expect(buttons(wrapper)).toEqual([`${P}.CC.LABEL`, `${P}.BCC.LABEL`]);
    await wrapper.findAll('button')[0].trigger('click');
    expect(wrapper.text()).toContain(`${P}.CC.LABEL`);
    expect(buttons(wrapper)).toEqual([`${P}.BCC.LABEL`]);
    await wrapper.findAll('button')[0].trigger('click');
    expect(buttons(wrapper)).toEqual([]);
    expect(field(wrapper, `${P}.BCC.PLACEHOLDER`)).toHaveLength(1);

    const bccFirst = mountHead();
    await bccFirst.findAll('button')[1].trigger('click');
    expect(buttons(bccFirst)).toEqual([`${P}.CC.LABEL`]);
    await bccFirst.findAll('button')[0].trigger('click');
    expect(buttons(bccFirst)).toEqual([]);

    const filled = mountHead({ ccEmails: 'a@b.co', bccEmails: 'c@d.co' });
    expect(buttons(filled)).toEqual([]);
    expect(
      field(filled, `${P}.CC.PLACEHOLDER`).map(i => i.element.value)
    ).toEqual(['', 'a@b.co']);
  });

  it('syncs outside changes into the fields', async () => {
    const wrapper = mountHead({ ccEmails: 'x@y.co', bccEmails: 'b@y.co' });
    await wrapper.setProps({
      toEmails: 'to@y.co',
      ccEmails: 'cc@y.co',
      bccEmails: 'bcc@y.co',
    });
    const [to, cc] = field(wrapper, `${P}.CC.PLACEHOLDER`);
    expect(to.element.value).toBe('to@y.co');
    expect(cc.element.value).toBe('cc@y.co');
    expect(field(wrapper, `${P}.BCC.PLACEHOLDER`)[0].element.value).toBe(
      'bcc@y.co'
    );
  });

  it('validates and saves addresses on blur', async () => {
    const wrapper = mountHead({ ccEmails: 'x@y.co', bccEmails: 'b@y.co' });
    const [to, cc] = field(wrapper, `${P}.CC.PLACEHOLDER`);
    const bcc = field(wrapper, `${P}.BCC.PLACEHOLDER`)[0];
    expect(wrapper.findAll('.error')).toHaveLength(0);

    await to.setValue('nope');
    await cc.setValue('bad, worse');
    await bcc.setValue('also bad');
    await to.trigger('blur');
    expect(wrapper.emitted('update:toEmails').at(-1)).toEqual(['nope']);
    expect(wrapper.emitted('update:ccEmails').at(-1)).toEqual(['bad, worse']);
    expect(wrapper.emitted('update:bccEmails').at(-1)).toEqual(['also bad']);
    expect(wrapper.text()).toContain(`${P}.CC.ERROR`);
    expect(wrapper.text()).toContain(`${P}.BCC.ERROR`);
    expect(wrapper.findAll('label.text-n-ruby-8')).toHaveLength(3);

    await to.setValue('a@b.co, c@d.co');
    await cc.setValue('ok@b.co');
    await bcc.setValue('');
    await cc.trigger('blur');
    await bcc.trigger('blur');
    expect(wrapper.findAll('.error')).toHaveLength(0);
    expect(wrapper.text()).not.toContain(`${P}.CC.ERROR`);
  });
});
