/**
 * OneTeam behaviour spec for the help center PortalEmptyState.
 *
 * Covers the sample article columns, opening the create portal dialog
 * and routing to the new portal's articles.
 */
import { mount } from '@vue/test-utils';
import PortalEmptyState from '../PortalEmptyState.vue';

const env = vi.hoisted(() => ({ push: vi.fn(), open: vi.fn() }));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => ({ push: env.push }),
}));

const DialogStub = {
  name: 'CreatePortalDialog',
  emits: ['create'],
  setup: () => ({ dialogRef: { open: env.open } }),
  template: '<div />',
};

describe('PortalEmptyState behaviour', () => {
  it('shows sample articles, opens the dialog and routes on create', async () => {
    const wrapper = mount(PortalEmptyState, {
      global: {
        mocks: { $t: key => key },
        stubs: {
          EmptyStateLayout: {
            template:
              '<div><slot name="empty-state-item" /><slot name="actions" /></div>',
          },
          ArticleCard: {
            props: ['title'],
            template: '<div class="article" />',
          },
          CreatePortalDialog: DialogStub,
          Button: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')" />',
          },
        },
      },
    });
    expect(wrapper.findAll('.article').length).toBeGreaterThan(1);
    await wrapper.find('button').trigger('click');
    expect(env.open).toHaveBeenCalled();
    wrapper
      .findComponent(DialogStub)
      .vm.$emit('create', { slug: 'docs', locale: 'en' });
    expect(env.push).toHaveBeenCalledWith({
      name: 'portals_articles_index',
      params: { portalSlug: 'docs', locale: 'en' },
    });
  });
});
