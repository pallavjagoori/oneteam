/**
 * OneTeam behaviour spec for the deprecated emoji-or-icon component.
 *
 * Covers showing the emoji when the user prefers emoji icons and the
 * emoji is supported, falling back to the fluent icon otherwise, and
 * rendering nothing without an icon or UI settings.
 */
import { mount } from '@vue/test-utils';
import EmojiOrIcon from '../EmojiOrIcon.vue';

const env = vi.hoisted(() => ({ supported: true }));

vi.mock('shared/helpers/emoji', () => ({
  hasEmojiSupport: () => env.supported,
}));

const FluentIcon = {
  name: 'FluentIcon',
  props: ['size', 'icon'],
  template: '<span class="fluent" />',
};

/**
 * Mounts the component with the given UI settings and props.
 *
 * @param {object|null} uiSettings Value of the getUISettings getter.
 * @param {object} props Component props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountIcon = (uiSettings, props) =>
  mount(EmojiOrIcon, {
    props,
    global: {
      stubs: { FluentIcon },
      mocks: { $store: { getters: { getUISettings: uiSettings } } },
    },
  });

describe('EmojiOrIcon behaviour', () => {
  beforeEach(() => {
    env.supported = true;
  });

  it('shows the emoji when emoji icons are preferred and supported', () => {
    const wrapper = mountIcon(
      { icon_type: 'emoji' },
      { icon: 'i-x', emoji: '🙂' }
    );
    const tag = wrapper.get('i');
    expect(tag.text()).toBe('🙂');
    expect(tag.classes()).toContain('icon--emoji');
    expect(wrapper.vm.iconContent).toBe('🙂');
  });

  it('falls back to the fluent icon when the emoji is unsupported', () => {
    env.supported = false;
    const wrapper = mountIcon(
      { icon_type: 'emoji' },
      { icon: 'i-x', emoji: '🙂', iconSize: 16 }
    );
    const icon = wrapper.getComponent(FluentIcon);
    expect(icon.props()).toMatchObject({ size: 16, icon: 'i-x' });
    expect(icon.classes()).toEqual(
      expect.arrayContaining(['icon--font', 'i-x'])
    );
    expect(wrapper.vm.iconContent).toBe('');
  });

  it('uses the icon without UI settings and renders nothing without one', () => {
    expect(
      mountIcon(null, { icon: 'i-y' }).findComponent(FluentIcon).exists()
    ).toBe(true);
    const empty = mountIcon({ icon_type: 'font' }, { emoji: '🙂' });
    expect(empty.find('i').exists()).toBe(false);
    expect(empty.findComponent(FluentIcon).exists()).toBe(false);
  });
});
