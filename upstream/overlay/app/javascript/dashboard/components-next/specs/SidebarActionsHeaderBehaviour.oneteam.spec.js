/**
 * OneTeam behaviour spec for the sidebar panel header.
 *
 * Covers the title, one labelled button per action that emits its key,
 * the close button, and the default of no actions.
 */
import { mount } from '@vue/test-utils';
import SidebarActionsHeader from '../SidebarActionsHeader.vue';

const Button = {
  name: 'NextButton',
  props: { icon: String },
  emits: ['click'],
  template: '<button :data-icon="icon" @click="$emit(\'click\')" />',
};

/**
 * Mounts the header.
 *
 * @param {object} props Header props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountHeader = props =>
  mount(SidebarActionsHeader, {
    props: { title: 'Copilot', ...props },
    global: {
      stubs: { Button },
      directives: { tooltip: {} },
      mocks: { $t: key => key },
    },
  });

describe('SidebarActionsHeader behaviour', () => {
  it('emits action keys and close', async () => {
    const wrapper = mountHeader({
      buttons: [{ key: 'reset', icon: 'i-lucide-refresh', tooltip: 'Reset' }],
    });
    expect(wrapper.text()).toContain('Copilot');
    const reset = wrapper.get('[data-icon="i-lucide-refresh"]');
    expect(reset.attributes('aria-label')).toBe('Reset');
    await reset.trigger('click');
    expect(wrapper.emitted('click')).toEqual([['reset']]);
    const close = wrapper.get('[data-icon="i-lucide-x"]');
    expect(close.attributes('aria-label')).toBe('GENERAL.CLOSE');
    await close.trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('shows only the close button by default', () => {
    expect(mountHeader().findAll('button')).toHaveLength(1);
    expect(SidebarActionsHeader.props.buttons.default()).toEqual([]);
  });
});
