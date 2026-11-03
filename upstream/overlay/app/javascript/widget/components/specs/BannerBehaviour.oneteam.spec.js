/**
 * OneTeam behaviour spec for the widget alert Banner.
 *
 * Covers showing an alert from the bus, the default type and hiding it
 * after three seconds.
 */
import { mount } from '@vue/test-utils';
import { emitter } from 'shared/helpers/mitt';
import { BUS_EVENTS } from 'shared/constants/busEvents';
import Banner from '../Banner.vue';

describe('widget Banner behaviour', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    emitter.all.clear();
  });

  it('is hidden until an alert arrives', () => {
    expect(mount(Banner).find('.banner').exists()).toBe(false);
  });

  it('shows an error alert by default and hides it after 3s', async () => {
    const wrapper = mount(Banner);
    emitter.emit(BUS_EVENTS.SHOW_ALERT, { message: 'Oops' });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.banner').classes()).toContain('error');
    expect(wrapper.text()).toBe('Oops');
    vi.advanceTimersByTime(3000);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.banner').exists()).toBe(false);
  });

  it('uses the given alert type', async () => {
    const wrapper = mount(Banner);
    emitter.emit(BUS_EVENTS.SHOW_ALERT, { message: 'Saved', type: 'success' });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.banner').classes()).toContain('success');
  });
});
