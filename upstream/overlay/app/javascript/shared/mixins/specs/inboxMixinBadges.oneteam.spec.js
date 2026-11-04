/**
 * OneTeam spec for inboxMixin voice call and badge edge cases.
 *
 * Covers the voice call flag, the TikTok badge, and reading additional
 * attributes when there is no chat.
 */
import { mount } from '@vue/test-utils';
import inboxMixin from '../inboxMixin';
import { INBOX_TYPES } from 'dashboard/helper/inbox';

/**
 * Mounts a component using the mixin.
 *
 * @param {object} data inbox and chat data
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountWith = data =>
  mount(
    {
      mixins: [inboxMixin],
      data: () => data,
      template: '<div />',
    },
    {}
  );

describe('inboxMixin badges', () => {
  it('uses the TikTok badge with no chat', () => {
    const wrapper = mountWith({
      inbox: { channel_type: INBOX_TYPES.TIKTOK },
      chat: null,
    });
    expect(wrapper.vm.inboxBadge).toBe('tiktok');
    expect(wrapper.vm.chatAdditionalAttributes).toEqual({});
  });

  it('reports whether voice calls are enabled', () => {
    const wrapper = mountWith({
      inbox: { channel_type: INBOX_TYPES.EMAIL },
      chat: { additional_attributes: null },
    });
    expect(typeof wrapper.vm.voiceCallEnabled).toBe('boolean');
    expect(wrapper.vm.chatAdditionalAttributes).toEqual({});
  });
});
