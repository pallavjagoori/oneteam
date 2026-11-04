/**
 * OneTeam behaviour spec for the SMS channel picker.
 *
 * Covers the default Twilio form and switching to Bandwidth.
 */
import { mount } from '@vue/test-utils';
import Sms from '../Sms.vue';

describe('Sms channel behaviour', () => {
  it('switches from Twilio to Bandwidth', async () => {
    const wrapper = mount(Sms, {
      global: {
        mocks: { $t: key => key },
        stubs: {
          PageHeader: true,
          Twilio: { props: ['type'], template: '<div class="twilio" />' },
          BandwidthSms: { template: '<div class="bandwidth" />' },
        },
      },
    });
    expect(wrapper.find('.twilio').exists()).toBe(true);
    await wrapper.find('select').setValue('360dialog');
    expect(wrapper.find('.bandwidth').exists()).toBe(true);
    expect(wrapper.find('.twilio').exists()).toBe(false);
  });
});
