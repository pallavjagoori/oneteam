/**
 * OneTeam behaviour spec for the legacy settings section.
 *
 * Covers the title, subtitle (default and custom slot), note, body, and
 * the optional bottom border.
 */
import { mount } from '@vue/test-utils';
import SettingsSection from '../SettingsSection.vue';

/**
 * Mounts the section.
 *
 * @param {object} props Section props.
 * @param {object} slots Extra slots.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountSection = (props, slots = {}) =>
  mount(SettingsSection, {
    props,
    slots: { default: '<input class="field" />', ...slots },
    global: { mocks: { $t: key => key } },
  });

describe('SettingsSection behaviour', () => {
  it('shows the title, subtitle, note and body with a border', () => {
    const wrapper = mountSection({
      title: 'Greeting',
      subTitle: 'Shown to visitors',
      note: 'Only on web',
    });
    expect(wrapper.text()).toContain('Greeting');
    expect(wrapper.text()).toContain('Shown to visitors');
    expect(wrapper.text()).toContain('INBOX_MGMT.NOTE');
    expect(wrapper.text()).toContain('Only on web');
    expect(wrapper.find('.field').exists()).toBe(true);
    expect(wrapper.classes()).toContain('border-b');
  });

  it('supports a custom subtitle and no border, title or note', () => {
    const wrapper = mountSection(
      { subTitle: 'x', showBorder: false },
      { subTitle: '<em>Custom</em>' }
    );
    expect(wrapper.get('em').text()).toBe('Custom');
    expect(wrapper.classes()).not.toContain('border-b');
    expect(wrapper.find('.text-n-brand').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('INBOX_MGMT.NOTE');
    expect(mountSection({}).find('em').exists()).toBe(false);
  });
});
