/**
 * OneTeam behaviour spec for the Copilot reply bottom panel.
 *
 * Covers the accept label with its shortcut, discarding and accepting,
 * and disabling both while content generates.
 */
import { computed } from 'vue';
import { mount } from '@vue/test-utils';
import CopilotReplyBottomPanel from '../CopilotReplyBottomPanel.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/composables/utils/useKbd', () => ({
  useKbd: () => computed(() => '⌘ + ↵'),
}));

/**
 * Mounts the panel.
 *
 * @param {boolean} isGeneratingContent whether content is generating
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountPanel = isGeneratingContent =>
  mount(CopilotReplyBottomPanel, {
    props: { isGeneratingContent },
    global: {
      stubs: {
        NextButton: {
          props: { label: String, disabled: Boolean },
          emits: ['click'],
          template:
            '<button :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
        },
      },
    },
  });

describe('CopilotReplyBottomPanel behaviour', () => {
  it('discards and accepts', async () => {
    const wrapper = mountPanel(false);
    const [discard, accept] = wrapper.findAll('button');
    expect(accept.text()).toBe('GENERAL.ACCEPT  (⌘ + ↵)');
    await discard.trigger('click');
    await accept.trigger('click');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
    expect(wrapper.emitted('submit')).toHaveLength(1);
  });

  it('disables both buttons while generating', () => {
    const wrapper = mountPanel(true);
    expect(wrapper.findAll('button').every(b => b.element.disabled)).toBe(true);
  });
});
