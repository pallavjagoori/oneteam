/**
 * OneTeam behaviour spec for the form bubble a bot sends in the widget.
 *
 * Covers rendering email, text, textarea and select fields with their
 * defaults, refusing to submit until every field has a value, marking
 * fields after a submit click, submitting the values, the custom and
 * default button labels and error messages, and showing an already
 * submitted form read-only.
 */
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import ChatForm from '../ChatForm.vue';

const items = [
  {
    key: 'e',
    name: 'email',
    type: 'email',
    label: 'Email',
    regex: '.+@.+',
    required: true,
    pattern_error: 'Bad email',
  },
  {
    key: 'n',
    name: 'name',
    type: 'text',
    label: 'Name',
    pattern: '[a-z]+',
    default: 'anon',
  },
  { key: 'm', name: 'note', type: 'text_area', label: 'Note' },
  {
    key: 's',
    name: 'size',
    type: 'select',
    label: 'Size',
    default: 'm',
    options: [
      { key: 's', value: 's', label: 'Small' },
      { key: 'm', value: 'm', label: 'Medium' },
    ],
  },
];

const mountForm = (props = {}) => {
  const store = createStore({
    getters: { 'appConfig/getWidgetColor': () => '#ffffff' },
  });
  return mount(ChatForm, {
    props: { items, ...props },
    global: { plugins: [store], mocks: { $t: key => key } },
  });
};

describe('ChatForm behaviour', () => {
  it('renders each field type with defaults', async () => {
    const wrapper = mountForm();
    await nextTick();
    expect(wrapper.find('input[type="email"]').attributes()).toMatchObject({
      pattern: '.+@.+',
      required: '',
      name: 'email',
    });
    expect(wrapper.find('input[type="text"]').element.value).toBe('anon');
    expect(
      wrapper.find('input[type="text"]').attributes('required')
    ).toBeUndefined();
    expect(wrapper.find('textarea').exists()).toBe(true);
    expect(wrapper.find('select').element.value).toBe('m');
    expect(wrapper.findAll('.error-message').map(e => e.text())).toEqual([
      'Bad email',
      'CHAT_FORM.INVALID.FIELD',
      'CHAT_FORM.INVALID.FIELD',
      'CHAT_FORM.INVALID.FIELD',
    ]);
    const button = wrapper.find('button');
    expect(button.text()).toBe('COMPONENTS.FORM_BUBBLE.SUBMIT');
    expect(button.attributes('style')).toContain('color: rgb(0, 0, 0)');
  });

  it('submits only once every field has a value', async () => {
    const wrapper = mountForm({ buttonLabel: 'Send' });
    const button = wrapper.find('button');
    expect(button.text()).toBe('Send');
    await button.trigger('click');
    expect(wrapper.find('.has-submitted').exists()).toBe(true);
    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('submit')).toBeUndefined();

    await wrapper.find('input[type="email"]').setValue('a@b.co');
    await wrapper.find('textarea').setValue('hi');
    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('submit')[0][0]).toEqual({
      email: 'a@b.co',
      name: 'anon',
      note: 'hi',
      size: 'm',
    });
  });

  it('shows submitted values read-only', async () => {
    const wrapper = mountForm({
      submittedValues: [
        { name: 'email', value: 'x@y.z' },
        { name: 'name', value: 'zed' },
        { name: 'note', value: 'ok' },
        { name: 'size', value: 's' },
      ],
    });
    await nextTick();
    expect(wrapper.find('button').exists()).toBe(false);
    expect(wrapper.find('input[type="email"]').element.value).toBe('x@y.z');
    expect(wrapper.find('input[type="email"]').attributes('disabled')).toBe('');
    expect(wrapper.find('textarea').attributes('disabled')).toBe('');
    expect(wrapper.find('select').element.value).toBe('s');
  });

  it('renders no inputs for an unknown field type', () => {
    const wrapper = mountForm({
      items: [{ key: 'x', name: 'x', type: 'date', label: 'When' }],
    });
    expect(wrapper.text()).toContain('When');
    expect(wrapper.findAll('input, textarea, select')).toHaveLength(0);
  });

  it('submits an empty form when there are no fields', async () => {
    const store = createStore({
      getters: { 'appConfig/getWidgetColor': () => '#ffffff' },
    });
    const wrapper = mount(ChatForm, {
      global: { plugins: [store], mocks: { $t: key => key } },
    });
    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('submit')[0][0]).toEqual({});
  });
});
