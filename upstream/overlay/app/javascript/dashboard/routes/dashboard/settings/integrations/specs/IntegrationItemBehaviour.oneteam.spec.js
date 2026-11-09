/**
 * OneTeam behaviour spec for an integrations list card.
 *
 * Covers the status label and colour, SVG versus PNG logos, and the
 * configure link that points at the integration's settings page.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import IntegrationItem from '../IntegrationItem.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/composables/store', () => ({
  useStoreGetters: () => ({ getCurrentAccountId: ref(3) }),
}));
vi.mock('shared/composables/useBranding', () => ({
  useBranding: () => ({ replaceInstallationName: text => text }),
}));

const RouterLink = {
  name: 'RouterLink',
  props: { to: { type: String, default: '' } },
  template: '<a :href="to"><slot /></a>',
};
const Button = {
  name: 'Button',
  props: { label: { type: String, default: '' } },
  template: '<button>{{ label }}</button>',
};
const Label = {
  name: 'Label',
  props: {
    label: { type: String, default: '' },
    color: { type: String, default: '' },
  },
  template: '<span class="status" />',
};

const mountItem = props =>
  mount(IntegrationItem, {
    props: { name: 'Stripe', description: 'Billing', ...props },
    global: {
      stubs: { RouterLink, Button, Label },
      mocks: { $t: key => key },
    },
  });

describe('IntegrationItem behaviour', () => {
  it('links to the integration settings with a configure button', () => {
    const wrapper = mountItem({ id: 'stripe', enabled: true });
    expect(wrapper.findComponent(RouterLink).props('to')).toBe(
      '/app/accounts/3/settings/integrations/stripe'
    );
    expect(wrapper.findComponent(Button).props('label')).toBe(
      'INTEGRATION_APPS.CONFIGURE'
    );
    expect(wrapper.findComponent(Label).props()).toEqual({
      label: 'INTEGRATION_APPS.STATUS.ENABLED',
      color: 'teal',
    });
    expect(wrapper.find('img').attributes('src')).toBe(
      '/dashboard/images/integrations/stripe.svg'
    );
  });

  it('shows a disabled PNG integration', () => {
    const wrapper = mountItem({ id: 'slack' });
    expect(wrapper.findComponent(Label).props('color')).toBe('slate');
    expect(wrapper.find('img').attributes('src')).toBe(
      '/dashboard/images/integrations/slack.png'
    );
  });
});
