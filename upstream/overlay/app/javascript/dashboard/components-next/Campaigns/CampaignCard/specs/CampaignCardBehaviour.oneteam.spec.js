/**
 * OneTeam behaviour spec for a campaign card.
 *
 * Covers the status label and colour for live chat campaigns (enabled or
 * disabled) and SMS/WhatsApp campaigns (scheduled, processing,
 * completed), the formatted message, the live chat vs SMS details with
 * the inbox name and icon, and which buttons show: analytics when
 * asked, edit for live chat or for editable scheduled campaigns, and
 * delete always.
 */
import { mount } from '@vue/test-utils';
import CampaignCard from '../CampaignCard.vue';

vi.mock('shared/composables/useMessageFormatter', () => ({
  useMessageFormatter: () => ({ formatMessage: text => `<p>${text}</p>` }),
}));

const Button = {
  name: 'Button',
  props: ['icon'],
  emits: ['click'],
  template: '<button :data-icon="icon" @click="$emit(\'click\')" />',
};
const details = name => ({
  name,
  props: ['sender', 'inboxName', 'inboxIcon', 'scheduledAt'],
  template: `<div class="${name}" />`,
});
const LiveChatCampaignDetails = details('LiveChatCampaignDetails');
const SMSCampaignDetails = details('SMSCampaignDetails');

const mountCard = props =>
  mount(CampaignCard, {
    props: {
      title: 'Spring sale',
      message: 'Hi **there**',
      inbox: { name: 'Site', channel_type: 'Channel::WebWidget' },
      ...props,
    },
    global: {
      directives: {
        tooltip: {},
        dompurifyHtml: (el, binding) => {
          el.innerHTML = binding.value;
        },
      },
      stubs: {
        Button,
        NextButton: Button,
        LiveChatCampaignDetails,
        SMSCampaignDetails,
        CardLayout: { template: '<div><slot /></div>' },
      },
    },
  });

const status = wrapper => wrapper.find('.bg-n-alpha-2');
const icons = wrapper =>
  wrapper.findAll('button').map(b => b.attributes('data-icon'));

describe('CampaignCard behaviour', () => {
  it('shows a live chat campaign and its actions', async () => {
    const sender = { id: 2, name: 'Ann' };
    const wrapper = mountCard({
      isLiveChatType: true,
      isEnabled: true,
      sender,
    });
    expect(status(wrapper).text()).toBe(
      'CAMPAIGN.LIVE_CHAT.CARD.STATUS.ENABLED'
    );
    expect(status(wrapper).classes()).toContain('text-n-teal-11');
    expect(wrapper.find('.line-clamp-1.h-6').html()).toContain(
      '<p>Hi **there**</p>'
    );
    const live = wrapper.findComponent(LiveChatCampaignDetails);
    expect(live.props('sender')).toEqual(sender);
    expect(live.props('inboxName')).toBe('Site');
    expect(live.props('inboxIcon')).toBeTruthy();
    expect(icons(wrapper)).toEqual([
      'i-lucide-sliders-vertical',
      'i-lucide-trash',
    ]);

    const [edit, remove] = wrapper.findAll('button');
    await edit.trigger('click');
    await remove.trigger('click');
    expect(wrapper.emitted('edit')).toHaveLength(1);
    expect(wrapper.emitted('delete')).toHaveLength(1);

    const off = mountCard({ isLiveChatType: true });
    expect(status(off).text()).toBe('CAMPAIGN.LIVE_CHAT.CARD.STATUS.DISABLED');
    expect(status(off).classes()).toContain('text-n-slate-12');
  });

  it('shows a scheduled campaign with analytics and edit', async () => {
    const wrapper = mountCard({
      status: 'active',
      scheduledAt: 1_772_618_400,
      showEdit: true,
      showAnalytics: true,
      inbox: { name: 'Texts', channel_type: 'Channel::Sms', medium: 'sms' },
    });
    expect(status(wrapper).text()).toBe('CAMPAIGN.SMS.CARD.STATUS.SCHEDULED');
    expect(status(wrapper).classes()).toContain('text-n-teal-11');
    expect(wrapper.findComponent(SMSCampaignDetails).props()).toMatchObject({
      inboxName: 'Texts',
      scheduledAt: 1_772_618_400,
    });
    expect(icons(wrapper)).toEqual([
      'i-lucide-chart-no-axes-column',
      'i-lucide-sliders-vertical',
      'i-lucide-trash',
    ]);
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('analytics')).toHaveLength(1);
    expect(mountCard({ status: 'active' }).findAll('button')).toHaveLength(1);
  });

  it.each([
    ['processing', 'PROCESSING', 'text-n-teal-11'],
    ['completed', 'COMPLETED', 'text-n-slate-12'],
  ])('cannot edit a %s campaign', (state, key, colour) => {
    const wrapper = mountCard({ status: state, showEdit: true, inbox: {} });
    expect(status(wrapper).text()).toBe(`CAMPAIGN.SMS.CARD.STATUS.${key}`);
    expect(status(wrapper).classes()).toContain(colour);
    expect(icons(wrapper)).toEqual(['i-lucide-trash']);
    expect(wrapper.findComponent(SMSCampaignDetails).props('inboxName')).toBe(
      ''
    );
  });
});
