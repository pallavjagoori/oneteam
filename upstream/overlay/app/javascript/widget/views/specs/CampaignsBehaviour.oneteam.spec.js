/**
 * OneTeam behaviour spec for the widget Campaigns view.
 *
 * Covers building the campaign message and closing the full view only
 * when the widget runs in an iframe.
 */
import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import Campaigns from '../Campaigns.vue';
import { IFrameHelper } from 'widget/helpers/utils';
import { emitter } from 'shared/helpers/mitt';

/**
 * Mounts the view with an active campaign.
 *
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountView = () => {
  const store = createStore({
    getters: {
      'campaign/getActiveCampaign': () => ({
        id: 7,
        message: 'Hello',
        sender: { name: 'Ann' },
      }),
    },
  });
  return mount(Campaigns, {
    global: {
      plugins: [store],
      stubs: {
        UnreadMessageList: {
          name: 'UnreadMessageList',
          props: ['messages'],
          emits: ['close'],
          template: '<div />',
        },
      },
    },
  });
};

describe('Campaigns view behaviour', () => {
  beforeEach(() => {
    vi.spyOn(IFrameHelper, 'sendMessage').mockImplementation(() => {});
    vi.spyOn(emitter, 'emit');
  });

  it('builds the campaign message', () => {
    const list = mountView().findComponent({ name: 'UnreadMessageList' });
    expect(list.props('messages')).toEqual([
      { content: 'Hello', sender: { name: 'Ann' }, campaignId: 7 },
    ]);
  });

  it('closes the full view inside an iframe', () => {
    vi.spyOn(IFrameHelper, 'isIFrame').mockReturnValue(true);
    mountView().findComponent({ name: 'UnreadMessageList' }).vm.$emit('close');
    expect(IFrameHelper.sendMessage).toHaveBeenCalledWith({
      event: 'setCampaignReadOn',
    });
    expect(IFrameHelper.sendMessage).toHaveBeenCalledWith({
      event: 'toggleBubble',
    });
    expect(emitter.emit).toHaveBeenCalledWith('snooze-campaigns');
  });

  it('does nothing outside an iframe', () => {
    vi.spyOn(IFrameHelper, 'isIFrame').mockReturnValue(false);
    mountView().findComponent({ name: 'UnreadMessageList' }).vm.$emit('close');
    expect(IFrameHelper.sendMessage).not.toHaveBeenCalled();
  });
});
