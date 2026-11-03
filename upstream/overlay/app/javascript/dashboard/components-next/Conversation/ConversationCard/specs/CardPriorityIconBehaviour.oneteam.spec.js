/**
 * OneTeam behaviour spec for the conversation priority icon.
 *
 * Covers the icon and tooltip for each priority, the empty state icon
 * when asked, and nothing for unknown or missing priorities.
 */
import { mount } from '@vue/test-utils';
import CardPriorityIcon from '../CardPriorityIcon.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const Icon = { name: 'Icon', props: ['icon'], template: '<i />' };

/**
 * Mounts the icon and captures its tooltip.
 *
 * @param {object} props Icon props.
 * @returns {{icon: string, tooltip: string}} Rendered icon and tooltip.
 */
const mountIcon = props => {
  let tooltip;
  const wrapper = mount(CardPriorityIcon, {
    props,
    global: {
      stubs: { Icon },
      directives: {
        tooltip: (el, binding) => {
          tooltip = binding.value.content;
        },
      },
    },
  });
  return { icon: wrapper.getComponent(Icon).props('icon'), tooltip };
};

describe('CardPriorityIcon behaviour', () => {
  it.each(['urgent', 'high', 'medium', 'low'])(
    'shows the %s priority',
    priority => {
      expect(mountIcon({ priority })).toEqual({
        icon: `i-woot-priority-${priority}`,
        tooltip: `CONVERSATION.PRIORITY.OPTIONS.${priority.toUpperCase()}`,
      });
    }
  );

  it('shows the empty icon when asked', () => {
    expect(mountIcon({ showEmpty: true })).toEqual({
      icon: 'i-woot-priority-empty',
      tooltip: 'CONVERSATION.PRIORITY.OPTIONS.NONE',
    });
  });

  it('shows nothing for unknown or missing priorities', () => {
    expect(mountIcon({ priority: 'odd' })).toEqual({ icon: '', tooltip: '' });
    expect(mountIcon({})).toEqual({ icon: '', tooltip: '' });
  });
});
