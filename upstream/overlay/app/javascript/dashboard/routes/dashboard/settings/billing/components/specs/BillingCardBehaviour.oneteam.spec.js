/**
 * OneTeam behaviour spec for a billing settings card.
 *
 * Covers the header with its action slot and the card body.
 */
import { mount } from '@vue/test-utils';
import BillingCard from '../BillingCard.vue';

const BillingHeader = {
  name: 'BillingHeader',
  props: ['title', 'description'],
  template: '<header><slot /></header>',
};

describe('BillingCard behaviour', () => {
  it('renders the header, action and body', () => {
    const wrapper = mount(BillingCard, {
      props: { title: 'Plan', description: 'Your plan' },
      slots: {
        action: '<button>Manage</button>',
        default: '<p class="body">Details</p>',
      },
      global: { stubs: { BillingHeader } },
    });
    expect(wrapper.getComponent(BillingHeader).props()).toEqual({
      title: 'Plan',
      description: 'Your plan',
    });
    expect(wrapper.get('header button').text()).toBe('Manage');
    expect(wrapper.get('.body').text()).toBe('Details');
  });
});
