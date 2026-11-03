/**
 * OneTeam behaviour spec for the voice call card.
 *
 * Covers incoming, outgoing and ongoing states (status icon and label,
 * duration, dismiss, accept, reject or end), the caller's flag or the
 * channel icon (phone or WhatsApp), the phone number line, the mute
 * toggle in both states, and the go-to-conversation footer.
 */
import { mount } from '@vue/test-utils';
import CallCard from '../CallCard.vue';

const NextButton = {
  name: 'NextButton',
  props: ['icon', 'variant', 'color'],
  emits: ['click'],
  template:
    '<button :class="icon" @click="$emit(\'click\')"><slot name="icon" /><slot /></button>',
};
const tips = [];

const mountCard = (props = {}) =>
  mount(CallCard, {
    props: {
      call: {},
      callInfo: { contactName: 'Ann', location: 'Web inbox' },
      state: 'incoming',
      ...props,
    },
    global: {
      stubs: {
        NextButton,
        Avatar: true,
        Icon: { props: ['icon'], template: '<i :class="icon" />' },
      },
      directives: {
        tooltip: {
          mounted: (el, binding) => tips.push(binding.value),
        },
      },
    },
  });
const icons = wrapper =>
  wrapper.findAllComponents(NextButton).map(button => button.props('icon'));

describe('CallCard behaviour', () => {
  beforeEach(() => {
    tips.length = 0;
  });

  it('handles an incoming call', async () => {
    const wrapper = mountCard({
      call: { provider: 'whatsapp' },
      callInfo: {
        contactName: 'Ann',
        location: 'Paris, France',
        phoneNumber: '+33',
        hasLocation: true,
      },
    });
    expect(wrapper.text()).toContain('CONVERSATION.VOICE_WIDGET.INCOMING_CALL');
    expect(wrapper.find('.i-ph-phone-incoming-bold').exists()).toBe(true);
    expect(wrapper.find('.i-ri-whatsapp-fill').exists()).toBe(true);
    expect(wrapper.text()).toContain('+33');
    expect(wrapper.classes()).toContain('pb-4');
    expect(icons(wrapper)).toEqual([
      'i-ph-x-bold',
      'i-ph-phone-bold',
      'i-ph-phone-bold',
    ]);
    expect(tips).toContain('CONVERSATION.VOICE_WIDGET.REJECT_CALL');
    const [dismiss, accept, reject] = wrapper.findAll('button');
    await dismiss.trigger('click');
    await accept.trigger('click');
    await reject.trigger('click');
    expect(Object.keys(wrapper.emitted())).toEqual(
      expect.arrayContaining(['dismiss', 'accept', 'reject'])
    );
  });

  it('handles an outgoing call with a flag and a conversation link', async () => {
    const wrapper = mountCard({
      state: 'outgoing',
      call: { conversationId: 12 },
      callInfo: {
        contactName: 'Ann',
        location: 'Paris',
        hasLocation: true,
        countryFlag: '🇫🇷',
      },
    });
    expect(wrapper.text()).toContain('CONVERSATION.VOICE_WIDGET.OUTGOING_CALL');
    expect(wrapper.find('.i-ph-phone-outgoing-bold').exists()).toBe(true);
    expect(wrapper.text()).toContain('🇫🇷');
    expect(wrapper.find('.i-ph-phone-bold.size-3\\.5').exists()).toBe(false);
    expect(wrapper.classes()).toContain('pb-2');
    expect(wrapper.text()).toContain('#12');
    const buttons = wrapper.findAll('button');
    await buttons[buttons.length - 1].trigger('click');
    expect(wrapper.emitted('goToConversation')).toHaveLength(1);
  });

  it('handles an ongoing call with mute', async () => {
    const wrapper = mountCard({
      state: 'ongoing',
      duration: '01:02',
      showMute: true,
    });
    expect(wrapper.text()).toContain(
      'CONVERSATION.VOICE_WIDGET.CALL_IN_PROGRESS'
    );
    expect(wrapper.text()).toContain('01:02');
    expect(wrapper.find('.i-ph-phone-call-bold').exists()).toBe(true);
    const mute = wrapper.findComponent(NextButton);
    expect(mute.props()).toMatchObject({
      icon: 'i-ph-microphone-bold',
      variant: 'faded',
      color: 'teal',
    });
    expect(tips).toEqual([
      'CONVERSATION.VOICE_WIDGET.MUTE',
      'CONVERSATION.VOICE_WIDGET.END_CALL',
    ]);
    const [toggle, end] = wrapper.findAll('button');
    await toggle.trigger('click');
    await end.trigger('click');
    expect(wrapper.emitted('toggleMute')).toHaveLength(1);
    expect(wrapper.emitted('end')).toHaveLength(1);

    await wrapper.setProps({ isMuted: true });
    expect(mute.props()).toMatchObject({
      icon: 'i-ph-microphone-slash-bold',
      variant: 'solid',
      color: 'amber',
    });
  });

  it('copes without a call object', () => {
    expect(mountCard({ call: null }).find('.i-ph-phone-bold').exists()).toBe(
      true
    );
  });
});
