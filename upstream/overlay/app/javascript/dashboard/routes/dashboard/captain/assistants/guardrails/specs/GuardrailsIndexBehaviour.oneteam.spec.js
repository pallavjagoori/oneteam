/**
 * OneTeam behaviour spec for the Captain assistant guardrails page, using
 * the shared rule page suite.
 */
import { computed } from 'vue';
import Page from '../Index.vue';
import { defineRulesPageSuite } from '../../specs/rulesPageSuite';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({
    get params() {
      return env.route.value.params;
    },
  }),
}));
vi.mock('dashboard/composables', () => ({
  useAlert: (...args) => env.alert(...args),
}));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
  useFunctionGetter: () => computed(() => env.assistant.value),
}));
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({
    uiSettings: env.uiSettings,
    updateUISettings: (...args) => env.updateUISettings(...args),
  }),
}));

describe('Captain guardrails page behaviour', () => {
  defineRulesPageSuite({
    component: Page,
    env,
    attribute: 'guardrails',
    i18n: 'GUARDRAILS',
    suggestionsSetting: 'show_guardrails_suggestions',
    addAllAwaits: false,
  });
});
