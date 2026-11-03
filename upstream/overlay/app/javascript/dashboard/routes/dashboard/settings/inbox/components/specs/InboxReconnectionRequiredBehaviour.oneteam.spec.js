/**
 * Covers the inbox reconnection banner: custom or default label and text,
 * and the reauthorize event.
 */
import { mount } from '@vue/test-utils';
import InboxReconnectionRequired from '../InboxReconnectionRequired.vue';

const Banner = {
  name: 'Banner',
  props: ['actionLabel', 'isLoading'],
  emits: ['action'],
  template: '<div class="banner"><slot /></div>',
};

const mountBanner = props =>
  mount(InboxReconnectionRequired, {
    props,
    global: { stubs: { Banner }, mocks: { $t: key => key } },
  });

describe('InboxReconnectionRequired', () => {
  it('uses the defaults and emits reauthorize', () => {
    const wrapper = mountBanner({});
    const banner = wrapper.getComponent(Banner);
    expect(banner.props('actionLabel')).toBe('INBOX_MGMT.CLICK_TO_RECONNECT');
    expect(banner.text()).toBe('INBOX_MGMT.RECONNECTION_REQUIRED');
    banner.vm.$emit('action');
    expect(wrapper.emitted('reauthorize')).toHaveLength(1);
  });

  it('shows a custom label and description', () => {
    const banner = mountBanner({
      actionLabel: 'Reconnect',
      description: 'Token expired',
      isLoading: true,
    }).getComponent(Banner);
    expect(banner.props()).toMatchObject({
      actionLabel: 'Reconnect',
      isLoading: true,
    });
    expect(banner.text()).toBe('Token expired');
  });
});
