/**
 * OneTeam behaviour spec for the legacy settings page header.
 *
 * Covers the title and slot, the optional back button with its label
 * and URL, the icon class, and the admin flag.
 */
import { mount } from '@vue/test-utils';
import SettingsHeader from '../SettingsHeader.vue';

vi.mock('dashboard/composables/useAdmin', () => ({
  useAdmin: () => ({ isAdmin: true }),
}));

const BackButton = {
  name: 'BackButton',
  props: ['buttonLabel', 'backUrl'],
  template: '<button />',
};

describe('SettingsHeader behaviour', () => {
  it('shows the title, slot and back button', () => {
    const wrapper = mount(SettingsHeader, {
      props: {
        headerTitle: 'Inboxes',
        icon: 'inbox',
        showBackButton: true,
        backUrl: '/back',
        backButtonLabel: 'Back',
      },
      slots: { default: '<em>extra</em>' },
      global: { stubs: { BackButton } },
    });
    expect(wrapper.text()).toContain('Inboxes');
    expect(wrapper.find('em').exists()).toBe(true);
    expect(wrapper.getComponent(BackButton).props()).toEqual({
      buttonLabel: 'Back',
      backUrl: '/back',
    });
    expect(wrapper.vm.iconClass).toBe('icon inbox header--icon');
    expect(wrapper.vm.isAdmin).toBe(true);
  });

  it('hides the back button by default', () => {
    const wrapper = mount(SettingsHeader, {
      global: { stubs: { BackButton } },
    });
    expect(wrapper.findComponent(BackButton).exists()).toBe(false);
  });
});
