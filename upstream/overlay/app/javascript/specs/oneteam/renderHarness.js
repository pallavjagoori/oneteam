/**
 * OneTeam render smoke harness.
 *
 * Mounts a Vue component the way the dashboard would, with the real Vuex
 * store (empty state), Pinia, a memory router, i18n and FloatingVue, while
 * every network call stays unanswered. Child components are stubbed
 * (shallow mount), so each component is exercised by its own smoke test.
 *
 * A smoke test proves a component renders its empty state without throwing.
 * It does not check behaviour: behaviour specs live next to the components.
 */
/* eslint-disable vue/one-component-per-file */
import { describe, it, beforeAll } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';

// The real dashboard store, created once per file; its getters return
// sensible empty values (arrays, objects, flags) for an account with no data.
let storeModule;
export async function loadStore() {
  storeModule ||= await import('dashboard/store');
  const store = storeModule.default;
  // The app syncs the current route into the store (vuex-router-sync), and
  // getters such as getCurrentAccountId read it. Pin it to account 1.
  if (!store.hasModule('route')) {
    store.registerModule('route', {
      namespaced: true,
      state: {
        name: 'smoke',
        path: '/app/accounts/1/dashboard',
        params: { accountId: '1' },
        query: {},
      },
    });
  }
  return store;
}

// API clients use a global axios. Requests never settle, so components stay
// in their loading or empty state and no unhandled rejection leaks out.
const pending = () => new Promise(() => {});
export function stubGlobalAxios() {
  window.axios = {
    get: pending,
    post: pending,
    patch: pending,
    put: pending,
    delete: pending,
    request: pending,
    defaults: { headers: { common: {} } },
  };
}

// jsdom has no microphone or camera. Components that ask for one (the audio
// recorder) wait forever, as if the browser were still showing its prompt.
export function stubMediaDevices() {
  if (navigator.mediaDevices) return;
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: pending,
      enumerateDevices: () => Promise.resolve([]),
      addEventListener: () => {},
      removeEventListener: () => {},
    },
  });
}

// A value that tolerates any property access: a required object prop gets one,
// so templates reading item.id or item.meta.sender render empty, not crash.
export function lenientObject() {
  const target = () => '';
  return new Proxy(target, {
    get(_target, key) {
      if (key === Symbol.toPrimitive) return () => '';
      if (key === Symbol.iterator) return [][Symbol.iterator];
      if (key === 'toString' || key === 'valueOf') return () => '';
      if (key === 'toJSON') return () => ({});
      if (key === 'length') return 0;
      if (key === 'then' || typeof key === 'symbol') return undefined;
      // Vue reads __v_raw, __v_isRef and friends; answering them would make
      // Vue unwrap forever. __v_skip keeps the value out of reactivity.
      if (key === '__v_skip') return true;
      if (key.startsWith('__v')) return undefined;
      return lenientObject();
    },
    apply: () => lenientObject(),
    has: () => false,
    ownKeys: () => [],
  });
}

const firstType = type => (Array.isArray(type) ? type[0] : type);

// A value for one prop: its default when it has one, else one of its type.
export function valueForProp(definition) {
  if (definition && 'default' in definition) {
    const type = firstType(definition.type);
    const { default: fallback } = definition;
    return typeof fallback === 'function' && type !== Function
      ? fallback()
      : fallback;
  }
  const type = firstType(definition?.type);
  if (type === String) return '';
  if (type === Number) return 0;
  if (type === Boolean) return false;
  if (type === Array) return [];
  if (type === Function) return () => {};
  if (type === Date) return new Date(0);
  return lenientObject();
}

// Builds a value for every required prop from its declared type.
export function requiredProps(component) {
  const props = component.props || {};
  if (Array.isArray(props)) return {};
  return Object.fromEntries(
    Object.entries(props)
      .filter(([, definition]) => definition && definition.required)
      .map(([name, definition]) => [name, valueForProp(definition)])
  );
}

// Refs for every prop of a component, as a parent would provide them.
export function propRefs(component) {
  return Object.fromEntries(
    Object.entries(component.props || {}).map(([name, definition]) => [
      name,
      ref(valueForProp(definition)),
    ])
  );
}

export function buildRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/:pathMatch(.*)*',
        name: 'smoke',
        component: { render: () => null },
      },
    ],
  });
  // Pages navigate to named routes this router does not know; record those
  // navigations instead of failing on them.
  router.navigations = [];
  const navigate = target => {
    router.navigations.push(target);
    return Promise.resolve();
  };
  const start = router.push.bind(router);
  router.start = start;
  router.push = navigate;
  router.replace = navigate;
  router.hasRoute = () => true;
  // Links to those routes resolve to an empty location rather than throwing.
  const resolve = router.resolve.bind(router);
  router.resolve = (target, current) => {
    try {
      return resolve(target, current);
    } catch {
      return { ...resolve('/'), name: target?.name, href: '/', meta: {} };
    }
  };
  return router;
}

// A stubbed <SidePanel /> that still answers open() and close().
const sidePanelStub = defineComponent({
  name: 'SidePanel',
  setup(_props, { expose }) {
    expose({ open: () => {}, close: () => {} });
    return () => null;
  },
});

/**
 * Mounts component and returns { wrapper, errors }. Errors thrown while
 * rendering or in lifecycle hooks are collected instead of failing the
 * mount, so the caller decides what counts as a failure.
 */
export async function smokeMount(component, store, { setup, props = {} } = {}) {
  const errors = [];
  const router = buildRouter();
  await router.start('/app/accounts/1/dashboard');
  await router.isReady();
  let wrapper;
  try {
    // The wrapper runs setup (to provide a parent context) and renders the
    // component; everything below the component is stubbed.
    const Parent = defineComponent({
      setup() {
        setup?.();
        return () => h(component, { ...requiredProps(component), ...props });
      },
    });
    wrapper = mount(Parent, {
      shallow: true,
      global: {
        plugins: [store, createPinia(), router],
        config: {
          errorHandler: error => errors.push(error),
          warnHandler: () => {},
        },
        stubs: {
          teleport: true,
          transition: false,
          // Drawers open their side panel on mount through a template ref.
          SidePanel: sidePanelStub,
          // eslint-disable-next-line no-underscore-dangle
          [component.__name || component.name]: false,
        },
        mocks: { $t: key => key, $tm: () => ({}), t: key => key },
      },
      attachTo: document.body,
    });
    await flushPromises();
  } catch (error) {
    errors.push(error);
  }
  wrapper?.unmount();
  return { wrapper, errors };
}

/**
 * Defines one smoke test per component module.
 *
 * modules: an import.meta.glob result (path -> loader).
 * loadStore: returns the Vuex store the components expect.
 * setupFor(path): optional parent context for components that need one.
 * propsFor: { 'path/fragment.vue': props } for components that need
 *   realistic props (a valid enum value, a record with the fields they read).
 * before(): optional setup that runs once before the suite, such as the
 *   window globals an app's server-rendered page would define.
 * needsDedicatedSpec: { 'path/fragment.vue': 'why' } for components that
 *   cannot render without real data; they are listed as todo tests so the
 *   gap stays visible, and should get their own spec.
 */
export function defineSmokeSuite({
  title,
  modules,
  loadStore: getStore,
  setupFor = () => undefined,
  propsFor = {},
  before = () => {},
  needsDedicatedSpec = {},
}) {
  describe(title, () => {
    let store;
    beforeAll(async () => {
      stubGlobalAxios();
      stubMediaDevices();
      before();
      store = await getStore();
    });

    Object.entries(modules).forEach(([path, load]) => {
      const name = path.replace(/^(\.\.\/)+/, '');
      const reason = Object.entries(needsDedicatedSpec).find(([fragment]) =>
        name.endsWith(fragment)
      )?.[1];
      if (reason) {
        it.todo(`renders ${name} (needs a dedicated spec: ${reason})`);
        return;
      }
      // Some pages load large dependency trees on first import.
      it(`renders ${name}`, { timeout: 30000 }, async () => {
        const component = (await load()).default;
        const props = Object.entries(propsFor).find(([fragment]) =>
          name.endsWith(fragment)
        )?.[1];
        const { errors } = await smokeMount(component, store, {
          setup: setupFor(name),
          props: typeof props === 'function' ? props() : props,
        });
        if (errors.length) {
          const where = errors[0].stack
            ?.split('\n')
            .find(
              line =>
                line.includes('/app/javascript/') &&
                !line.includes('specs/oneteam')
            );
          throw new Error(
            `${errors.map(error => error.message).join(' | ')}${where ? ` (${where.trim()})` : ''}`
          );
        }
      });
    });
  });
}
