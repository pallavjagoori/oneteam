/**
 * OneTeam behaviour spec for the help center portal switcher popover.
 *
 * Covers listing portals (check mark on the active one, custom domain,
 * logo thumbnail), switching to another portal (reloading portal data,
 * keeping the current route, or falling back to the categories or
 * articles route), ignoring the active portal, opening the create-portal
 * dialog, previewing the live portal and jumping to the portals home.
 */
import { computed } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import PortalSwitcher from '../PortalSwitcher.vue';

const env = vi.hoisted(() => ({
  state: {},
  dispatch: null,
  route: {},
  push: null,
}));

vi.mock('dashboard/composables/store.js', () => ({
  useMapGetter: name => computed(() => env.state[name]),
  useStore: () => ({ dispatch: env.dispatch }),
}));
vi.mock('vue-router', () => ({
  useRoute: () => env.route,
  useRouter: () => ({ push: env.push }),
}));
vi.mock('dashboard/helper/portalHelper', () => ({
  buildPortalURL: slug => `https://help.example.com/hc/${slug}`,
}));

const Button = {
  name: 'NextButton',
  props: ['label', 'icon'],
  emits: ['click'],
  template:
    '<button :data-label="label" :data-icon="icon" @click="$emit(\'click\')"><slot /></button>',
};
const Avatar = {
  name: 'Avatar',
  props: ['name', 'src'],
  template: '<img :alt="name" :src="src" />',
};

const portals = [
  {
    name: 'Docs',
    slug: 'docs',
    meta: { default_locale: 'en' },
    logo: { file_url: 'logo.png' },
  },
  {
    name: 'Help',
    slug: 'help',
    custom_domain: 'help.acme.com',
    meta: { default_locale: 'fr' },
  },
];

const mountSwitcher = () =>
  mount(PortalSwitcher, {
    global: {
      stubs: { NextButton: Button, Button, Avatar },
      mocks: { $t: key => key },
    },
  });
const portalButton = (wrapper, name) => wrapper.find(`[data-label="${name}"]`);

describe('Portal switcher behaviour', () => {
  beforeEach(() => {
    env.state = { 'portals/allPortals': portals };
    env.dispatch = vi.fn(() => Promise.resolve());
    env.push = vi.fn();
    env.route = {
      name: 'portals_settings_index',
      params: { portalSlug: 'docs' },
    };
  });

  it('lists portals with the active check, domain and logo', () => {
    const wrapper = mountSwitcher();
    expect(portalButton(wrapper, 'Docs').attributes('data-icon')).toBe(
      'i-lucide-check'
    );
    expect(portalButton(wrapper, 'Help').attributes('data-icon')).toBe('');
    expect(portalButton(wrapper, 'Help').text()).toContain('help.acme.com');
    expect(portalButton(wrapper, 'Docs').text()).not.toContain('.com');
    expect(wrapper.find('img[alt="Docs"]').attributes('src')).toBe('logo.png');
    expect(wrapper.find('img[alt="Help"]').attributes('src')).toBe('');
  });

  it('hides the list when there are no portals', () => {
    env.state['portals/allPortals'] = [];
    const wrapper = mountSwitcher();
    expect(wrapper.find('[data-label="Docs"]').exists()).toBe(false);
  });

  it('ignores the active portal and switches to another one on the same route', async () => {
    const wrapper = mountSwitcher();
    await portalButton(wrapper, 'Docs').trigger('click');
    expect(env.dispatch).not.toHaveBeenCalled();
    await portalButton(wrapper, 'Help').trigger('click');
    await flushPromises();
    expect(wrapper.emitted('close')).toHaveLength(1);
    const param = { portalSlug: 'help', locale: 'fr' };
    expect(env.dispatch.mock.calls).toEqual([
      ['portals/switchPortal', true],
      ['portals/index'],
      ['portals/show', param],
      ['categories/index', param],
      ['agents/get'],
      ['portals/switchPortal', false],
    ]);
    expect(env.push).toHaveBeenCalledWith({
      name: 'portals_settings_index',
      params: param,
    });
  });

  it('falls back to the categories or articles route', async () => {
    env.route.name = 'portals_categories_articles_edit';
    let wrapper = mountSwitcher();
    await portalButton(wrapper, 'Help').trigger('click');
    await flushPromises();
    expect(env.push.mock.calls[0][0].name).toBe('portals_categories_index');

    env.route.name = undefined;
    wrapper = mountSwitcher();
    await portalButton(wrapper, 'Help').trigger('click');
    await flushPromises();
    expect(env.push.mock.calls[1][0].name).toBe('portals_articles_index');
  });

  it('creates, previews and opens the portals home', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const wrapper = mountSwitcher();
    await wrapper
      .find('[data-label="HELP_CENTER.PORTAL_SWITCHER.NEW_PORTAL"]')
      .trigger('click');
    expect(wrapper.emitted('createPortal')).toHaveLength(1);
    expect(wrapper.emitted('close')).toHaveLength(1);
    await wrapper
      .find('[data-icon="i-lucide-arrow-up-right"]')
      .trigger('click');
    expect(open).toHaveBeenCalledWith(
      'https://help.example.com/hc/docs',
      '_blank'
    );
    await wrapper.find('h2').trigger('click');
    expect(env.push).toHaveBeenCalledWith({
      name: 'portals_index',
      params: { navigationPath: 'portals_articles_index' },
    });
    open.mockRestore();
  });
});
