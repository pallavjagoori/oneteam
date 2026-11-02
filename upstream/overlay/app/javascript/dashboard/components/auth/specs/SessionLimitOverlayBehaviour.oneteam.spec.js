/**
 * OneTeam behaviour spec for the session-limit overlay shown at login.
 *
 * Covers listing sessions newest first with a browser/platform label
 * (skipping unknown values) and start time, ending one session or all
 * sessions with the buttons locked while a request runs, unlocking when
 * the session list changes, and cancelling.
 */
import { mount } from '@vue/test-utils';
import SessionLimitOverlay from '../SessionLimitOverlay.vue';

const NextButton = {
  name: 'NextButton',
  props: ['label', 'isLoading', 'disabled'],
  emits: ['click'],
  template:
    '<button class="next" :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
};

const sessions = [
  {
    id: 1,
    browser_name: 'Firefox',
    platform_name: 'Linux',
    created_at: '2026-01-02T09:05:00',
  },
  {
    id: 2,
    browser_name: 'Unknown Browser',
    platform_name: 'macOS',
    created_at: '2026-03-04T15:30:00',
  },
  {
    id: 3,
    browser_name: 'Chrome',
    platform_name: 'Unknown',
    created_at: '2025-12-31T23:00:00',
  },
  { id: 4, browser_name: null, platform_name: '', created_at: null },
];

const mountOverlay = () =>
  mount(SessionLimitOverlay, {
    props: { sessions },
    global: { stubs: { NextButton, Icon: true } },
  });

const endButtons = wrapper =>
  wrapper.findAll('button:not(.next)').filter(b => b.text());

describe('SessionLimitOverlay behaviour', () => {
  it('lists sessions newest first with labels and times', () => {
    const wrapper = mountOverlay();
    const labels = wrapper.findAll('.font-medium.text-n-slate-12');
    expect(labels.map(l => l.text())).toEqual([
      'macOS',
      'Firefox on Linux',
      'Chrome',
      'SESSION_LIMIT.UNKNOWN_DEVICE',
    ]);
    const times = wrapper.findAll('.text-xs').map(s => s.text());
    expect(times[0]).toBe('SESSION_LIMIT.STARTED March 4, 2026, 03:30PM');
    expect(times[3]).toBe('SESSION_LIMIT.STARTED ,');
    expect(wrapper.text()).toContain('SESSION_LIMIT.TITLE');
  });

  it('ends one session and locks the buttons until the list changes', async () => {
    const wrapper = mountOverlay();
    await endButtons(wrapper)[1].trigger('click');
    expect(wrapper.emitted('revoke')[0]).toEqual([1]);
    expect(
      endButtons(wrapper).every(b => b.attributes('disabled') !== undefined)
    ).toBe(true);
    const [endAll] = wrapper.findAllComponents(NextButton);
    expect(endAll.props('disabled')).toBe(true);

    await wrapper.setProps({ sessions: sessions.slice(1) });
    expect(endAll.props('disabled')).toBe(false);
    expect(endButtons(wrapper)[0].attributes('disabled')).toBeUndefined();
  });

  it('ends all sessions', async () => {
    const wrapper = mountOverlay();
    const [endAll] = wrapper.findAllComponents(NextButton);
    await endAll.trigger('click');
    expect(wrapper.emitted('revokeAll')).toHaveLength(1);
    expect(endAll.props('isLoading')).toBe(true);
    expect(endButtons(wrapper)[0].attributes('disabled')).toBeDefined();
  });

  it('cancels', async () => {
    const wrapper = mountOverlay();
    await wrapper.findAllComponents(NextButton)[1].trigger('click');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });
});
