/**
 * OneTeam behaviour spec for the onboarding ChannelRow.
 *
 * Covers the connect button and the connected name, preferring the
 * inbox name, then the detected handle, then the channel label.
 */
import { mount } from '@vue/test-utils';
import ChannelRow from '../ChannelRow.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

const CHANNEL = { labelKey: 'CHANNEL.WHATSAPP', inbox: {} };

/**
 * Mounts the row.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountRow = props =>
  mount(ChannelRow, {
    props: { channel: CHANNEL, ...props },
    global: { stubs: { ChannelIcon: true } },
  });

describe('ChannelRow behaviour', () => {
  it('emits connect for a channel that is not connected', async () => {
    const wrapper = mountRow({});
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('connect')).toEqual([[CHANNEL]]);
  });

  it('prefers the connected inbox name', () => {
    const wrapper = mountRow({ connectedInbox: { name: 'Support' } });
    expect(wrapper.find('button').exists()).toBe(false);
    expect(wrapper.text()).toContain('Support');
  });

  it('falls back to the handle and then the label', () => {
    expect(
      mountRow({
        channel: { ...CHANNEL, handle: '@shop' },
        connectedInbox: {},
      }).text()
    ).toContain('@shop');
    const wrapper = mountRow({ connectedInbox: {} });
    expect(wrapper.findAll('.whitespace-nowrap')[0].text()).toBe(
      'CHANNEL.WHATSAPP'
    );
  });
});
