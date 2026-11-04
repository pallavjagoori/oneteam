/**
 * OneTeam behaviour spec for the conversation SwitchLayout button.
 *
 * Covers the icon for each layout and emitting toggle.
 */
import { mount } from '@vue/test-utils';
import SwitchLayout from '../SwitchLayout.vue';

/**
 * Mounts the button.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountSwitch = props =>
  mount(SwitchLayout, {
    props,
    global: {
      mocks: { $t: key => key },
      directives: { tooltip: {} },
      stubs: {
        NextButton: {
          props: ['icon'],
          emits: ['click'],
          template: '<button :class="icon" @click="$emit(\'click\')" />',
        },
      },
    },
  });

describe('SwitchLayout behaviour', () => {
  it('shows the expand icon and emits toggle', async () => {
    const wrapper = mountSwitch({});
    expect(wrapper.find('.i-lucide-arrow-right-to-line').exists()).toBe(true);
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('toggle')).toHaveLength(1);
  });

  it('shows the collapse icon on the expanded layout', () => {
    const wrapper = mountSwitch({ isOnExpandedLayout: true });
    expect(wrapper.find('.i-lucide-arrow-left-to-line').exists()).toBe(true);
  });
});
