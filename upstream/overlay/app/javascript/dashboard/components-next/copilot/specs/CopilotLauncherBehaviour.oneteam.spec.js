/**
 * OneTeam behaviour spec for the floating Copilot launcher.
 *
 * Covers showing it when Captain is on, the panel is closed and the
 * page isn't a conversation, hiding it otherwise, and opening the
 * Copilot panel (closing the contact sidebar).
 */
import { mount } from '@vue/test-utils';
import { computed, ref } from 'vue';
import CopilotLauncher from '../CopilotLauncher.vue';

const env = vi.hoisted(() => ({
  route: 'home',
  captain: true,
  settings: null,
  update: vi.fn(),
}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ name: env.route }),
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

const Button = {
  name: 'NextButton',
  emits: ['click'],
  template: '<button class="launch" @click="$emit(\'click\')" />',
};

/**
 * Mounts the launcher with the given panel state.
 *
 * @param {object} settings UI settings.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountLauncher = (settings = {}) => {
  env.settings = ref(settings);
  return mount(CopilotLauncher, {
    global: {
      stubs: { Button, ButtonGroup: { template: '<div><slot /></div>' } },
    },
  });
};

describe('CopilotLauncher behaviour', () => {
  beforeEach(() => {
    env.route = 'home';
    env.captain = true;
    env.update = vi.fn();
  });

  it('opens the Copilot panel', async () => {
    await mountLauncher({ is_copilot_panel_open: false })
      .get('.launch')
      .trigger('click');
    expect(env.update).toHaveBeenCalledWith({
      is_copilot_panel_open: true,
      is_contact_sidebar_open: false,
    });
  });

  it('hides when the panel is open, on conversations or without Captain', () => {
    expect(
      mountLauncher({ is_copilot_panel_open: true }).find('.launch').exists()
    ).toBe(false);
    env.route = 'inbox_conversation';
    expect(mountLauncher().find('.launch').exists()).toBe(false);
    env.route = 'home';
    env.captain = false;
    expect(mountLauncher().find('.launch').exists()).toBe(false);
  });
});
