/**
 * OneTeam behaviour spec for the calls page setup prompt.
 *
 * Covers the admin-only setup action that opens the new inbox flow.
 */
import { mount } from '@vue/test-utils';
import CallsEmptyState from '../CallsEmptyState.vue';

const push = vi.hoisted(() => vi.fn());

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { accountId: 4 } }),
  useRouter: () => ({ push }),
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const EmptyStateLayout = {
  name: 'EmptyStateLayout',
  props: {
    title: String,
    subtitle: String,
    showBackdrop: Boolean,
    actionPerms: Array,
  },
  template: '<div><slot name="actions" /></div>',
};
const Button = {
  name: 'Button',
  props: ['label'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};

describe('CallsEmptyState behaviour', () => {
  it('offers admins a voice channel setup', async () => {
    const wrapper = mount(CallsEmptyState, {
      global: { stubs: { EmptyStateLayout, Button } },
    });
    expect(wrapper.getComponent(EmptyStateLayout).props()).toEqual({
      title: 'CALLS_PAGE.SETUP.TITLE',
      subtitle: 'CALLS_PAGE.SETUP.SUBTITLE',
      showBackdrop: false,
      actionPerms: ['administrator'],
    });
    await wrapper.get('button').trigger('click');
    expect(push).toHaveBeenCalledWith({
      name: 'settings_inbox_new',
      params: { accountId: 4 },
    });
  });
});
