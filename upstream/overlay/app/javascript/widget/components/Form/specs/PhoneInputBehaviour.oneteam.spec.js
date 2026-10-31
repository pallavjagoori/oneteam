/**
 * OneTeam behaviour spec for the widget pre-chat phone input.
 *
 * Covers the country picker (default country from the time zone,
 * search, keyboard navigation, selecting and clearing a country, closing
 * on outside click) and how the dial code and typed number are passed to
 * the FormKit node.
 */
import { mount, flushPromises } from '@vue/test-utils';
import PhoneInput from '../PhoneInput.vue';

const env = vi.hoisted(() => ({ code: 'IN', dial: '+91', clickaway: null }));

vi.mock('shared/components/PhoneInput/helper', () => ({
  getActiveCountryCode: () => env.code,
  getActiveDialCode: () => env.dial,
}));

const makeContext = (extra = {}) => ({
  value: '',
  attrs: { placeholder: 'Phone' },
  state: { invalid: false },
  node: { input: vi.fn() },
  blurHandler: vi.fn(),
  ...extra,
});

const mountInput = props =>
  mount(PhoneInput, {
    props,
    attachTo: document.body,
    global: {
      stubs: { FluentIcon: { props: ['icon'], template: '<i :id="icon" />' } },
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
const dropdown = wrapper => wrapper.find('.country-dropdown');
const rows = wrapper => wrapper.findAll('.country-dropdown--item');

describe('widget PhoneInput behaviour', () => {
  beforeEach(() => {
    env.code = 'IN';
    env.dial = '+91';
    Element.prototype.scrollTo = vi.fn();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('shows the time zone country, dial code and placeholder', () => {
    const wrapper = mountInput({ context: makeContext() });
    expect(wrapper.find('h5').text()).toBe('🇮🇳');
    expect(wrapper.text()).toContain('+91');
    expect(
      wrapper.find('input[name="phoneNumber"]').attributes()
    ).toMatchObject({ placeholder: 'Phone' });
    expect(wrapper.find('.phone-input').classes()).toContain('outline-n-weak');
  });

  it('shows a globe and no dial code without a known country', () => {
    env.code = '';
    env.dial = '';
    const wrapper = mountInput({
      context: makeContext({ attrs: {}, state: { invalid: true } }),
    });
    expect(wrapper.find('h5').exists()).toBe(false);
    expect(wrapper.find('#globe').exists()).toBe(true);
    expect(wrapper.find('span').exists()).toBe(false);
    expect(wrapper.find('input').attributes('placeholder')).toBe('');
    expect(wrapper.find('.phone-input').classes()).toContain(
      'outline-n-ruby-8'
    );
  });

  it('renders without any context', () => {
    env.code = '';
    const wrapper = mountInput();
    expect(wrapper.find('input').attributes('placeholder')).toBe('');
  });

  it('passes the dial code and typed number to the form and forwards blur', async () => {
    const context = makeContext({ value: '+9112' });
    const wrapper = mountInput({ context });
    const input = wrapper.find('input[name="phoneNumber"]');
    await input.setValue('98765');
    expect(context.node.input).toHaveBeenCalledWith('+9198765');
    await input.trigger('blur');
    expect(context.blurHandler).toHaveBeenCalled();
  });

  it('opens the picker, focuses search and scrolls to the active country', async () => {
    const wrapper = mountInput({ context: makeContext() });
    await toggle(wrapper);
    expect(document.activeElement).toBe(
      dropdown(wrapper).find('input').element
    );
    expect(rows(wrapper)[0].text()).toContain('Clear selection');
    expect(wrapper.find('.country-dropdown--item.active').text()).toContain(
      'India'
    );
    expect(Element.prototype.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'auto' })
    );
    await toggle(wrapper);
    expect(dropdown(wrapper).exists()).toBe(false);
  });

  it('labels the first row "Select Country" when none is active', async () => {
    env.code = '';
    const wrapper = mountInput({ context: makeContext() });
    await toggle(wrapper);
    expect(rows(wrapper)[0].text()).toContain('Select Country');
  });

  it('filters by name, dial code or id and shows an empty state', async () => {
    const wrapper = mountInput({ context: makeContext() });
    await toggle(wrapper);
    const search = dropdown(wrapper).find('input');
    await search.setValue('alban');
    expect(rows(wrapper).map(r => r.text())).toEqual([
      expect.stringContaining('Albania'),
    ]);
    await search.setValue('+355');
    expect(rows(wrapper)).toHaveLength(1);
    await search.setValue('al');
    expect(rows(wrapper).length).toBeGreaterThan(1);
    await search.setValue('zzzz');
    expect(rows(wrapper)).toHaveLength(0);
    expect(dropdown(wrapper).text()).toContain(
      'PRE_CHAT_FORM.FIELDS.PHONE_NUMBER.DROPDOWN_EMPTY'
    );
    // Moving with no rows highlights nothing and does not scroll.
    Element.prototype.scrollTo.mockClear();
    await dropdown(wrapper).trigger('keydown', { key: 'Down' });
    await flushPromises();
    expect(Element.prototype.scrollTo).not.toHaveBeenCalled();
  });

  it('moves with the arrow keys, wrapping around, and selects with Enter', async () => {
    const context = makeContext();
    const wrapper = mountInput({ context });
    await toggle(wrapper);
    const box = dropdown(wrapper);
    // Enter without a highlighted row does nothing.
    await box.trigger('keydown.enter');
    expect(context.node.input).not.toHaveBeenCalled();

    await box.trigger('keydown.up');
    await flushPromises();
    const last = rows(wrapper).length - 1;
    expect(rows(wrapper)[last].classes()).toContain('focus');
    await box.trigger('keydown.down');
    await flushPromises();
    expect(rows(wrapper)[0].classes()).toContain('focus');
    await box.trigger('keydown.up');
    await box.trigger('keydown.down');
    await box.trigger('keydown.down');
    await flushPromises();
    expect(rows(wrapper)[1].classes()).toContain('focus');
    const name = rows(wrapper)[1].text();

    await box.trigger('keydown.enter');
    expect(dropdown(wrapper).exists()).toBe(false);
    expect(context.node.input).toHaveBeenCalledWith(
      expect.stringMatching(/^\+\d+$/)
    );
    expect(name).toContain('Afghanistan');
    expect(wrapper.find('h5').text()).toBe('🇦🇫');
  });

  it('resets the highlight when the filtered list shrinks below it', async () => {
    const wrapper = mountInput({ context: makeContext() });
    await toggle(wrapper);
    const box = dropdown(wrapper);
    await box.trigger('keydown.up');
    await box.find('input').setValue('india');
    expect(rows(wrapper)[0].classes()).toContain('focus');
  });

  it('closes before a pending scroll runs', async () => {
    const wrapper = mountInput({ context: makeContext() });
    await toggle(wrapper);
    Element.prototype.scrollTo.mockClear();
    dropdown(wrapper).trigger('keydown.down');
    env.clickaway();
    await flushPromises();
    expect(Element.prototype.scrollTo).not.toHaveBeenCalled();
  });

  it('clears the country when the first row is clicked', async () => {
    const context = makeContext();
    const wrapper = mountInput({ context });
    await wrapper.find('input[name="phoneNumber"]').setValue('55');
    await toggle(wrapper);
    await rows(wrapper)[0].trigger('click');
    expect(context.node.input).toHaveBeenLastCalledWith('55');
    expect(wrapper.find('#globe').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('+91');
  });

  it('closes when clicking outside', async () => {
    const wrapper = mountInput({ context: makeContext() });
    await toggle(wrapper);
    env.clickaway();
    await flushPromises();
    expect(dropdown(wrapper).exists()).toBe(false);
  });
});
