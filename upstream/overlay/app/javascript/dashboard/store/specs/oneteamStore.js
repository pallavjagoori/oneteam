import { createStore } from 'vuex';

// Shared helpers for OneTeam's Vuex module specs.

/**
 * Builds a real Vuex store around one or more modules, so specs exercise
 * actions, mutations and getters together. Object state is cloned, so tests
 * never share records.
 */
export const buildStore = modules =>
  createStore({
    modules: Object.fromEntries(
      Object.entries(modules).map(([name, module]) => [
        name,
        {
          ...module,
          state:
            typeof module.state === 'function'
              ? module.state
              : () => structuredClone(module.state),
        },
      ])
    ),
  });

/** An API error carrying a server message, as axios reports it. */
export const apiError = (message = 'Request failed') => ({
  response: { data: { message } },
});
