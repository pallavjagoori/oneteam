/**
 * OneTeam behaviour spec for the help center locale list.
 *
 * The store, UI settings, route and dialogs are faked. Covers card
 * props, changing the default locale, drafting and publishing locales,
 * deleting a locale (and moving the last active locale back to the
 * default), opening the content dialogs, and success or error alerts.
 */
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { useAlert, useTrack } from 'dashboard/composables';
import LocaleList from '../LocaleList.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ name: 'portals_locales_index' }),
}));
vi.mock('dashboard/composables/store', () => ({ useStore: () => env.store }));
vi.mock('dashboard/composables', () => ({
  useAlert: vi.fn(),
  useTrack: vi.fn(),
}));
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({
    uiSettings: env.uiSettings,
    updateUISettings: env.updateUISettings,
  }),
}));

const Card = {
  name: 'LocaleCard',
  props: [
    'locale',
    'isDefault',
    'isDraft',
    'localeCode',
    'articleCount',
    'categoryCount',
  ],
  emits: ['action'],
  template: '<li />',
};
const dialog = name => ({
  name,
  props: ['portal'],
  methods: { openForLocale: code => env[name](code) },
  template: '<div />',
});

const locales = [
  { name: 'English', code: 'en', articlesCount: 3, categoriesCount: 1 },
  { name: 'French', code: 'fr', isDraft: true },
  { name: 'German', code: 'de' },
];

const mountList = () =>
  mount(LocaleList, {
    props: {
      locales,
      portal: { slug: 'docs', meta: { default_locale: 'en' } },
    },
    global: {
      stubs: {
        LocaleCard: Card,
        LocaleContentDialog: dialog('LocaleContentDialog'),
        PopularContentDialog: dialog('PopularContentDialog'),
      },
    },
  });

const act = async (wrapper, index, action) => {
  wrapper.findAllComponents(Card)[index].vm.$emit('action', { action });
  await flushPromises();
};
const lastConfig = () => env.store.dispatch.mock.calls.at(-1)[1].config;

describe('LocaleList behaviour', () => {
  beforeEach(() => {
    env.store = { dispatch: vi.fn().mockResolvedValue() };
    env.uiSettings = ref({ last_active_locale_code: 'de' });
    env.updateUISettings = vi.fn();
    env.LocaleContentDialog = vi.fn();
    env.PopularContentDialog = vi.fn();
  });

  it('renders a card per locale', () => {
    const cards = mountList().findAllComponents(Card);
    expect(
      cards.map(c => [
        c.props('isDefault'),
        c.props('isDraft'),
        c.props('articleCount'),
        c.props('categoryCount'),
      ])
    ).toEqual([
      [true, undefined, 3, 1],
      [false, true, 0, 0],
      [false, undefined, 0, 0],
    ]);
  });

  it('changes the default locale', async () => {
    const wrapper = mountList();
    await act(wrapper, 2, 'change-default');
    expect(env.store.dispatch).toHaveBeenCalledWith('portals/update', {
      portalSlug: 'docs',
      config: {
        default_locale: 'de',
        allowed_locales: ['en', 'fr', 'de'],
        draft_locales: ['fr'],
      },
    });
    expect(useAlert).toHaveBeenCalledWith(
      'HELP_CENTER.PORTAL.CHANGE_DEFAULT_LOCALE.API.SUCCESS_MESSAGE'
    );
    expect(useTrack).toHaveBeenCalledWith(expect.any(String), {
      newLocale: 'de',
      from: 'portals_locales_index',
    });
  });

  it('drafts and publishes locales', async () => {
    const wrapper = mountList();
    await act(wrapper, 2, 'move-to-draft');
    expect(lastConfig().draft_locales).toEqual(['fr', 'de']);
    await act(wrapper, 1, 'move-to-draft');
    expect(lastConfig().draft_locales).toEqual(['fr']);
    await act(wrapper, 1, 'publish-locale');
    expect(lastConfig().draft_locales).toEqual([]);
    expect(useAlert).toHaveBeenLastCalledWith(
      'HELP_CENTER.PORTAL.PUBLISH_LOCALE.API.SUCCESS_MESSAGE'
    );
  });

  it('deletes locales and resets the last active one', async () => {
    const wrapper = mountList();
    await act(wrapper, 1, 'delete');
    expect(lastConfig()).toEqual({
      default_locale: 'en',
      allowed_locales: ['en', 'de'],
      draft_locales: [],
    });
    expect(env.updateUISettings).not.toHaveBeenCalled();
    await act(wrapper, 2, 'delete');
    expect(env.updateUISettings).toHaveBeenCalledWith({
      last_active_locale_code: 'en',
    });
    expect(useTrack).toHaveBeenLastCalledWith(expect.any(String), {
      deletedLocale: 'de',
      from: 'portals_locales_index',
    });

    env.uiSettings.value = null;
    await act(wrapper, 2, 'delete');
    expect(env.updateUISettings).toHaveBeenCalledTimes(1);
  });

  it('reports errors with the server message or a fallback', async () => {
    const wrapper = mountList();
    env.store.dispatch.mockRejectedValueOnce(new Error('Locale in use'));
    await act(wrapper, 2, 'delete');
    expect(useAlert).toHaveBeenLastCalledWith('Locale in use');
    env.store.dispatch.mockRejectedValueOnce({});
    await act(wrapper, 2, 'publish-locale');
    expect(useAlert).toHaveBeenLastCalledWith(
      'HELP_CENTER.PORTAL.PUBLISH_LOCALE.API.ERROR_MESSAGE'
    );
  });

  it('opens the content dialogs and ignores unknown actions', async () => {
    const wrapper = mountList();
    await act(wrapper, 1, 'customize-content');
    await act(wrapper, 2, 'select-popular-content');
    await act(wrapper, 0, 'unknown');
    expect(env.LocaleContentDialog).toHaveBeenCalledWith('fr');
    expect(env.PopularContentDialog).toHaveBeenCalledWith('de');
    expect(env.store.dispatch).not.toHaveBeenCalled();
  });
});
