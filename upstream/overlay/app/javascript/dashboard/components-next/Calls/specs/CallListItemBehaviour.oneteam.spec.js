/**
 * OneTeam behaviour spec for a row in the calls list (mobile and desktop
 * layouts).
 *
 * Covers the contact name (name, phone without "+", or deleted
 * contact), the call kind badge, "dialed by" or "picked by" with the
 * agent (including ongoing calls), the result label when there is no
 * agent (missed, no reply, failed, ringing, in progress, answered), the
 * provider icon and inbox, the conversation link with the message id,
 * the time with its exact-time tooltip, and the recording player.
 */
import { mount } from '@vue/test-utils';
import { getInboxVoiceIcon } from 'dashboard/helper/inbox';
import CallListItem from '../CallListItem.vue';

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { accountId: '1' } }),
}));
vi.mock('shared/helpers/timeHelper', () => ({
  relativeDayTimestamp: (time, yesterday) => `rel${time}|${yesterday}`,
}));
vi.mock('shared/composables/useExactTimestamp', () => ({
  useExactTimestamp: () => time => `exact${time}`,
}));
vi.mock('dashboard/helper/inbox', () => ({
  getInboxVoiceIcon: vi.fn(() => 'i-ri-phone-fill'),
}));

const tooltips = [];
const RouterLink = {
  name: 'RouterLink',
  props: ['to'],
  template: '<a class="link"><slot /></a>',
};
const Avatar = { name: 'Avatar', props: ['name', 'src'], template: '<i />' };
const CallStatusBadge = {
  name: 'CallStatusBadge',
  props: ['kind'],
  template: '<b class="badge">{{ kind }}</b>',
};
const AudioPlayer = {
  name: 'AudioPlayer',
  props: ['src', 'fallbackDuration'],
  template: '<audio />',
};

const baseCall = {
  status: 'completed',
  direction: 'inbound',
  contact: { name: 'Ann', avatar: 'a.png' },
  inbox: { name: 'Hotline', channelType: 'Channel::Voice', medium: 'twilio' },
  conversation: { displayId: 42 },
  messageId: 7,
  createdAt: 100,
};

const mountItem = call =>
  mount(CallListItem, {
    props: { call: { ...baseCall, ...call } },
    global: {
      stubs: { RouterLink, Avatar, CallStatusBadge, AudioPlayer, Icon: true },
      directives: {
        tooltip: {
          mounted: (el, binding) => tooltips.push(binding.value.content),
        },
      },
    },
  });

const name = wrapper => wrapper.find('.text-heading-3').text();
// Each row renders a mobile and a desktop layout, so labels appear twice.
const results = wrapper =>
  wrapper.findAll('.text-body-main.text-n-slate-10').map(e => e.text());

describe('CallListItem behaviour', () => {
  it('shows an answered incoming call with its agent', () => {
    const wrapper = mountItem({ agent: { name: 'Bo', avatar: 'b.png' } });
    expect(name(wrapper)).toBe('Ann');
    expect(wrapper.find('.badge').text()).toBe('incoming');
    expect(wrapper.text()).toContain('CALLS_PAGE.ROW.PICKED_BY');
    expect(wrapper.text()).toContain('Bo');
    expect(getInboxVoiceIcon).toHaveBeenCalledWith('Channel::Voice', 'twilio');
    expect(wrapper.text()).toContain('Hotline');
    expect(wrapper.findComponent(RouterLink).props('to')).toEqual({
      name: 'inbox_conversation',
      params: { accountId: '1', conversation_id: 42 },
      query: { messageId: 7 },
    });
    expect(wrapper.text()).toContain('rel100|CALLS_PAGE.ROW.YESTERDAY');
    expect(tooltips).toContain('exact100');
    expect(tooltips).toContain('Hotline');
    expect(wrapper.findComponent(AudioPlayer).exists()).toBe(false);
  });

  it.each([
    [{ direction: 'outbound' }, 'CALLS_PAGE.ROW.DIALED_BY'],
    [
      { status: 'in-progress', direction: 'outbound' },
      'CALLS_PAGE.ROW.DIALED_BY',
    ],
    [{ status: 'ringing' }, 'CALLS_PAGE.ROW.PICKED_BY'],
  ])('labels the agent for %o', (call, label) => {
    const wrapper = mountItem({ ...call, agent: { name: 'Bo' } });
    expect(wrapper.text()).toContain(label);
  });

  it('falls back to the result label for an agent on a missed call', () => {
    const wrapper = mountItem({ status: 'no-answer', agent: { name: 'Bo' } });
    expect(wrapper.vm.agentActionLabel).toBe('');
    expect(wrapper.text()).toContain('CALLS_PAGE.ROW.NO_AGENT');
  });

  it.each([
    [{ status: 'no-answer' }, 'CALLS_PAGE.ROW.NO_AGENT'],
    [
      { status: 'no-answer', direction: 'outbound' },
      'CALLS_PAGE.ROW.NO_CONTACT_ANSWER',
    ],
    [{ status: 'failed' }, 'CALLS_PAGE.ROW.FAILED'],
    [{ status: 'ringing' }, 'CALLS_PAGE.ROW.RINGING'],
    [{ status: 'in-progress' }, 'CALLS_PAGE.ROW.IN_PROGRESS'],
    [{}, 'CALLS_PAGE.ROW.ANSWERED'],
  ])('shows the result for %o without an agent', (call, label) => {
    const wrapper = mountItem(call);
    expect(results(wrapper)).toEqual([label, label]);
  });

  it('shows the phone number or a deleted contact', () => {
    expect(name(mountItem({ contact: { phoneNumber: '+1555' } }))).toBe('1555');
    expect(name(mountItem({ contact: {} }))).toBe('');
    expect(name(mountItem({ contact: null }))).toBe(
      'CALLS_PAGE.ROW.DELETED_CONTACT'
    );
  });

  it('plays the recording', () => {
    const wrapper = mountItem({ recordingUrl: 'r.mp3', durationSeconds: 30 });
    const players = wrapper.findAllComponents(AudioPlayer);
    expect(players).toHaveLength(2);
    expect(players[0].props()).toEqual({ src: 'r.mp3', fallbackDuration: 30 });

    const noDuration = mountItem({ recordingUrl: 'r.mp3' });
    expect(
      noDuration.findComponent(AudioPlayer).props('fallbackDuration')
    ).toBe(0);
  });
});
