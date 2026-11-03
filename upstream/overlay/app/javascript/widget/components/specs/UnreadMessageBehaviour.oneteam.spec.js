/**
 * OneTeam behaviour spec for the widget UnreadMessage bubble.
 *
 * Covers sender, bot and inbox-avatar display and the click events for
 * campaign and plain unread messages.
 */
import { mount } from '@vue/test-utils';
import { emitter } from 'shared/helpers/mitt';
import {
  ON_CAMPAIGN_MESSAGE_CLICK,
  ON_UNREAD_MESSAGE_CLICK,
} from 'widget/constants/widgetBusEvents';
import UnreadMessage from '../UnreadMessage.vue';

const AvatarStub = {
  name: 'Avatar',
  props: { src: String, name: String, status: String },
  template: '<span />',
};

/**
 * Mounts UnreadMessage with stubbed children.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountMessage = props =>
  mount(UnreadMessage, {
    props: { message: 'Hello', showSender: true, ...props },
    global: {
      mocks: { $t: key => key },
      directives: { dompurifyHtml: {} },
      stubs: {
        Avatar: AvatarStub,
        TranslatingContent: { template: '<div><slot /></div>' },
      },
    },
  });

/**
 * Sets the widget channel config read by configMixin.
 *
 * @param {string[]} enabledFeatures enabled widget features
 */
const setChannel = enabledFeatures => {
  window.chatwootWebChannel = {
    websiteName: 'Acme',
    avatarUrl: '/inbox.png',
    enabledFeatures,
  };
};

describe('UnreadMessage behaviour', () => {
  afterEach(() => {
    delete window.chatwootWebChannel;
  });

  it('shows the sender details when a sender exists', () => {
    setChannel([]);
    const wrapper = mountMessage({
      sender: {
        avatar_url: '/jane.png',
        available_name: 'Jane',
        availability_status: 'online',
      },
    });
    const avatar = wrapper.findComponent(AvatarStub);
    expect(avatar.props()).toMatchObject({
      src: '/jane.png',
      name: 'Jane',
      status: 'online',
    });
    expect(wrapper.text()).toContain('UNREAD_VIEW.COMPANY_FROM Acme');
  });

  it('falls back to the sender name and then an empty name', () => {
    setChannel([]);
    expect(mountMessage({ sender: { name: 'Joe' } }).vm.agentName).toBe('Joe');
    expect(mountMessage({ sender: { id: 1 } }).vm.agentName).toBe('');
  });

  it('uses the bot avatar and label without a sender', () => {
    setChannel([]);
    const wrapper = mountMessage({ sender: {} });
    expect(wrapper.vm.avatarUrl).toBe('/assets/images/chatwoot_bot.png');
    expect(wrapper.vm.agentName).toBe('UNREAD_VIEW.BOT');
    expect(wrapper.vm.availabilityStatus).toBeNull();
  });

  it('uses the inbox avatar and website name for the bot when enabled', () => {
    setChannel(['use_inbox_avatar_for_bot']);
    const wrapper = mountMessage({ sender: null });
    expect(wrapper.vm.avatarUrl).toBe('/inbox.png');
    expect(wrapper.vm.agentName).toBe('Acme');
  });

  it('emits the campaign click with the campaign id', async () => {
    setChannel([]);
    const handler = vi.fn();
    emitter.on(ON_CAMPAIGN_MESSAGE_CLICK, handler);
    await mountMessage({ campaignId: 9 }).find('button').trigger('click');
    emitter.off(ON_CAMPAIGN_MESSAGE_CLICK, handler);
    expect(handler).toHaveBeenCalledWith(9);
  });

  it('emits the unread click without a campaign', async () => {
    setChannel([]);
    const handler = vi.fn();
    emitter.on(ON_UNREAD_MESSAGE_CLICK, handler);
    await mountMessage({ showSender: false }).find('button').trigger('click');
    emitter.off(ON_UNREAD_MESSAGE_CLICK, handler);
    expect(handler).toHaveBeenCalled();
  });
});
