/**
 * OneTeam behaviour spec for the SAML service provider info rows.
 *
 * Covers which rows show and copying a value with a success alert.
 */
import { mount, flushPromises } from '@vue/test-utils';
import SamlInfoSection from '../SamlInfoSection.vue';

const env = vi.hoisted(() => ({ copy: vi.fn(), alert: vi.fn() }));

vi.mock('shared/helpers/clipboard', () => ({
  copyTextToClipboard: (...args) => env.copy(...args),
}));
vi.mock('dashboard/composables', () => ({
  useAlert: (...args) => env.alert(...args),
}));
vi.mock('dashboard/composables/useAccount', async () => {
  const { computed } = await import('vue');
  return { useAccount: () => ({ accountId: computed(() => 7) }) };
});

const NextButton = {
  name: 'NextButton',
  emits: ['click'],
  template: '<button @click="$emit(\'click\')" />',
};

describe('SamlInfoSection behaviour', () => {
  it('lists the set values and copies one', async () => {
    const wrapper = mount(SamlInfoSection, {
      props: { fingerprint: 'AB:CD', spEntityId: '' },
      global: { stubs: { NextButton }, directives: { tooltip: {} } },
    });
    const rows = wrapper.findAll('.ps-4');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('/omniauth/saml/callback?account_id=7');
    await rows[1].find('button').trigger('click');
    await flushPromises();
    expect(env.copy).toHaveBeenCalledWith('AB:CD');
    expect(env.alert).toHaveBeenCalledWith(
      'SECURITY_SETTINGS.SAML.COPY_SUCCESS'
    );
  });
});
