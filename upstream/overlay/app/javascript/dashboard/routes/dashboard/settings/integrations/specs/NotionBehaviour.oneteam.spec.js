/**
 * OneTeam behaviour spec for the Notion integration settings page.
 *
 * Covers loading the integration, showing the disconnect action only when
 * it is enabled, the creating spinner, and redirecting to Notion to
 * connect.
 */
import { ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import Notion from '../Notion.vue';

const env = vi.hoisted(() => ({
  dispatch: vi.fn(),
  integration: null,
  flags: null,
  authorize: vi.fn(),
}));

vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
  useFunctionGetter: () => env.integration,
  useMapGetter: () => env.flags,
}));
vi.mock('dashboard/api/notion_auth.js', () => ({
  default: { generateAuthorization: () => env.authorize() },
}));

const Layout = {
  name: 'SettingsLayout',
  props: ['isLoading'],
  template: '<div><slot name="header" /><slot name="body" /></div>',
};
const Integration = {
  name: 'Integration',
  props: ['integrationAction', 'integrationEnabled'],
  template: '<div><slot name="action" /></div>',
};

const mountPage = () =>
  mount(Notion, {
    global: {
      stubs: {
        SettingsLayout: Layout,
        Integration,
        BaseSettingsHeader: true,
        ButtonNext: {
          emits: ['click'],
          template: '<button @click="$emit(\'click\')" />',
        },
      },
    },
  });

describe('Notion integration behaviour', () => {
  let realLocation;
  beforeAll(() => {
    realLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '' },
    });
  });
  afterAll(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: realLocation,
    });
  });
  beforeEach(() => {
    env.dispatch = vi.fn().mockResolvedValue();
    env.flags = ref({ isCreatingNotion: false });
    env.integration = ref({ id: 'notion', enabled: false });
  });

  it('loads the integration and connects to Notion', async () => {
    const wrapper = mountPage();
    expect(wrapper.findComponent(Layout).props('isLoading')).toBe(true);
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('integrations/get', 'notion');
    expect(wrapper.findComponent(Layout).props('isLoading')).toBe(false);
    expect(wrapper.findComponent(Integration).props('integrationAction')).toBe(
      ''
    );

    env.authorize = vi.fn().mockResolvedValue({ data: { url: 'https://n' } });
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(window.location.href).toBe('https://n');
  });

  it('offers disconnect when enabled and spins while creating', async () => {
    env.integration = ref({ id: 'notion', enabled: true });
    env.flags = ref({ isCreatingNotion: true });
    const wrapper = mountPage();
    await flushPromises();
    expect(wrapper.findComponent(Integration).props('integrationAction')).toBe(
      'disconnect'
    );
    expect(wrapper.findComponent(Layout).props('isLoading')).toBe(true);
  });
});
