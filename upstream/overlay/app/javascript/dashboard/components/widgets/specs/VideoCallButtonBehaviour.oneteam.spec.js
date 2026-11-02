/**
 * OneTeam behaviour spec for the Dyte video call button in the reply box.
 *
 * Covers loading integrations when none are cached, showing the button
 * only when Dyte has a hook, starting a meeting for the conversation, and
 * the error alert built from a string error, a nested message, a plain
 * message or the fallback text.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import DyteAPI from 'dashboard/api/integrations/dyte';
import { useAlert } from 'dashboard/composables';
import VideoCallButton from '../VideoCallButton.vue';

vi.mock('dashboard/api/integrations/dyte', () => ({
  default: { createAMeeting: vi.fn() },
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const NextButton = {
  name: 'NextButton',
  props: ['icon'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ icon }}</button>',
};

const mountButton = integrations => {
  const actions = { get: vi.fn() };
  const store = createStore({
    modules: {
      integrations: {
        namespaced: true,
        getters: { getAppIntegrations: () => integrations },
        actions,
      },
    },
  });
  const wrapper = mount(VideoCallButton, {
    props: { conversationId: 12 },
    global: {
      plugins: [store],
      stubs: { NextButton },
      directives: { tooltip: {} },
    },
  });
  return { wrapper, actions };
};

const dyte = [{ id: 'dyte', hooks: [{ id: 1 }] }];

describe('VideoCallButton behaviour', () => {
  it('loads integrations when none are cached and hides the button', () => {
    const { wrapper, actions } = mountButton([]);
    expect(actions.get).toHaveBeenCalledTimes(1);
    expect(wrapper.find('button').exists()).toBe(false);
  });

  it('hides the button when Dyte has no hook', () => {
    const { wrapper, actions } = mountButton([
      { id: 'dyte', hooks: [] },
      { id: 'slack', hooks: [{ id: 2 }] },
    ]);
    expect(actions.get).not.toHaveBeenCalled();
    expect(wrapper.find('button').exists()).toBe(false);
  });

  it('starts a meeting for the conversation', async () => {
    let resolve;
    DyteAPI.createAMeeting.mockReturnValueOnce(
      new Promise(r => {
        resolve = r;
      })
    );
    const { wrapper } = mountButton(dyte);
    await wrapper.find('button').trigger('click');
    expect(wrapper.vm.isLoading).toBe(true);
    resolve({});
    await flushPromises();
    expect(DyteAPI.createAMeeting).toHaveBeenCalledWith(12);
    expect(wrapper.vm.isLoading).toBe(false);
    expect(useAlert).not.toHaveBeenCalled();
  });

  it.each([
    [{ response: { data: { error: 'Plain' } } }, 'Plain'],
    [
      { response: { data: { error: { error: { message: 'Nested' } } } } },
      'Nested',
    ],
    [{ response: { data: { error: { message: 'Message' } } } }, 'Message'],
    [{}, 'INTEGRATION_SETTINGS.DYTE.CREATE_ERROR'],
  ])('shows the error message for %o', async (error, message) => {
    DyteAPI.createAMeeting.mockRejectedValueOnce(error);
    const { wrapper } = mountButton(dyte);
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(message);
    expect(wrapper.vm.isLoading).toBe(false);
  });
});
