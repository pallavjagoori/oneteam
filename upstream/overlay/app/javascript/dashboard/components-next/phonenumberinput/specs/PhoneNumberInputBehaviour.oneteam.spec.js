/**
 * OneTeam behaviour spec for the phone number input with country picker.
 *
 * Covers the timezone-based default country, parsing an incoming number,
 * emitting full numbers for valid input, number and dial-code errors, the
 * country dropdown (toggle, select, ignored selections, click-away), and
 * the border classes with and without a border or errors.
 */
import { mount, flushPromises } from '@vue/test-utils';
import PhoneNumberInput from '../PhoneNumberInput.vue';

const env = vi.hoisted(() => ({ country: 'IN', dial: '+91', clickaway: null }));

vi.mock('shared/components/PhoneInput/helper', () => ({
  getActiveCountryCode: () => env.country,
  getActiveDialCode: () => env.dial,
}));

const Input = {
  name: 'Input',
  props: ['modelValue', 'disabled'],
  emits: ['update:modelValue'],
  template:
    '<label><slot name="prefix" /><input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /></label>',
};
const Button = {
  name: 'Button',
  props: ['label', 'icon'],
  emits: ['click'],
  template:
    '<button :data-icon="icon" @click="$emit(\'click\')"><slot /></button>',
};
const DropdownMenu = {
  name: 'DropdownMenu',
  props: ['menuItems'],
  emits: ['action'],
  template: '<ul class="countries" />',
};

const mountInput = async props => {
  const wrapper = mount(PhoneNumberInput, {
    props,
    global: {
      stubs: { Input, Button, DropdownMenu },
      directives: {
        onClickaway: {
          mounted: (el, b) => {
            env.clickaway = b.value;
          },
        },
      },
    },
  });
  await flushPromises();
  return wrapper;
};
const box = wrapper => wrapper.find('.outline');
const type = async (wrapper, value) => {
  await wrapper.find('input').setValue(value);
  await flushPromises();
};
const emitted = wrapper => wrapper.emitted('update:modelValue') || [];
const menu = wrapper => wrapper.findComponent(DropdownMenu);

describe('PhoneNumberInput behaviour', () => {
  beforeEach(() => {
    env.country = 'IN';
    env.dial = '+91';
  });

  it('starts with the timezone country', async () => {
    const wrapper = await mountInput();
    expect(wrapper.find('button').attributes('data-icon')).toBe(
      'i-lucide-chevron-down'
    );
    expect(wrapper.find('button').text()).toBe('🇮🇳');
    expect(wrapper.text()).toContain('+91');
    expect(box(wrapper).classes()).toContain('outline-n-weak');
  });

  it('shows a globe and an error border without a country', async () => {
    env.country = '';
    env.dial = '';
    const wrapper = await mountInput({ disabled: true });
    expect(wrapper.find('button').attributes('data-icon')).toBe(
      'i-lucide-globe'
    );
    expect(wrapper.find('button').text()).toBe('');
    expect(box(wrapper).classes()).toContain('outline-n-ruby-8');
    expect(box(wrapper).classes()).toContain('cursor-not-allowed');
    expect(wrapper.find('p').exists()).toBe(false);
  });

  it('parses an incoming number', async () => {
    const wrapper = await mountInput({ modelValue: '+14155552671' });
    expect(wrapper.find('input').element.value).toBe('4155552671');
    expect(wrapper.text()).toContain('+1');
    expect(wrapper.find('button').text()).toBe('🇺🇸');
    await wrapper.setProps({ modelValue: 'not a number' });
    await flushPromises();
    expect(wrapper.find('input').element.value).toBe('4155552671');
  });

  it('emits full numbers for valid input and flags bad input', async () => {
    const wrapper = await mountInput();
    await type(wrapper, '9876543210');
    expect(emitted(wrapper).at(-1)).toEqual(['+919876543210']);
    await type(wrapper, '');
    expect(emitted(wrapper).at(-1)).toEqual(['']);
    const count = emitted(wrapper).length;
    await type(wrapper, '98ab');
    expect(emitted(wrapper)).toHaveLength(count);
    expect(wrapper.find('p').text()).toBe('PHONE_INPUT.ERROR');
    expect(box(wrapper).classes()).toContain('outline-n-ruby-8');
  });

  it('flags an unknown dial code', async () => {
    env.dial = '+999';
    const wrapper = await mountInput();
    await type(wrapper, '12345');
    expect(wrapper.find('p').text()).toBe('PHONE_INPUT.DIAL_CODE_ERROR');
  });

  it('picks a country from the dropdown', async () => {
    const wrapper = await mountInput();
    await type(wrapper, '4155552671');
    const usa = { value: 'US', dialCode: '+1' };
    expect(menu(wrapper).exists()).toBe(false);
    wrapper.vm.$.setupState.onSelectCountry(usa);
    await wrapper.find('button').trigger('click');
    const items = menu(wrapper).props('menuItems');
    expect(items.find(item => item.value === 'IN')).toMatchObject({
      label: 'India',
      dialCode: '+91',
      isSelected: true,
      action: 'phoneNumberInput',
    });
    await menu(wrapper).vm.$emit('action', { value: '', dialCode: '' });
    expect(menu(wrapper).exists()).toBe(true);
    await menu(wrapper).vm.$emit('action', usa);
    await flushPromises();
    expect(menu(wrapper).exists()).toBe(false);
    expect(emitted(wrapper).at(-1)).toEqual(['+14155552671']);
    expect(wrapper.find('button').text()).toBe('🇺🇸');
  });

  it('keeps the number when switching country with invalid or empty input', async () => {
    const wrapper = await mountInput();
    await wrapper.find('button').trigger('click');
    await menu(wrapper).vm.$emit('action', { value: 'US', dialCode: '+1' });
    await flushPromises();
    expect(emitted(wrapper)).toHaveLength(0);
    await type(wrapper, 'x');
    await wrapper.find('button').trigger('click');
    await menu(wrapper).vm.$emit('action', { value: 'IN', dialCode: '+91' });
    await flushPromises();
    expect(emitted(wrapper)).toHaveLength(0);
  });

  it('closes the dropdown on click-away', async () => {
    const wrapper = await mountInput();
    await wrapper.find('button').trigger('click');
    env.clickaway();
    await flushPromises();
    expect(menu(wrapper).exists()).toBe(false);
  });

  it('uses borderless classes', async () => {
    const wrapper = await mountInput({ showBorder: false });
    expect(box(wrapper).classes()).toContain('outline-transparent');
    await type(wrapper, 'x');
    expect(box(wrapper).classes()).toContain('outline-n-ruby-8');
  });
});
