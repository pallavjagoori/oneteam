/**
 * OneTeam behaviour spec for the inbox creation InboxChannels wizard.
 *
 * Covers the page title for the first, middle and finish steps and the
 * branded wizard items.
 */
import { mount } from '@vue/test-utils';
import InboxChannels from '../InboxChannels.vue';

const env = vi.hoisted(() => ({ routeName: '' }));

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ name: env.routeName }),
}));
vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return { useMapGetter: () => computed(() => ({ installationName: 'Desk' })) };
});
vi.mock('shared/composables/useBranding', () => ({
  useBranding: () => ({ replaceInstallationName: text => `${text}*` }),
}));

const WizardStub = {
  name: 'WootWizard',
  props: ['items'],
  template: '<div />',
};

/**
 * Mounts the wizard on a route.
 *
 * @param {string} routeName current route name
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountAt = routeName => {
  env.routeName = routeName;
  return mount(InboxChannels, {
    global: {
      stubs: {
        PageHeader: {
          props: ['headerTitle'],
          template: '<h1>{{ headerTitle }}</h1>',
        },
        WootWizard: WizardStub,
        RouterView: true,
      },
    },
  });
};

describe('InboxChannels behaviour', () => {
  it.each([
    ['settings_inbox_new', 'INBOX_MGMT.ADD.AUTH.TITLE'],
    ['settings_inbox_finish', 'INBOX_MGMT.ADD.AUTH.TITLE_FINISH'],
    ['settings_inboxes_add_agents', 'INBOX_MGMT.ADD.AUTH.TITLE_NEXT'],
  ])('titles the %s step', (routeName, title) => {
    expect(mountAt(routeName).find('h1').text()).toBe(title);
  });

  it('builds branded wizard steps', () => {
    const items = mountAt('settings_inbox_new')
      .findComponent(WizardStub)
      .props('items');
    expect(items.map(item => item.route)).toEqual([
      'settings_inbox_new',
      'settings_inboxes_page_channel',
      'settings_inboxes_add_agents',
      'settings_inbox_finish',
    ]);
    expect(items[0].body).toBe('INBOX_MGMT.CREATE_FLOW.CHANNEL.BODY*');
  });
});
