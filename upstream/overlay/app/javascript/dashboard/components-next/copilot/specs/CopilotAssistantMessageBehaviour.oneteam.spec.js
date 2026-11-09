/**
 * OneTeam behaviour spec for Copilot assistant messages.
 *
 * Covers the empty message notice, inserting a suggested reply into the
 * editor, and when the use button shows.
 */
import { mount } from '@vue/test-utils';
import { emitter } from 'shared/helpers/mitt';
import { useTrack } from 'dashboard/composables';
import { BUS_EVENTS } from 'shared/constants/busEvents';
import CopilotAssistantMessage from '../CopilotAssistantMessage.vue';

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { accountId: 1 } }),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('dashboard/composables', () => ({ useTrack: vi.fn() }));

/**
 * Mounts the message.
 *
 * @param {object} props props overrides
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountMessage = props =>
  mount(CopilotAssistantMessage, {
    props,
    global: {
      mocks: { $t: key => key },
      directives: { dompurifyHtml: {} },
      stubs: {
        Button: {
          props: ['label'],
          emits: ['click'],
          template: '<button @click="$emit(\'click\')">{{ label }}</button>',
        },
      },
    },
  });

describe('CopilotAssistantMessage behaviour', () => {
  it('shows a notice for empty messages and no use button', () => {
    const wrapper = mountMessage({
      message: { reply_suggestion: true },
      isLastMessage: true,
    });
    expect(wrapper.text()).toContain('CAPTAIN.COPILOT.EMPTY_MESSAGE');
    expect(wrapper.find('button').exists()).toBe(false);
  });

  it('inserts a suggested reply into the editor', async () => {
    const insert = vi.fn();
    emitter.on(BUS_EVENTS.INSERT_INTO_RICH_EDITOR, insert);
    const wrapper = mountMessage({
      message: { content: 'Try this', reply_suggestion: true },
      isLastMessage: true,
    });
    await wrapper.find('button').trigger('click');
    expect(insert).toHaveBeenCalledWith('Try this');
    expect(useTrack).toHaveBeenCalled();
    emitter.off(BUS_EVENTS.INSERT_INTO_RICH_EDITOR, insert);
  });

  it('hides the use button when replies cannot be used', () => {
    const wrapper = mountMessage({
      message: { content: 'Try this', reply_suggestion: true },
      isLastMessage: true,
      canUseReply: false,
    });
    expect(wrapper.find('button').exists()).toBe(false);
  });
});
