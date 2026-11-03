/**
 * OneTeam behaviour spec for the conversation side panel switch.
 *
 * Covers toggling the contact sidebar (button and Alt+O shortcut),
 * toggling the Copilot panel, the active styling, and hiding the
 * Copilot button when Captain is off for the account.
 */
import { mount } from '@vue/test-utils';
import { computed, ref } from 'vue';
import SidepanelSwitch from '../SidepanelSwitch.vue';

const env = vi.hoisted(() => ({
  update: vi.fn(),
  settings: null,
  captain: true,
  shortcuts: null,
}));

vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({
    uiSettings: env.settings,
    updateUISettings: env.update,
  }),
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: key =>
    key === 'getCurrentAccountId'
      ? computed(() => 1)
      : computed(() => () => env.captain),
}));
vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: events => {
    env.shortcuts = events;
  },
}));

const Button = {
  name: 'NextButton',
  props: ['icon'],
  emits: ['click'],
  template: '<button :data-icon="icon" />',
};

/**
 * Mounts the switch with the given panel state.
 *
 * @param {object} settings UI settings.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountSwitch = (settings = {}) => {
  env.settings = ref(settings);
  return mount(SidepanelSwitch, {
    global: {
      stubs: { Button, ButtonGroup: { template: '<div><slot /></div>' } },
      directives: { tooltip: {} },
      mocks: { $t: key => key },
    },
  });
};

const button = (wrapper, icon) =>
  wrapper.findAllComponents(Button).find(b => b.props('icon') === icon);

describe('SidepanelSwitch behaviour', () => {
  beforeEach(() => {
    env.update = vi.fn();
    env.captain = true;
  });

  it('opens the contact sidebar from the button and the shortcut', () => {
    const wrapper = mountSwitch({ is_contact_sidebar_open: false });
    button(wrapper, 'i-ph-user-bold').vm.$emit('click');
    expect(env.update).toHaveBeenCalledWith({
      is_contact_sidebar_open: true,
      is_copilot_panel_open: false,
    });
    env.shortcuts['Alt+KeyO'].action();
    expect(env.update).toHaveBeenCalledTimes(2);
  });

  it('toggles the Copilot panel and marks open panels', () => {
    const wrapper = mountSwitch({
      is_contact_sidebar_open: true,
      is_copilot_panel_open: true,
    });
    const copilot = button(wrapper, 'i-woot-captain');
    expect(copilot.classes()).toContain('!text-n-iris-9');
    expect(button(wrapper, 'i-ph-user-bold').classes()).toContain(
      'bg-n-alpha-2'
    );
    copilot.vm.$emit('click');
    expect(env.update).toHaveBeenCalledWith({
      is_contact_sidebar_open: false,
      is_copilot_panel_open: false,
    });
  });

  it('hides the Copilot button without Captain', () => {
    env.captain = false;
    expect(button(mountSwitch(), 'i-woot-captain')).toBeUndefined();
  });
});
