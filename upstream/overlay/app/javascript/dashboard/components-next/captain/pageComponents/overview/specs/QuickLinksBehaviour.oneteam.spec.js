/**
 * OneTeam behaviour spec for the Captain overview quick links.
 *
 * Covers the external docs link, the playground and billing router
 * links with their route params, hiding billing from non-admins, and
 * hiding everything off Chatwoot Cloud.
 */
import { mount } from '@vue/test-utils';
import QuickLinks from '../QuickLinks.vue';

const env = vi.hoisted(() => ({ cloud: true, admin: true }));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { accountId: 2, assistantId: 4 } }),
  RouterLink: {
    name: 'RouterLink',
    props: ['to'],
    template: '<a class="router"><slot /></a>',
  },
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('dashboard/composables/useAccount', async () => {
  const { computed } = await import('vue');
  return {
    useAccount: () => ({ isOnChatwootCloud: computed(() => env.cloud) }),
  };
});
vi.mock('dashboard/composables/useAdmin', async () => {
  const { computed } = await import('vue');
  return { useAdmin: () => ({ isAdmin: computed(() => env.admin) }) };
});
vi.mock('dashboard/helper/featureHelper', () => ({
  getHelpUrlForFeature: name => `https://help.test/${name}`,
}));

describe('QuickLinks behaviour', () => {
  it('links docs, playground and billing for admins', () => {
    env.cloud = true;
    env.admin = true;
    const wrapper = mount(QuickLinks);
    const docs = wrapper.get('a[href]');
    expect(docs.attributes()).toMatchObject({
      href: 'https://help.test/captain',
      target: '_blank',
      rel: 'noopener noreferrer',
    });
    expect(docs.find('.i-lucide-arrow-up-right').exists()).toBe(true);
    const routes = wrapper.findAllComponents({ name: 'RouterLink' });
    expect(routes.map(r => r.props('to'))).toEqual([
      {
        name: 'captain_assistants_playground_index',
        params: { accountId: 2, assistantId: 4 },
      },
      { name: 'billing_settings_index', params: { accountId: 2 } },
    ]);
    expect(routes[0].find('.i-lucide-chevron-right').exists()).toBe(true);
  });

  it('hides billing from agents and everything off cloud', () => {
    env.admin = false;
    expect(
      mount(QuickLinks).findAllComponents({ name: 'RouterLink' })
    ).toHaveLength(1);
    env.cloud = false;
    expect(mount(QuickLinks).find('div').exists()).toBe(false);
  });
});
