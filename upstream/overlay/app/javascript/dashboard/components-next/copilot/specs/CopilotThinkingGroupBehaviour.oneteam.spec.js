/**
 * OneTeam behaviour spec for the Copilot thinking steps group.
 *
 * Covers the step count, one block per step, toggling the steps, and
 * collapsing when the parent asks for it.
 */
import { mount } from '@vue/test-utils';
import CopilotThinkingGroup from '../CopilotThinkingGroup.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const Icon = { name: 'Icon', props: ['icon'], template: '<i />' };
const CopilotThinkingBlock = {
  name: 'CopilotThinkingBlock',
  props: ['content', 'reasoning'],
  template: '<p />',
};
const messages = [
  { id: 1, message: { content: 'Look up', reasoning: 'Need data' } },
  { id: 2, message: { content: 'Answer', reasoning: 'Done' } },
];

/**
 * Mounts the group.
 *
 * @param {object} props Group props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountGroup = props =>
  mount(CopilotThinkingGroup, {
    props: { messages, ...props },
    global: { stubs: { Icon, CopilotThinkingBlock } },
  });

describe('CopilotThinkingGroup behaviour', () => {
  it('lists steps and toggles them', async () => {
    const wrapper = mountGroup();
    expect(wrapper.get('button').text()).toContain('2');
    const blocks = wrapper.findAllComponents(CopilotThinkingBlock);
    expect(blocks[0].props()).toEqual({
      content: 'Look up',
      reasoning: 'Need data',
    });
    const panel = wrapper.get('.space-y-3');
    expect(panel.classes()).toContain('opacity-100');
    expect(wrapper.getComponent(Icon).props('icon')).toBe(
      'i-lucide-chevron-down'
    );
    await wrapper.get('button').trigger('click');
    expect(panel.classes()).toContain('opacity-0');
    expect(wrapper.getComponent(Icon).props('icon')).toBe(
      'i-lucide-chevron-right'
    );
  });

  it('starts collapsed and collapses on request', async () => {
    const collapsed = mountGroup({ defaultCollapsed: true });
    expect(collapsed.get('.space-y-3').classes()).toContain('opacity-0');
    await collapsed.setProps({ defaultCollapsed: false });
    expect(collapsed.get('.space-y-3').classes()).toContain('opacity-0');
    const wrapper = mountGroup();
    await wrapper.setProps({ defaultCollapsed: true });
    expect(wrapper.get('.space-y-3').classes()).toContain('opacity-0');
  });
});
