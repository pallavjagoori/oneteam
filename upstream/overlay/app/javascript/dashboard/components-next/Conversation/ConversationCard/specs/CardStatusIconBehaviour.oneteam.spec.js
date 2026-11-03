/**
 * OneTeam behaviour spec for the conversation card status icon.
 *
 * Covers each known status icon with its tooltip, the empty icon when
 * requested, and no icon otherwise.
 */
import { mount } from '@vue/test-utils';
import CardStatusIcon from '../CardStatusIcon.vue';

const Icon = { name: 'Icon', props: ['icon'], template: '<i />' };

/**
 * Mounts the icon, capturing its tooltip.
 *
 * @param {object} props Icon props.
 * @returns {{ wrapper: import('@vue/test-utils').VueWrapper, tip: { value?: object } }}
 *   The wrapper and tooltip value.
 */
const mountIcon = props => {
  const tip = {};
  const wrapper = mount(CardStatusIcon, {
    props,
    global: {
      stubs: { Icon },
      directives: {
        tooltip: (el, binding) => {
          tip.value = binding.value;
        },
      },
    },
  });
  return { wrapper, tip };
};

describe('CardStatusIcon behaviour', () => {
  it.each([
    ['open', 'i-woot-status-open'],
    ['resolved', 'i-woot-status-resolved'],
    ['pending', 'i-woot-status-pending'],
    ['snoozed', 'i-woot-status-snoozed'],
  ])('shows the %s icon', (status, icon) => {
    const { wrapper, tip } = mountIcon({ status });
    expect(wrapper.getComponent(Icon).props('icon')).toBe(icon);
    expect(tip.value.content).toBe(status);
  });

  it('shows the empty icon only when asked', () => {
    expect(
      mountIcon({ status: 'bot', showEmpty: true })
        .wrapper.getComponent(Icon)
        .props('icon')
    ).toBe('i-woot-status-empty');
    expect(mountIcon({}).wrapper.getComponent(Icon).props('icon')).toBe('');
  });
});
