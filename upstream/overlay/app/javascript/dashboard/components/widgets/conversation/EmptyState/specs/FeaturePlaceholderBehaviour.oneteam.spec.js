/**
 * OneTeam behaviour spec for the conversation empty-state shortcuts.
 *
 * Covers listing the command bar and keyboard shortcut hints with
 * their ⌘ key combinations.
 */
import { mount } from '@vue/test-utils';
import FeaturePlaceholder from '../FeaturePlaceholder.vue';

describe('FeaturePlaceholder behaviour', () => {
  it('lists the shortcut hints', () => {
    const wrapper = mount(FeaturePlaceholder, {
      global: {
        stubs: { Hotkey: { template: '<kbd><slot /></kbd>' } },
        mocks: { $t: key => key },
      },
    });
    expect(wrapper.findAll('kbd').map(k => k.text())).toEqual([
      '⌘',
      'K',
      '⌘',
      '/',
    ]);
    expect(wrapper.text()).toContain('CONVERSATION.EMPTY_STATE.CMD_BAR');
    expect(wrapper.text()).toContain(
      'CONVERSATION.EMPTY_STATE.KEYBOARD_SHORTCUTS'
    );
  });
});
