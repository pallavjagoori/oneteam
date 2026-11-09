/**
 * OneTeam behaviour spec for the portal general settings tab.
 *
 * Covers forwarding portal updates, opening the delete confirmation,
 * deleting the portal, and the empty portal name fallback.
 */
import { mount } from '@vue/test-utils';
import PortalGeneralSettings from '../PortalGeneralSettings.vue';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key, params) => (params ? `${key}:${params.portalName}` : key),
  }),
}));

const env = vi.hoisted(() => ({ open: vi.fn(), close: vi.fn() }));

/**
 * Mounts the settings tab.
 *
 * @param {object|null} activePortal portal edited
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountSettings = activePortal =>
  mount(PortalGeneralSettings, {
    props: { activePortal },
    global: {
      stubs: {
        PortalBaseSettings: {
          name: 'PortalBaseSettings',
          emits: ['updatePortal'],
          template: '<div />',
        },
        ConfirmDeletePortalDialog: {
          name: 'ConfirmDeletePortalDialog',
          props: ['activePortalName'],
          emits: ['deletePortal'],
          data: () => ({ dialogRef: { open: env.open, close: env.close } }),
          template: '<div />',
        },
        Button: {
          props: ['label'],
          emits: ['click'],
          template: '<button @click="$emit(\'click\')">{{ label }}</button>',
        },
      },
    },
  });

describe('PortalGeneralSettings behaviour', () => {
  it('forwards updates and deletes the portal after confirming', async () => {
    const portal = { name: 'Docs' };
    const wrapper = mountSettings(portal);
    expect(wrapper.find('button').text()).toBe(
      'HELP_CENTER.PORTAL_SETTINGS.CONFIGURATION_FORM.DELETE_PORTAL.BUTTON:Docs'
    );

    wrapper
      .findComponent({ name: 'PortalBaseSettings' })
      .vm.$emit('updatePortal', { name: 'X' });
    await wrapper.find('button').trigger('click');
    expect(env.open).toHaveBeenCalled();

    wrapper
      .findComponent({ name: 'ConfirmDeletePortalDialog' })
      .vm.$emit('deletePortal');
    expect(env.close).toHaveBeenCalled();
    expect(wrapper.emitted('updatePortal')).toEqual([[{ name: 'X' }]]);
    expect(wrapper.emitted('deletePortal')).toEqual([[portal]]);
  });

  it('uses an empty name without a portal name', () => {
    const wrapper = mountSettings({});
    expect(
      wrapper
        .findComponent({ name: 'ConfirmDeletePortalDialog' })
        .props('activePortalName')
    ).toBe('');
  });
});
