/**
 * OneTeam behaviour spec for the dropdown menu body.
 *
 * Covers the default weak border and the strong border plus extra blur
 * layer used when dropdowns are stacked.
 */
import { mount } from '@vue/test-utils';
import DropdownBody from '../DropdownBody.vue';

describe('DropdownBody behaviour', () => {
  it('uses a weak border by default', () => {
    const wrapper = mount(DropdownBody, { slots: { default: '<li>One</li>' } });
    const list = wrapper.get('ul');
    expect(list.text()).toBe('One');
    expect(list.classes()).toContain('border-n-weak');
    expect(list.classes()).not.toContain('before:absolute');
  });

  it('adds a strong border and blur layer when stacked', () => {
    const list = mount(DropdownBody, { props: { strong: true } }).get('ul');
    expect(list.classes()).toContain('border-n-strong');
    expect(list.classes()).toContain('before:absolute');
  });
});
