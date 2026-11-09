/**
 * OneTeam behaviour spec for the custom tool HeadersConfig rows.
 *
 * Covers validation messages per row: a valid row keeps an empty message
 * while a sibling row without a name shows the required error, and
 * duplicate names (case-insensitive) show the duplicate error.
 */
import { mount } from '@vue/test-utils';
import HeadersConfig from '../HeadersConfig.vue';

const Input = {
  name: 'Input',
  props: {
    modelValue: { type: String, default: '' },
    message: { type: String, default: '' },
    messageType: { type: String, default: '' },
  },
  emits: ['update:modelValue'],
  template: '<input :value="modelValue" />',
};
const Button = { name: 'Button', template: '<button />' };

const mountConfig = headers =>
  mount(HeadersConfig, {
    props: { headers },
    global: {
      stubs: { Input, Button },
      mocks: { $t: key => key },
    },
  });

const nameMessages = wrapper =>
  wrapper
    .findAllComponents(Input)
    .filter((_, index) => index % 2 === 0)
    .map(input => input.props('message'));

describe('HeadersConfig behaviour', () => {
  it('keeps valid rows message-free next to a row missing its name', async () => {
    const wrapper = mountConfig({ 'X-Token': 'abc', '': 'orphan' });
    expect(wrapper.vm.validate()).toBe(false);
    await wrapper.vm.$nextTick();
    expect(nameMessages(wrapper)).toEqual([
      '',
      'CAPTAIN.CUSTOM_TOOLS.FORM.HEADERS.NAME_REQUIRED',
    ]);
  });

  it('flags duplicate names and passes when every row is valid', async () => {
    const wrapper = mountConfig({ 'X-A': '1', 'x-a ': '2' });
    expect(wrapper.vm.validate()).toBe(false);
    await wrapper.vm.$nextTick();
    expect(nameMessages(wrapper)).toEqual([
      'CAPTAIN.CUSTOM_TOOLS.FORM.HEADERS.NAME_DUPLICATE',
      'CAPTAIN.CUSTOM_TOOLS.FORM.HEADERS.NAME_DUPLICATE',
    ]);
    expect(mountConfig({ 'X-B': '1' }).vm.validate()).toBe(true);
  });
});
