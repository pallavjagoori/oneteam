/**
 * OneTeam behaviour spec for the settings back button.
 *
 * Covers going to a given URL, going back in history without one, the
 * default and custom labels, and the compact text size.
 */
import { mount } from '@vue/test-utils';
import router from '../../../routes/index';
import BackButton from '../BackButton.vue';

vi.mock('../../../routes/index', () => ({
  default: { push: vi.fn(), go: vi.fn() },
}));

/**
 * Mounts the button with the given props.
 *
 * @param {object} props Button props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountButton = (props = {}) =>
  mount(BackButton, { props, global: { mocks: { $t: key => key } } });

describe('BackButton behaviour', () => {
  it('goes to the given URL with a custom label', async () => {
    const wrapper = mountButton({ backUrl: '/settings', buttonLabel: 'Back' });
    expect(wrapper.text()).toBe('Back');
    expect(wrapper.classes()).toContain('text-base');
    await wrapper.trigger('click');
    expect(router.push).toHaveBeenCalledWith('/settings');
  });

  it('goes back in history by default', async () => {
    const wrapper = mountButton({ compact: true });
    expect(wrapper.text()).toBe('GENERAL_SETTINGS.BACK');
    expect(wrapper.classes()).toContain('text-sm');
    await wrapper.trigger('click');
    expect(router.go).toHaveBeenCalledWith(-1);
  });
});
