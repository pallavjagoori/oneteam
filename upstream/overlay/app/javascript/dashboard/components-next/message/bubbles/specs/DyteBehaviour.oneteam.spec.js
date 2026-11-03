/**
 * OneTeam behaviour spec for the Dyte meeting message bubble.
 *
 * Covers the deleted-sender fallback, joining a call, the join error
 * alert and leaving the room.
 */
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import DyteAPI from 'dashboard/api/integrations/dyte';
import { useAlert } from 'dashboard/composables';
import DyteBubble from '../Dyte.vue';

const env = vi.hoisted(() => ({ sender: null }));

vi.mock('../../provider.js', () => ({
  useMessageContext: () => ({
    content: ref('Meeting started'),
    sender: env.sender,
    id: ref(42),
  }),
}));

vi.mock('dashboard/api/integrations/dyte', () => ({
  default: { addParticipantToMeeting: vi.fn() },
}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

const BaseStub = {
  name: 'BaseAttachmentBubble',
  props: { action: Object },
  template: '<div><slot /></div>',
};

/**
 * Mounts the Dyte bubble.
 *
 * @param {object|null} sender message sender (null when deleted)
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountBubble = sender => {
  env.sender = sender;
  return mount(DyteBubble, {
    global: {
      mocks: { $t: key => key },
      stubs: { BaseAttachmentBubble: BaseStub },
    },
  });
};

describe('Dyte bubble behaviour', () => {
  it('shows the content when the sender was deleted', () => {
    expect(mountBubble(null).text()).toContain('Meeting started');
  });

  it('joins the call and then leaves the room', async () => {
    DyteAPI.addParticipantToMeeting.mockResolvedValue({
      data: { token: 'abc' },
    });
    const wrapper = mountBubble({ name: 'Jane' });
    expect(wrapper.text()).not.toContain('Meeting started');
    const { action } = wrapper.findComponent(BaseStub).props();
    expect(action.label).toBe('INTEGRATION_SETTINGS.DYTE.CLICK_HERE_TO_JOIN');
    await action.onClick();
    await flushPromises();
    expect(DyteAPI.addParticipantToMeeting).toHaveBeenCalledWith(42);
    expect(wrapper.find('iframe').attributes('src')).toContain('abc');
    await wrapper.find('button').trigger('click');
    expect(wrapper.find('iframe').exists()).toBe(false);
  });

  it('handles a response without data', async () => {
    DyteAPI.addParticipantToMeeting.mockResolvedValue({});
    const wrapper = mountBubble({ name: 'Jane' });
    await wrapper.findComponent(BaseStub).props('action').onClick();
    await flushPromises();
    expect(wrapper.find('iframe').exists()).toBe(false);
  });

  it('alerts when joining fails', async () => {
    DyteAPI.addParticipantToMeeting.mockRejectedValue(new Error('x'));
    const wrapper = mountBubble({ name: 'Jane' });
    await wrapper.findComponent(BaseStub).props('action').onClick();
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'INTEGRATION_SETTINGS.DYTE.JOIN_ERROR'
    );
  });
});
