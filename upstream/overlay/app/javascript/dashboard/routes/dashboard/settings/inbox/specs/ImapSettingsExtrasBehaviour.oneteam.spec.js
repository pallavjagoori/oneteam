/**
 * OneTeam behaviour spec for the IMAP settings extras.
 *
 * Covers reloading the form when the inbox changes, the plain
 * authentication default, switching the mechanism, and the failure
 * alert.
 */
import { nextTick } from 'vue';
import { shallowMount } from '@vue/test-utils';
import { createStore } from 'vuex';
import { useAlert } from 'dashboard/composables';
import ImapSettings from '../ImapSettings.vue';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

/**
 * Mounts the settings with an action that rejects.
 *
 * @param {object} inbox inbox edited
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountSettings = inbox =>
  shallowMount(ImapSettings, {
    props: inbox ? { inbox } : {},
    global: {
      plugins: [
        createStore({
          getters: { 'inboxes/getUIFlags': () => ({ isUpdatingIMAP: false }) },
          actions: {
            'inboxes/updateInboxIMAP': () => Promise.reject(new Error('Nope')),
          },
        }),
      ],
      mocks: { $t: key => key },
      stubs: {
        SettingsFieldSection: { template: '<section><slot /></section>' },
      },
    },
  });

describe('ImapSettings extras', () => {
  it('reloads, switches the mechanism and alerts on failure', async () => {
    const wrapper = mountSettings({ id: 1, imap_enabled: true });
    await nextTick();
    expect(wrapper.vm.authMechanism).toBe('plain');

    await wrapper.setProps({
      inbox: { id: 2, imap_enabled: true, imap_authentication: 'login' },
    });
    expect(wrapper.vm.authMechanism).toBe('login');

    wrapper.vm.handleAuthMechanismChange('cram-md5');
    expect(wrapper.vm.authMechanism).toBe('cram-md5');

    await wrapper.vm.updateInbox();
    expect(useAlert).toHaveBeenCalledWith('Nope');
  });

  it('falls back to an empty inbox', async () => {
    const wrapper = mountSettings();
    await nextTick();
    expect(wrapper.vm.authMechanism).toBe('plain');
  });
});
