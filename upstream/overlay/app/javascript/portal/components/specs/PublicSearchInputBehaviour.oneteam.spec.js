/**
 * OneTeam behaviour spec for the portal PublicSearchInput.
 *
 * Covers sizes, the keyboard hint, input, focus and blur events and the
 * exposed focus helpers.
 */
import { mount } from '@vue/test-utils';
import PublicSearchInput from '../PublicSearchInput.vue';

/**
 * Mounts the search input.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountInput = props =>
  mount(PublicSearchInput, {
    props,
    attachTo: document.body,
    global: { stubs: { FluentIcon: true } },
  });

describe('PublicSearchInput behaviour', () => {
  it('uses the default size without a keyboard hint', () => {
    const wrapper = mountInput({});
    expect(wrapper.classes()).toContain('h-12');
    expect(wrapper.find('kbd').exists()).toBe(false);
    wrapper.unmount();
  });

  it('uses the small size and shows the keyboard hint', () => {
    const wrapper = mountInput({ size: 'small', kbd: '/' });
    expect(wrapper.classes()).toContain('h-9');
    expect(wrapper.find('kbd').text()).toBe('/');
    wrapper.unmount();
  });

  it('emits input, focus and blur with the value', async () => {
    const wrapper = mountInput({ searchTerm: 'abc' });
    const input = wrapper.find('input');
    await input.setValue('hello');
    await input.trigger('focus');
    expect(wrapper.classes()).toContain('ring-4');
    await input.trigger('blur');
    expect(wrapper.classes()).toContain('ring-0');
    expect(wrapper.emitted('update:searchTerm')).toEqual([['hello']]);
    expect(wrapper.emitted('focus')).toHaveLength(1);
    expect(wrapper.emitted('blur')[0][0]).toBe(input.element.value);
    wrapper.unmount();
  });

  it('focuses and blurs the input through the exposed helpers', () => {
    const wrapper = mountInput({});
    wrapper.vm.focusInput();
    expect(document.activeElement).toBe(wrapper.find('input').element);
    wrapper.vm.blurInput();
    expect(document.activeElement).not.toBe(wrapper.find('input').element);
    wrapper.unmount();
  });

  it('ignores the helpers once the input is gone', () => {
    const wrapper = mountInput({});
    const { focusInput, blurInput } = wrapper.vm;
    wrapper.vm.$.setupState.inputRef = null;
    expect(() => {
      focusInput();
      blurInput();
    }).not.toThrow();
    wrapper.unmount();
  });
});
