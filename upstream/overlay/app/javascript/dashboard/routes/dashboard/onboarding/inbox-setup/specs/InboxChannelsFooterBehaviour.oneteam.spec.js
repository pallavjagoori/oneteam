/**
 * OneTeam behaviour spec for the onboarding channels footer.
 *
 * Covers the more-channels note, previewing configured remaining
 * channels (or the fallback trio when none remain), and the view-all
 * action.
 */
import { mount } from '@vue/test-utils';
import InboxChannelsFooter from '../InboxChannelsFooter.vue';
import { FALLBACK_PREVIEW_CHANNELS } from '../constants';

const env = vi.hoisted(() => ({ configured: () => true }));

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
  I18nT: {
    name: 'I18nT',
    template: '<span><slot name="email" /><slot name="voice" /></span>',
  },
}));
vi.mock('../useChannelConfig', () => ({
  useChannelConfig: () => ({ isConfigured: type => env.configured(type) }),
}));

const ChannelIcon = {
  name: 'ChannelIcon',
  props: ['inbox'],
  template: '<i />',
};

/**
 * Mounts the footer.
 *
 * @param {object} [props] Footer props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountFooter = props =>
  mount(InboxChannelsFooter, {
    props,
    global: { stubs: { ChannelIcon, Icon: true } },
  });

describe('InboxChannelsFooter behaviour', () => {
  it('previews configured remaining channels and views all', async () => {
    env.configured = type => type !== 'sms';
    const wrapper = mountFooter({
      remainingChannels: [
        { type: 'facebook', inbox: { channel_type: 'Channel::FacebookPage' } },
        { type: 'sms', inbox: { channel_type: 'Channel::Sms' } },
      ],
    });
    expect(wrapper.text()).toContain(
      'ONBOARDING_INBOX_SETUP.CHANNELS.MORE_CHANNELS_EMAIL'
    );
    expect(wrapper.text()).toContain(
      'ONBOARDING_INBOX_SETUP.CHANNELS.MORE_CHANNELS_VOICE'
    );
    const icons = wrapper.findAllComponents(ChannelIcon);
    expect(icons.map(i => i.props('inbox').channel_type)).toEqual([
      'Channel::FacebookPage',
    ]);
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('viewAll')).toHaveLength(1);
  });

  it('falls back to the preview trio when nothing remains', () => {
    env.configured = () => true;
    expect(mountFooter().findAllComponents(ChannelIcon)).toHaveLength(
      FALLBACK_PREVIEW_CHANNELS.length
    );
  });
});
