/**
 * OneTeam behaviour spec for the dashboard phone input used in the
 * contact form.
 *
 * Covers reading the country from the bound number, the country picker
 * (search, keyboard navigation, selection, outside click) and the
 * events sent back to the form.
 */
import { mount, flushPromises } from '@vue/test-utils';
import PhoneInput from '../PhoneInput.vue';

const env = vi.hoisted(() => ({ code: 'IN', dial: '+91', clickaway: null }));

vi.mock('shared/components/PhoneInput/helper', () => ({
  getActiveCountryCode: () => env.code,
  getActiveDialCode: () => env.dial,
}));

const mountInput = props =>
  mount(PhoneInput, {
    props,
    attachTo: document.body,
    global: {
      stubs: {
        FluentIcon: { props: ['icon'], template: '<i :id="icon" />' },
      },
      directives: {
        onClickaway: {
          mounted: (_, binding) => {
            env.clickaway = binding.value;
          },
        },
      },
    },
  });

const toggle = async wrapper => {
  await wrapper.find('.cursor-pointer').trigger('click');
  await flushPromises();
};
const dropdown = wrapper => wrapper.find('[tabindex="0"]');
const rows = wrapper => dropdown(wrapper).findAll('.h-7');
const phone = wrapper => wrapper.find('input[type="tel"]');

describe('dashboard PhoneInput behaviour', () => {
  beforeEach(() => {
    env.code = 'IN';
    env.dial = '+91';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('starts with the time zone country and the input props', () => {
    const wrapper = mountInput({
      placeholder: 'Phone',
      readonly: true,
      styles: { color: 'red' },
    });
    expect(wrapper.find('h5').text()).toBe('🇮🇳');
    expect(wrapper.text()).toContain('+91');
    expect(phone(wrapper).attributes()).toMatchObject({
      placeholder: 'Phone',
      readonly: '',
      style: 'color: red;',
    });
    expect(wrapper.find('.outline').classes()).toContain('mb-4');
  });

  it('shows a globe without a country and an error outline', () => {
    env.code = '';
    env.dial = '';
    const wrapper = mountInput({ error: true });
    expect(wrapper.find('h5').exists()).toBe(false);
    expect(wrapper.find('#globe').exists()).toBe(true);
    expect(wrapper.find('span').exists()).toBe(false);
    expect(wrapper.find('.outline').classes()).toContain('outline-n-ruby-8');
  });

  it('reads the country from a full number on mount, keeping the number as is', async () => {
    const wrapper = mountInput({ modelValue: '+14155552671' });
    await flushPromises();
    expect(wrapper.find('h5').text()).toBe('🇺🇸');
    // On mount the dial code is shown without "+" and the number keeps its
    // country code, unlike when the value changes later.
    expect(wrapper.find('span').text()).toBe('1');
    expect(phone(wrapper).element.value).toBe('+14155552671');
  });

  it('ignores a number it cannot parse', async () => {
    const wrapper = mountInput({ modelValue: 'abc' });
    expect(wrapper.find('h5').text()).toBe('🇮🇳');
    await wrapper.setProps({ modelValue: 'xyz' });
    expect(wrapper.find('span').text()).toBe('+91');
  });

  it('splits a new bound number into country, dial code and number', async () => {
    const wrapper = mountInput();
    await wrapper.setProps({ modelValue: '+447400123456' });
    expect(wrapper.find('h5').text()).toBe('🇬🇧');
    expect(wrapper.find('span').text()).toBe('+44');
    expect(phone(wrapper).element.value).toBe('7400123456');
  });

  it('emits the typed number, the dial code and blur', async () => {
    const wrapper = mountInput();
    await phone(wrapper).setValue('98765');
    expect(wrapper.emitted('update:modelValue')).toEqual([['98765']]);
    expect(wrapper.emitted('setCode')).toEqual([['+91']]);
    await phone(wrapper).trigger('blur');
    expect(wrapper.emitted('blur')).toEqual([['98765']]);
  });

  it('opens the picker with search focused and filters countries', async () => {
    const wrapper = mountInput();
    await toggle(wrapper);
    const search = dropdown(wrapper).find('input');
    expect(document.activeElement).toBe(search.element);
    expect(rows(wrapper)[0].text()).toContain('Clear selection');
    await search.setValue('+355');
    expect(rows(wrapper).map(r => r.text())).toEqual([
      expect.stringContaining('Albania'),
    ]);
    await search.setValue('al');
    expect(rows(wrapper).length).toBeGreaterThan(1);
    await search.setValue('zzzz');
    expect(dropdown(wrapper).text()).toContain(
      'GENERAL.PHONE_INPUT.EMPTY_STATE'
    );
    // Arrow keys with no rows have nothing to scroll to.
    await dropdown(wrapper).trigger('keydown.down');
    await flushPromises();
    await toggle(wrapper);
    expect(dropdown(wrapper).exists()).toBe(false);
  });

  it('labels the first row "Select Country" when none is active', async () => {
    env.code = '';
    const wrapper = mountInput();
    await toggle(wrapper);
    expect(rows(wrapper)[0].text()).toContain('Select Country');
  });

  it('moves with the arrow keys and selects with Enter', async () => {
    const wrapper = mountInput();
    await toggle(wrapper);
    const box = dropdown(wrapper);
    // Enter with nothing highlighted does nothing.
    await box.trigger('keydown.enter');
    expect(wrapper.emitted('setCode')).toBeUndefined();

    await box.find('input').setValue('alg');
    await box.trigger('keydown.up');
    await box.trigger('keydown.down');
    await box.trigger('keydown.down');
    await flushPromises();
    expect(box.element.scrollTop).toBe(rows(wrapper)[0].element.offsetTop - 40);
    await box.trigger('keydown.enter');
    expect(wrapper.emitted('setCode')).toEqual([['+213']]);
    expect(dropdown(wrapper).exists()).toBe(false);
    expect(wrapper.find('h5').text()).toBe('🇩🇿');
    expect(document.activeElement).toBe(phone(wrapper).element);
  });

  it('selects a clicked country', async () => {
    const wrapper = mountInput();
    await toggle(wrapper);
    await rows(wrapper)[0].trigger('click');
    expect(wrapper.emitted('setCode')).toEqual([['']]);
    expect(wrapper.find('#globe').exists()).toBe(true);
  });

  it('ignores keyboard moves and selection while closed', () => {
    const wrapper = mountInput();
    wrapper.vm.moveUp();
    wrapper.vm.moveDown();
    wrapper.vm.onSelectCountry({ id: 'AL', dial_code: '+355' });
    expect(wrapper.emitted('setCode')).toBeUndefined();
  });

  it('closes on a click outside but not on a click inside', async () => {
    const wrapper = mountInput();
    await toggle(wrapper);
    const box = dropdown(wrapper);
    env.clickaway({ target: box.element });
    env.clickaway({ target: box.find('input').element });
    await flushPromises();
    expect(dropdown(wrapper).exists()).toBe(true);
    const handler = env.clickaway;
    handler({ target: document.body });
    await flushPromises();
    expect(dropdown(wrapper).exists()).toBe(false);
    // A late outside click after closing is ignored.
    handler({ target: document.body });
  });
});
