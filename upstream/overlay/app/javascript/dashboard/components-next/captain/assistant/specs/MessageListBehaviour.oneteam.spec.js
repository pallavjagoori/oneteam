/**
 * OneTeam behaviour spec for the Captain playground message list.
 *
 * Covers user, assistant and error bubbles, run details shown only with a
 * setup summary, the typing indicator, and scrolling to the newest
 * message (including after the list is gone).
 */
import { mount } from '@vue/test-utils';
import MessageList from '../MessageList.vue';

vi.mock('shared/composables/useMessageFormatter', () => ({
  useMessageFormatter: () => ({ formatMessage: text => `<p>${text}</p>` }),
}));

const Avatar = { name: 'Avatar', props: ['name'], template: '<i />' };
const RunDetails = { name: 'PlaygroundRunDetails', template: '<div />' };

const mountList = props =>
  mount(MessageList, {
    props,
    global: {
      stubs: { Avatar, PlaygroundRunDetails: RunDetails },
      directives: {
        'dompurify-html': (el, { value }) => {
          el.innerHTML = value;
        },
      },
    },
  });

describe('MessageList behaviour', () => {
  it('styles user, assistant and error messages', () => {
    const wrapper = mountList({
      messages: [
        { sender: 'user', content: 'Hi' },
        {
          sender: 'assistant',
          content: 'Hello',
          runDetails: {},
          setupSummary: {},
        },
        { sender: 'assistant', content: 'Oops', isError: true },
        { sender: 'assistant', content: 'Bare', runDetails: {} },
      ],
      isLoading: true,
    });
    const rows = wrapper.findAll('.flex.justify-end, .flex.justify-start');
    expect(rows[0].classes()).toContain('justify-end');
    expect(rows[0].find('.flex-row-reverse').exists()).toBe(true);
    expect(rows[1].find('.bg-n-solid-iris').exists()).toBe(true);
    expect(rows[2].find('.bg-n-ruby-3').exists()).toBe(true);
    expect(wrapper.find('.bg-n-solid-blue').text()).toBe('Hi');
    expect(wrapper.findAllComponents(RunDetails)).toHaveLength(1);
    expect(
      wrapper.findAllComponents(Avatar).map(avatar => avatar.props('name'))
    ).toEqual([
      'CAPTAIN.PLAYGROUND.USER',
      'CAPTAIN.PLAYGROUND.ASSISTANT',
      'CAPTAIN.PLAYGROUND.ASSISTANT',
      'CAPTAIN.PLAYGROUND.ASSISTANT',
      'CAPTAIN.PLAYGROUND.ASSISTANT',
    ]);
    expect(wrapper.findAll('.animate-bounce')).toHaveLength(3);
  });

  it('scrolls to the newest message', async () => {
    vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockReturnValue(400);
    const wrapper = mountList({ messages: [] });
    await wrapper.setProps({ messages: [{ sender: 'user', content: 'Hi' }] });
    await wrapper.vm.$nextTick();
    expect(wrapper.element.scrollTop).toBe(400);
    expect(wrapper.find('.animate-bounce').exists()).toBe(false);

    const pending = wrapper.setProps({
      messages: [
        { sender: 'user', content: 'Hi' },
        { sender: 'user', content: 'Again' },
      ],
    });
    await Promise.resolve();
    wrapper.unmount();
    await pending;
    vi.restoreAllMocks();
  });
});
