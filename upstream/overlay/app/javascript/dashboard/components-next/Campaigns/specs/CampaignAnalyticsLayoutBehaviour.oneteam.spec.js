/**
 * OneTeam behaviour spec for the campaign analytics page layout.
 *
 * Covers passing breadcrumbs through, relaying breadcrumb clicks, and
 * rendering the page body.
 */
import { mount } from '@vue/test-utils';
import CampaignAnalyticsLayout from '../CampaignAnalyticsLayout.vue';

const Breadcrumb = {
  name: 'Breadcrumb',
  props: ['items'],
  emits: ['click'],
  template: '<nav />',
};

describe('CampaignAnalyticsLayout behaviour', () => {
  it('renders breadcrumbs and the body and relays clicks', () => {
    const items = [{ label: 'Campaigns' }, { label: 'Spring' }];
    const wrapper = mount(CampaignAnalyticsLayout, {
      props: { breadcrumbItems: items },
      slots: { default: '<p class="body">Stats</p>' },
      global: { stubs: { Breadcrumb } },
    });
    const breadcrumb = wrapper.getComponent(Breadcrumb);
    expect(breadcrumb.props('items')).toEqual(items);
    expect(wrapper.get('.body').text()).toBe('Stats');
    breadcrumb.vm.$emit('click', items[0], 0);
    expect(wrapper.emitted('breadcrumbClick')).toEqual([[items[0], 0]]);
  });

  it('defaults to no breadcrumbs', () => {
    const wrapper = mount(CampaignAnalyticsLayout, {
      global: { stubs: { Breadcrumb } },
    });
    expect(wrapper.getComponent(Breadcrumb).props('items')).toEqual([]);
  });
});
