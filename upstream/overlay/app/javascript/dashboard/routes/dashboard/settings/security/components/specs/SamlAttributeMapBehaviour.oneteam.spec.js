/**
 * OneTeam behaviour spec for the SAML attribute mapping help.
 *
 * Covers the collapsed section and expanding it to list the attributes.
 */
import { mount } from '@vue/test-utils';
import SamlAttributeMap from '../SamlAttributeMap.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

describe('SamlAttributeMap behaviour', () => {
  it('expands and collapses the attribute list', async () => {
    const wrapper = mount(SamlAttributeMap, {
      global: { stubs: { Icon: true } },
    });
    expect(wrapper.find('.h-0').exists()).toBe(true);
    expect(wrapper.findAll('code').map(c => c.text())).toEqual([
      'email',
      'first_name',
      'last_name',
    ]);
    await wrapper.get('button').trigger('click');
    expect(wrapper.find('.h-auto').exists()).toBe(true);
    await wrapper.get('button').trigger('click');
    expect(wrapper.find('.h-0').exists()).toBe(true);
  });
});
