/**
 * OneTeam behaviour spec for the widget's Dyte video call card.
 *
 * Covers the join button in the widget colour, joining the call (the
 * meeting opens in an iframe with the returned token), ignoring a failed
 * join or a response without a token, and leaving the room.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import IntegrationAPIClient from 'widget/api/integration';
import IntegrationCard from '../IntegrationCard.vue';

vi.mock('widget/api/integration', () => ({
  default: { addParticipantToDyteMeeting: vi.fn() },
}));
vi.mock('shared/helpers/IntegrationHelper', () => ({
  buildDyteURL: token => `https://dyte.test/?token=${token}`,
}));

const mountCard = () => {
  const store = createStore({
    getters: { 'appConfig/getWidgetColor': () => '#000000' },
  });
  return mount(IntegrationCard, {
    props: { messageId: 9 },
    global: { plugins: [store], stubs: { FluentIcon: true } },
  });
};

const join = wrapper => wrapper.find('.join-call-button');

describe('IntegrationCard behaviour', () => {
  it('joins and leaves the call', async () => {
    let resolve;
    IntegrationAPIClient.addParticipantToDyteMeeting.mockReturnValueOnce(
      new Promise(r => {
        resolve = r;
      })
    );
    const wrapper = mountCard();
    expect(join(wrapper).element.style.background).toBe('rgb(0, 0, 0)');
    expect(join(wrapper).element.style.color).toBe('rgb(255, 255, 255)');
    expect(join(wrapper).text()).toBe('INTEGRATIONS.DYTE.CLICK_HERE_TO_JOIN');

    await join(wrapper).trigger('click');
    expect(join(wrapper).attributes('is-loading')).toBe('true');
    resolve({ data: { token: 'abc' } });
    await flushPromises();
    expect(
      IntegrationAPIClient.addParticipantToDyteMeeting
    ).toHaveBeenCalledWith(9);
    expect(join(wrapper).attributes('is-loading')).toBe('false');
    expect(wrapper.find('iframe').attributes('src')).toBe(
      'https://dyte.test/?token=abc'
    );

    await wrapper.find('.leave-room-button').trigger('click');
    expect(wrapper.find('iframe').exists()).toBe(false);
  });

  it('ignores a failed join or a missing token', async () => {
    const wrapper = mountCard();
    IntegrationAPIClient.addParticipantToDyteMeeting.mockRejectedValueOnce(
      new Error('nope')
    );
    await join(wrapper).trigger('click');
    await flushPromises();
    expect(wrapper.find('iframe').exists()).toBe(false);
    expect(join(wrapper).attributes('is-loading')).toBe('false');

    IntegrationAPIClient.addParticipantToDyteMeeting.mockResolvedValueOnce({});
    await join(wrapper).trigger('click');
    await flushPromises();
    expect(wrapper.find('iframe').exists()).toBe(false);
  });
});
