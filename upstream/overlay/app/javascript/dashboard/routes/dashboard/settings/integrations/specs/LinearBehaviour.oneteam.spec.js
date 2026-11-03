/**
 * OneTeam behaviour spec for the Linear integration settings page.
 *
 * Covers loading the integration and the connect or disconnect action.
 */
import { mount, flushPromises } from '@vue/test-utils';
import Linear from '../Linear.vue';

const env = vi.hoisted(() => ({ integration: {}, dispatch: vi.fn() }));

vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return {
    useStore: () => ({ dispatch: env.dispatch }),
    useFunctionGetter: () => computed(() => env.integration),
    useMapGetter: () => computed(() => ({ isCreatingLinear: false })),
  };
});

const IntegrationStub = {
  name: 'Integration',
  props: ['integrationAction'],
  template: '<div />',
};

/**
 * Mounts the page and waits for the integration load.
 *
 * @returns {Promise<import('@vue/test-utils').VueWrapper>}
 */
const mountPage = async () => {
  const wrapper = mount(Linear, {
    global: {
      mocks: { $t: key => key },
      stubs: {
        SettingsLayout: {
          props: ['isLoading'],
          template:
            '<div :data-loading="isLoading"><slot name="header"/><slot name="body"/></div>',
        },
        BaseSettingsHeader: true,
        Integration: IntegrationStub,
      },
    },
  });
  await flushPromises();
  return wrapper;
};

describe('Linear behaviour', () => {
  it('loads and offers disconnect when enabled', async () => {
    env.integration = { id: 'linear', enabled: true, action: '/connect' };
    const wrapper = await mountPage();
    expect(env.dispatch).toHaveBeenCalledWith('integrations/get', 'linear');
    expect(wrapper.attributes('data-loading')).toBe('false');
    expect(
      wrapper.findComponent(IntegrationStub).props('integrationAction')
    ).toBe('disconnect');
  });

  it('offers the connect action when disabled', async () => {
    env.integration = { id: 'linear', enabled: false, action: '/connect' };
    const wrapper = await mountPage();
    expect(
      wrapper.findComponent(IntegrationStub).props('integrationAction')
    ).toBe('/connect');
  });
});
