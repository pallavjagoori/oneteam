/**
 * OneTeam behaviour spec for the keyboard shortcuts modal.
 *
 * Covers listing every shortcut with its keys and separators, adding
 * Shift on QWERTZ layouts for the affected shortcuts, and closing.
 */
import { flushPromises, mount } from '@vue/test-utils';
import WootKeyShortcutModal from '../WootKeyShortcutModal.vue';
import { SHORTCUT_KEYS } from '../constants';

const env = vi.hoisted(() => ({ layout: 'QWERTY' }));

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('dashboard/composables/useDetectKeyboardLayout', () => ({
  useDetectKeyboardLayout: async () => env.layout,
}));

const WootModal = {
  name: 'WootModal',
  props: ['show', 'onClose'],
  template: '<div><slot /></div>',
};

/**
 * Mounts the modal on a keyboard layout.
 *
 * @param {string} layout Detected keyboard layout.
 * @returns {Promise<import('@vue/test-utils').VueWrapper>} The mounted wrapper.
 */
const mountModal = async layout => {
  env.layout = layout;
  const wrapper = mount(WootKeyShortcutModal, {
    props: { show: true },
    global: {
      stubs: {
        WootModal,
        WootModalHeader: true,
        Hotkey: { template: '<kbd><slot /></kbd>' },
      },
      mocks: { $t: key => key },
    },
  });
  await flushPromises();
  return wrapper;
};

describe('WootKeyShortcutModal behaviour', () => {
  it('lists shortcuts and closes', async () => {
    const wrapper = await mountModal('QWERTY');
    const titles = wrapper.findAll('h5').map(h => h.text());
    expect(titles).toContain(
      `KEYBOARD_SHORTCUTS.TITLE.${SHORTCUT_KEYS[0].label}`
    );
    expect(wrapper.findAll('kbd').map(k => k.text())).not.toContain('Shift');
    expect(wrapper.find('span.font-semibold').text()).toBe('/');
    wrapper.getComponent(WootModal).props('onClose')();
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('adds Shift on QWERTZ layouts', async () => {
    const wrapper = await mountModal('QWERTZ');
    expect(wrapper.findAll('kbd').map(k => k.text())).toContain('Shift');
  });
});
