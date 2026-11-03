/**
 * OneTeam behaviour spec for the reply / private note mode toggle.
 *
 * Covers the sliding chip size and offset for each mode, forcing private
 * mode when replies are restricted, and emitting toggleMode.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import EditorModeToggle from '../EditorModeToggle.vue';

vi.mock('@vueuse/core', async importOriginal => {
  const sizes = [40, 70];
  let call = 0;
  return {
    ...(await importOriginal()),
    useElementSize: () => {
      call += 1;
      return { width: ref(sizes[(call - 1) % 2]) };
    },
  };
});

const chipStyle = wrapper =>
  wrapper.find('[style*="--chip-width"]').attributes('style');

describe('EditorModeToggle behaviour', () => {
  it('sizes the chip for reply mode and emits toggleMode', async () => {
    const wrapper = mount(EditorModeToggle, {
      global: { mocks: { $t: key => key } },
    });
    expect(chipStyle(wrapper)).toContain('--chip-width: 56px');
    expect(chipStyle(wrapper)).toContain('--translate-x: 0px');
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('toggleMode')).toHaveLength(1);
  });

  it('slides to the private note in note or restricted mode', () => {
    [{ mode: 'NOTE' }, { isReplyRestricted: true }].forEach(props => {
      const wrapper = mount(EditorModeToggle, {
        props,
        global: { mocks: { $t: key => key } },
      });
      expect(chipStyle(wrapper)).toContain('--chip-width: 86px');
      expect(chipStyle(wrapper)).toContain('--translate-x: 56px');
    });
    const restricted = mount(EditorModeToggle, {
      props: { isReplyRestricted: true },
      global: { mocks: { $t: key => key } },
    });
    expect(restricted.find('button').attributes('disabled')).toBeDefined();
  });
});
