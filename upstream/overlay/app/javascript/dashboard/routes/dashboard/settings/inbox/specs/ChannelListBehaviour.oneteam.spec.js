/**
 * OneTeam behaviour spec for the new inbox channel list.
 *
 * Covers the TikTok channel (shown only when configured, with the
 * access request text on Chatwoot Cloud without the feature) and
 * opening a channel's setup page.
 */
import { computed, ref } from 'vue';
import { mount } from '@vue/test-utils';
import ChannelList from '../ChannelList.vue';

const env = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => ({ push: env.push }),
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => computed(() => ({ apiChannelName: env.apiName })),
}));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => env.account,
}));

/**
 * Mounts the list.
 *
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountList = () =>
  mount(ChannelList, {
    global: {
      stubs: {
        ChannelItem: {
          name: 'ChannelItem',
          props: ['channel', 'enabledFeatures'],
          emits: ['channelItemClick'],
          template:
            '<button @click="$emit(\'channelItemClick\', channel.key)" />',
        },
      },
    },
  });

/**
 * Finds the TikTok channel passed to the items.
 *
 * @param {import('@vue/test-utils').VueWrapper} wrapper mounted list
 * @returns {object|undefined}
 */
const tiktok = wrapper =>
  wrapper
    .findAllComponents({ name: 'ChannelItem' })
    .map(item => item.props('channel'))
    .find(channel => channel.key === 'tiktok');

describe('ChannelList behaviour', () => {
  beforeEach(() => {
    env.apiName = 'API';
    env.account = {
      accountId: ref(3),
      currentAccount: ref({ features: {} }),
      isOnChatwootCloud: ref(true),
    };
  });

  it('hides TikTok until it is configured', () => {
    window.chatwootConfig = {};
    expect(tiktok(mountList())).toBeUndefined();
  });

  it('asks for TikTok access on cloud accounts without the feature', () => {
    window.chatwootConfig = { tiktokAppId: 'app' };
    expect(tiktok(mountList()).description).toBe(
      'INBOX_MGMT.ADD.AUTH.CHANNEL.TIKTOK.ACCESS_REQUEST_DESCRIPTION'
    );
    env.account.currentAccount.value = { features: { channel_tiktok: true } };
    expect(tiktok(mountList()).description).toBe(
      'INBOX_MGMT.ADD.AUTH.CHANNEL.TIKTOK.DESCRIPTION'
    );
    env.account.currentAccount.value = null;
    expect(tiktok(mountList()).description).toBe(
      'INBOX_MGMT.ADD.AUTH.CHANNEL.TIKTOK.DESCRIPTION'
    );
  });

  it('names the API channel and opens the channel setup page', async () => {
    window.chatwootConfig = {};
    const channel = list =>
      list
        .findAllComponents({ name: 'ChannelItem' })
        .map(item => item.props('channel'))
        .find(item => item.key === 'api');
    expect(channel(mountList()).title).toBe('API');
    env.apiName = '';
    expect(channel(mountList()).title).toBe(
      'INBOX_MGMT.ADD.AUTH.CHANNEL.API.TITLE'
    );
    const wrapper = mountList();
    await wrapper.find('button').trigger('click');
    expect(env.push).toHaveBeenCalledWith({
      name: 'settings_inboxes_page_channel',
      params: { sub_page: 'website', accountId: 3 },
    });
  });
});
