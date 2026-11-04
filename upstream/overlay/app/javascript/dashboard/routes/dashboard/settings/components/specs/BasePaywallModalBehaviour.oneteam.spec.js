/**
 * OneTeam behaviour spec for the settings BasePaywallModal.
 *
 * Covers the four audiences: cloud admins get an upgrade button, cloud
 * agents an escalation note, self-hosted super admins a link, and other
 * self-hosted users an ask-your-admin note.
 */
import { mount } from '@vue/test-utils';
import BasePaywallModal from '../BasePaywallModal.vue';

const env = vi.hoisted(() => ({ isAdmin: false }));

vi.mock('dashboard/composables/useAdmin', async () => {
  const { computed } = await import('vue');
  return { useAdmin: () => ({ isAdmin: computed(() => env.isAdmin) }) };
});

/**
 * Mounts the modal.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountModal = props =>
  mount(BasePaywallModal, {
    props: { featurePrefix: 'SLA', i18nKey: 'PAYWALL', ...props },
    global: {
      mocks: { $t: key => key },
      directives: { dompurifyHtml: {} },
      stubs: {
        Icon: true,
        ButtonV4: {
          emits: ['click'],
          template: '<button @click="$emit(\'click\')"><slot /></button>',
        },
      },
    },
  });

describe('BasePaywallModal behaviour', () => {
  it('lets a cloud admin upgrade', async () => {
    env.isAdmin = true;
    const wrapper = mountModal({ isOnChatwootCloud: true });
    expect(wrapper.text()).toContain('SLA.PAYWALL.CANCEL_ANYTIME');
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('upgrade')).toHaveLength(1);
  });

  it('tells a cloud agent to ask an admin', () => {
    env.isAdmin = false;
    const wrapper = mountModal({ isOnChatwootCloud: true });
    expect(wrapper.text()).toContain(
      'GENERAL_SETTINGS.LIMIT_MESSAGES.NON_ADMIN'
    );
    expect(wrapper.find('button').exists()).toBe(false);
  });

  it('links a self-hosted super admin to the super admin console', () => {
    const wrapper = mountModal({ isSuperAdmin: true });
    expect(wrapper.find('a').attributes('href')).toBe('/super_admin');
    expect(wrapper.text()).not.toContain('ASK_ADMIN');
  });

  it('tells other self-hosted users to ask an admin', () => {
    const wrapper = mountModal({});
    expect(wrapper.text()).toContain('SLA.ENTERPRISE_PAYWALL.ASK_ADMIN');
    expect(wrapper.find('a').exists()).toBe(false);
  });
});
