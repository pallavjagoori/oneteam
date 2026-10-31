/**
 * OneTeam behaviour spec for the bulk article translation dialog.
 *
 * Covers target locale options (excluding the current locale), loading
 * target categories per locale (success, failure, clearing), starting a
 * translation (with and without a category), the duplicate-article
 * warning with edit links and the overwrite retry, other errors,
 * ignoring confirms without a locale, and resetting on close.
 */
import { reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import categoriesAPI from 'dashboard/api/helpCenter/categories.js';
import { useAlert } from 'dashboard/composables';
import BulkTranslateDialog from '../BulkTranslateDialog.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
  useRouter: () => env.router,
}));
vi.mock('dashboard/composables/store', () => ({ useStore: () => env.store }));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/api/helpCenter/categories.js', () => ({
  default: { get: vi.fn() },
}));

const Dialog = {
  name: 'Dialog',
  props: ['title', 'confirmButtonLabel', 'disableConfirmButton', 'isLoading'],
  emits: ['close', 'confirm'],
  methods: { close: () => env.dialogClose() },
  template: '<div><slot /></div>',
};
const ComboBox = {
  name: 'ComboBox',
  props: ['modelValue', 'options', 'disabled'],
  emits: ['update:modelValue'],
  template: '<select />',
};

const locales = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
];

const mountDialog = () => {
  env.route = reactive({
    params: {
      portalSlug: 'help',
      locale: 'en',
      categorySlug: 'faq',
      tab: 'all',
    },
  });
  env.router = {
    resolve: ({ params }) => ({
      href: `/edit/${params.locale}/${params.articleSlug}`,
    }),
  };
  env.store = { dispatch: vi.fn() };
  env.dialogClose = vi.fn();
  return mount(BulkTranslateDialog, {
    props: { selectedArticleIds: [1, 2], allowedLocales: locales },
    global: { stubs: { Dialog, ComboBox, Icon: true } },
  });
};

const combos = wrapper => wrapper.findAllComponents(ComboBox);
const pickLocale = async (wrapper, code) => {
  await combos(wrapper)[0].vm.$emit('update:modelValue', code);
  await flushPromises();
};
const confirm = async wrapper => {
  await wrapper.findComponent(Dialog).vm.$emit('confirm');
  await flushPromises();
};

describe('BulkTranslateDialog behaviour', () => {
  beforeEach(() => {
    categoriesAPI.get.mockResolvedValue({
      data: { payload: [{ id: 4, name: 'Guides' }] },
    });
  });

  it('offers other locales and loads their categories', async () => {
    const wrapper = mountDialog();
    expect(combos(wrapper)[0].props('options')).toEqual([
      { value: 'fr', label: 'French (fr)' },
      { value: 'de', label: 'German (de)' },
    ]);
    expect(combos(wrapper)[1].props('disabled')).toBe(true);
    expect(wrapper.findComponent(Dialog).props('disableConfirmButton')).toBe(
      true
    );
    await pickLocale(wrapper, 'fr');
    expect(categoriesAPI.get).toHaveBeenCalledWith({
      portalSlug: 'help',
      locale: 'fr',
    });
    expect(combos(wrapper)[1].props()).toMatchObject({
      disabled: false,
      options: [{ value: 4, label: 'Guides' }],
    });

    categoriesAPI.get.mockRejectedValueOnce(new Error('down'));
    await pickLocale(wrapper, 'de');
    expect(combos(wrapper)[1].props('options')).toEqual([]);
    await categoriesAPI.get.mockClear();
    await pickLocale(wrapper, '');
    expect(categoriesAPI.get).not.toHaveBeenCalled();
  });

  it('starts a translation and resets', async () => {
    const wrapper = mountDialog();
    await confirm(wrapper);
    expect(env.store.dispatch).not.toHaveBeenCalled();
    await pickLocale(wrapper, 'fr');
    await combos(wrapper)[1].vm.$emit('update:modelValue', 4);
    await confirm(wrapper);
    expect(env.store.dispatch).toHaveBeenCalledWith('articles/bulkTranslate', {
      portalSlug: 'help',
      articleIds: [1, 2],
      locale: 'fr',
      categoryId: 4,
      force: false,
    });
    expect(useAlert).toHaveBeenCalledWith(
      expect.stringContaining('BULK_TRANSLATE.API.SUCCESS_MESSAGE')
    );
    expect(env.dialogClose).toHaveBeenCalled();
    expect(wrapper.emitted('translateStarted')).toHaveLength(1);
    expect(combos(wrapper)[0].props('modelValue')).toBe('');
  });

  it('warns about duplicates and overwrites on the second confirm', async () => {
    const wrapper = mountDialog();
    await pickLocale(wrapper, 'fr');
    env.store.dispatch.mockRejectedValueOnce({
      response: {
        status: 409,
        data: { duplicate_articles: [{ id: 9, title: 'Existing' }] },
      },
    });
    await confirm(wrapper);
    const link = wrapper.find('a');
    expect(link.text()).toContain('Existing');
    expect(link.attributes('href')).toBe('/edit/fr/9');
    expect(wrapper.findComponent(Dialog).props('confirmButtonLabel')).toContain(
      'CONFIRM_OVERWRITE'
    );
    await confirm(wrapper);
    expect(env.store.dispatch.mock.calls.at(-1)[1].force).toBe(true);

    await pickLocale(wrapper, 'de');
    expect(wrapper.find('a').exists()).toBe(false);
  });

  it('reports other errors and resets on close', async () => {
    const wrapper = mountDialog();
    await pickLocale(wrapper, 'fr');
    env.store.dispatch.mockRejectedValueOnce(new Error('Quota exceeded'));
    await confirm(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith('Quota exceeded');
    env.store.dispatch.mockRejectedValueOnce({});
    await confirm(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith(
      expect.stringContaining('BULK_TRANSLATE.API.ERROR_MESSAGE')
    );
    expect(wrapper.findComponent(Dialog).props('isLoading')).toBe(false);

    await wrapper.findComponent(Dialog).vm.$emit('close');
    expect(combos(wrapper)[0].props('modelValue')).toBe('');
    expect(wrapper.vm.dialogRef).toBeTruthy();
  });

  it('uses default props', () => {
    const wrapper = mount(BulkTranslateDialog, {
      global: { stubs: { Dialog, ComboBox, Icon: true } },
    });
    expect(combos(wrapper)[0].props('options')).toEqual([]);
  });
});
