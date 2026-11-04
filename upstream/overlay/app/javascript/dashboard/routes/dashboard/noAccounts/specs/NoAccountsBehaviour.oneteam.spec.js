/**
 * OneTeam behaviour spec for the no accounts screen.
 *
 * Covers the cloud and self-hosted messages and logging out.
 */
import { mount } from '@vue/test-utils';
import NoAccounts from '../Index.vue';
import Auth from 'dashboard/api/auth';

const env = vi.hoisted(() => ({ cloud: false }));

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/api/auth', () => ({ default: { logout: vi.fn() } }));
vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return { useMapGetter: () => computed(() => env.cloud) };
});

/**
 * Mounts the screen.
 *
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountScreen = () =>
  mount(NoAccounts, {
    global: {
      mocks: { $t: key => key },
      stubs: {
        EmptyState: { props: ['message'], template: '<p>{{ message }}</p>' },
        NextButton: {
          emits: ['click'],
          template: '<button @click="$emit(\'click\')" />',
        },
      },
    },
  });

describe('No accounts behaviour', () => {
  it('shows the self-hosted message and logs out', async () => {
    env.cloud = false;
    const wrapper = mountScreen();
    expect(wrapper.text()).toBe('APP_GLOBAL.NO_ACCOUNTS.MESSAGE_SELF_HOSTED');
    await wrapper.find('button').trigger('click');
    expect(Auth.logout).toHaveBeenCalled();
  });

  it('shows the cloud message', () => {
    env.cloud = true;
    expect(mountScreen().text()).toBe('APP_GLOBAL.NO_ACCOUNTS.MESSAGE_CLOUD');
  });
});
