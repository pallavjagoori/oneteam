/**
 * OneTeam behaviour spec for the conversation card voice call status.
 *
 * Covers the label, icon and colour for in-progress, ringing (incoming
 * and outgoing), completed, missed and unknown calls.
 */
import { mount } from '@vue/test-utils';
import VoiceCallStatus from '../VoiceCallStatus.vue';

const Icon = { name: 'Icon', props: ['icon'], template: '<i />' };

describe('VoiceCallStatus behaviour', () => {
  it.each([
    ['in-progress', '', 'CALL_IN_PROGRESS', 'i-ph-phone-call', 'text-n-teal-9'],
    [
      'ringing',
      'outbound',
      'OUTGOING_CALL',
      'i-ph-phone-outgoing',
      'text-n-teal-9',
    ],
    [
      'ringing',
      'inbound',
      'INCOMING_CALL',
      'i-ph-phone-incoming',
      'text-n-teal-9',
    ],
    [
      'completed',
      'outbound',
      'CALL_ENDED',
      'i-ph-phone-outgoing',
      'text-n-slate-11',
    ],
    ['no-answer', '', 'MISSED_CALL', 'i-ph-phone-x', 'text-n-ruby-9'],
    ['rejected', '', 'MISSED_CALL', 'i-ph-phone-x', 'text-n-ruby-9'],
    ['', '', 'INCOMING_CALL', 'i-ph-phone-incoming', 'text-n-slate-11'],
  ])('shows %s %s calls', (status, direction, label, icon, colour) => {
    const wrapper = mount(VoiceCallStatus, {
      props: { status, direction },
      global: { stubs: { Icon }, mocks: { $t: key => key } },
    });
    expect(wrapper.text()).toBe(`CONVERSATION.VOICE_CALL.${label}`);
    const el = wrapper.getComponent(Icon);
    expect(el.props('icon')).toBe(icon);
    expect(el.classes()).toContain(colour);
  });
});
