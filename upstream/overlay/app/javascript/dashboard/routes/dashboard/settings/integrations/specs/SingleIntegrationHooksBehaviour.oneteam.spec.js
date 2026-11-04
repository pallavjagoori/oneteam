/**
 * OneTeam behaviour spec for the SingleIntegrationHooks card.
 *
 * Covers the integration details, connecting, and disconnecting the
 * first hook.
 */
import { mount } from '@vue/test-utils';
import SingleIntegrationHooks from '../SingleIntegrationHooks.vue';

const env = vi.hoisted(() => ({ connected: false }));

vi.mock('dashboard/composables/useIntegrationHook', async () => {
  const { computed } = await import('vue');
  return {
    useIntegrationHook: () => ({
      integration: computed(() => ({
        name: 'Dialogflow',
        description: 'Bots',
        hooks: [{ id: 4 }],
      })),
      hasConnectedHooks: computed(() => env.connected),
    }),
  };
});
vi.mock('shared/composables/useBranding', () => ({
  useBranding: () => ({ replaceInstallationName: text => `${text}!` }),
}));

/**
 * Mounts the card.
 *
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountCard = () =>
  mount(SingleIntegrationHooks, {
    props: { integrationId: 'dialogflow' },
    global: {
      mocks: { $t: key => key },
      stubs: {
        Button: {
          props: ['label'],
          emits: ['click'],
          template: '<button @click="$emit(\'click\')">{{ label }}</button>',
        },
      },
    },
  });

describe('SingleIntegrationHooks behaviour', () => {
  it('shows details and connects', async () => {
    env.connected = false;
    const wrapper = mountCard();
    expect(wrapper.text()).toContain('Dialogflow');
    expect(wrapper.text()).toContain('Bots!');
    expect(wrapper.find('img').attributes('src')).toBe(
      '/dashboard/images/integrations/dialogflow.png'
    );
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('add')).toHaveLength(1);
  });

  it('disconnects the first hook', async () => {
    env.connected = true;
    const wrapper = mountCard();
    expect(wrapper.text()).toContain('INTEGRATION_APPS.DISCONNECT.BUTTON_TEXT');
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('delete')).toEqual([[{ id: 4 }]]);
  });
});
