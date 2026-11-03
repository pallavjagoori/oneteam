/**
 * OneTeam behaviour spec for the widget FileBubble.
 *
 * Covers the upload title, decoded file names, contrasting text colour
 * for user bubbles, and opening the file in a new window.
 */
import { mount } from '@vue/test-utils';
import FileBubble from '../FileBubble.vue';

/**
 * Mounts the bubble.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountBubble = props =>
  mount(FileBubble, {
    props: { url: 'https://x.co/files/my%20doc.pdf', ...props },
    global: {
      mocks: { $t: key => key },
      stubs: { FluentIcon: true },
    },
  });

describe('FileBubble behaviour', () => {
  it('shows the uploading title while in progress', () => {
    expect(mountBubble({ isInProgress: true }).text()).toContain(
      'COMPONENTS.FILE_BUBBLE.UPLOADING'
    );
  });

  it('shows the decoded name with no colour for agent bubbles', () => {
    const wrapper = mountBubble({ widgetColor: '#000000' });
    expect(wrapper.text()).toContain('my doc.pdf');
    expect(wrapper.find('.download').attributes('style')).toBeUndefined();
  });

  it('uses a contrasting colour for user bubbles', () => {
    const wrapper = mountBubble({ isUserBubble: true, widgetColor: '#000000' });
    expect(wrapper.find('.download').attributes('style')).toContain('color');
  });

  it('opens the file in a focused new window', () => {
    const focus = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ focus });
    mountBubble({}).vm.openLink();
    expect(window.open).toHaveBeenCalledWith(
      'https://x.co/files/my%20doc.pdf',
      '_blank'
    );
    expect(focus).toHaveBeenCalled();
  });
});
