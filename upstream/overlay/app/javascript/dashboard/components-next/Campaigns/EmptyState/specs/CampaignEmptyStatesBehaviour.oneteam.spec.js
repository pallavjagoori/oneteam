/**
 * OneTeam behaviour spec for the campaign empty states.
 *
 * Covers the title and subtitle and the sample campaign cards behind
 * each empty state: ongoing live chat campaigns, and one-off SMS and
 * WhatsApp campaigns.
 */
import { mount } from '@vue/test-utils';
import LiveChatCampaignEmptyState from '../LiveChatCampaignEmptyState.vue';
import SMSCampaignEmptyState from '../SMSCampaignEmptyState.vue';
import WhatsAppCampaignEmptyState from '../WhatsAppCampaignEmptyState.vue';
import {
  ONGOING_CAMPAIGN_EMPTY_STATE_CONTENT,
  ONE_OFF_CAMPAIGN_EMPTY_STATE_CONTENT,
} from '../CampaignEmptyStateContent';

const EmptyStateLayout = {
  name: 'EmptyStateLayout',
  props: ['title', 'subtitle'],
  template: '<div><slot name="empty-state-item" /></div>',
};
const CampaignCard = {
  name: 'CampaignCard',
  props: {
    title: String,
    message: String,
    isEnabled: Boolean,
    status: String,
    sender: Object,
    inbox: Object,
    scheduledAt: [Number, String],
    isLiveChatType: Boolean,
  },
  template: '<div />',
};

describe('campaign empty states behaviour', () => {
  it.each([
    [LiveChatCampaignEmptyState, ONGOING_CAMPAIGN_EMPTY_STATE_CONTENT, true],
    [SMSCampaignEmptyState, ONE_OFF_CAMPAIGN_EMPTY_STATE_CONTENT, false],
    [WhatsAppCampaignEmptyState, ONE_OFF_CAMPAIGN_EMPTY_STATE_CONTENT, false],
  ])('shows sample campaigns (%#)', (component, content, liveChat) => {
    const wrapper = mount(component, {
      props: { title: 'No campaigns', subtitle: 'Create one' },
      global: { stubs: { EmptyStateLayout, CampaignCard } },
    });
    expect(wrapper.getComponent(EmptyStateLayout).props()).toEqual({
      title: 'No campaigns',
      subtitle: 'Create one',
    });
    const cards = wrapper.findAllComponents(CampaignCard);
    expect(cards).toHaveLength(content.length);
    expect(cards[0].props()).toMatchObject({
      title: content[0].title,
      message: content[0].message,
      isEnabled: content[0].enabled,
      status: content[0].campaign_status,
      isLiveChatType: liveChat,
    });
  });
});
