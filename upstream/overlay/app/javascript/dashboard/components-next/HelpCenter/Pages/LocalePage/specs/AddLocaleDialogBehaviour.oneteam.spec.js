/**
 * OneTeam behaviour spec for the help center "add locale" dialog.
 *
 * Covers offering only locales the portal lacks, the live/draft status
 * (and resetting a cleared status to live), ignoring confirm without a
 * locale, adding a live or draft locale (tracking, closing, resetting),
 * portals without config, error alerts with the API or fallback text,
 * and resetting the form when the dialog closes.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert, useTrack } from 'dashboard/composables';
import { PORTALS_EVENTS } from 'dashboard/helper/AnalyticsHelper/events';
import AddLocaleDialog from '../AddLocaleDialog.vue';

const env = vi.hoisted(() => ({ log: [] }));

vi.mock('dashboard/composables', () => ({
  useAlert: vi.fn(),
  useTrack: vi.fn(),
}));
vi.mock('dashboard/composables/store', () => ({ useStore: () => env.store }));
vi.mock('vue-router', () => ({
  useRoute: () => ({ name: 'portals_locales' }),
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const Dialog = {
  name: 'Dialog',
  emits: ['close', 'confirm'],
  methods: {
    close() {
      env.log.push('close');
    },
  },
  template: '<div class="dialog"><slot /></div>',
};
const ComboBox = {
  name: 'ComboBox',
  props: ['modelValue', 'options'],
  emits: ['update:modelValue'],
  template: '<div class="combo" />',
};

const portal = {
  slug: 'help',
  meta: { default_locale: 'en' },
  config: {
    allowed_locales: [{ code: 'en' }, { code: 'fr', draft: true }],
  },
};

const mountDialog = async (props = { portal }) => {
  env.log = [];
  env.store = { dispatch: vi.fn().mockResolvedValue() };
  const wrapper = mount(AddLocaleDialog, {
    props,
    global: { stubs: { Dialog, ComboBox } },
  });
  await flushPromises();
  return wrapper;
};
const combos = wrapper => wrapper.findAllComponents(ComboBox);
const pick = async (wrapper, locale, status) => {
  combos(wrapper)[0].vm.$emit('update:modelValue', locale);
  if (status !== undefined)
    combos(wrapper)[1].vm.$emit('update:modelValue', status);
  await flushPromises();
};
const confirm = async wrapper => {
  wrapper.findComponent(Dialog).vm.$emit('confirm');
  await flushPromises();
};

describe('AddLocaleDialog behaviour', () => {
  it('offers only locales the portal does not have', async () => {
    const wrapper = await mountDialog();
    const values = combos(wrapper)[0]
      .props('options')
      .map(o => o.value);
    expect(values).not.toContain('en');
    expect(values).not.toContain('fr');
    expect(
      combos(wrapper)[0]
        .props('options')
        .find(o => o.value === 'de')
    ).toEqual({ value: 'de', label: 'German (de)' });
    expect(
      combos(wrapper)[1]
        .props('options')
        .map(o => o.value)
    ).toEqual(['published', 'draft']);
    expect(wrapper.vm.dialogRef).toBeTruthy();
  });

  it('resets a cleared status to live', async () => {
    const wrapper = await mountDialog();
    await pick(wrapper, 'de', '');
    expect(combos(wrapper)[1].props('modelValue')).toBe('published');
  });

  it('ignores confirm without a locale', async () => {
    const wrapper = await mountDialog();
    await confirm(wrapper);
    expect(env.store.dispatch).not.toHaveBeenCalled();
  });

  it('adds a live locale, keeping existing drafts', async () => {
    const wrapper = await mountDialog();
    await pick(wrapper, 'de');
    await confirm(wrapper);
    expect(env.store.dispatch).toHaveBeenCalledWith('portals/update', {
      portalSlug: 'help',
      config: {
        allowed_locales: ['en', 'fr', 'de'],
        draft_locales: ['fr'],
        default_locale: 'en',
      },
    });
    expect(useTrack).toHaveBeenCalledWith(PORTALS_EVENTS.CREATE_LOCALE, {
      localeAdded: 'de',
      totalLocales: 3,
      from: 'portals_locales',
    });
    expect(env.log).toEqual(['close']);
    expect(useAlert).toHaveBeenCalledWith(
      'HELP_CENTER.LOCALES_PAGE.ADD_LOCALE_DIALOG.API.SUCCESS_MESSAGE'
    );
    expect(combos(wrapper)[0].props('modelValue')).toBe('');
  });

  it('adds a draft locale to a portal without config', async () => {
    const wrapper = await mountDialog({ portal: null });
    await pick(wrapper, 'de', 'draft');
    await confirm(wrapper);
    expect(env.store.dispatch).toHaveBeenCalledWith('portals/update', {
      portalSlug: undefined,
      config: {
        allowed_locales: ['de'],
        draft_locales: ['de'],
        default_locale: undefined,
      },
    });
  });

  it('alerts with the error message or a fallback', async () => {
    const wrapper = await mountDialog();
    env.store.dispatch.mockRejectedValueOnce(new Error('Locale taken'));
    await pick(wrapper, 'de');
    await confirm(wrapper);
    expect(useAlert).toHaveBeenCalledWith('Locale taken');
    expect(env.log).toEqual([]);
    env.store.dispatch.mockRejectedValueOnce({});
    await confirm(wrapper);
    expect(useAlert).toHaveBeenCalledWith(
      'HELP_CENTER.LOCALES_PAGE.ADD_LOCALE_DIALOG.API.ERROR_MESSAGE'
    );
  });

  it('resets the form when the dialog closes', async () => {
    const wrapper = await mountDialog();
    await pick(wrapper, 'de', 'draft');
    wrapper.findComponent(Dialog).vm.$emit('close');
    await flushPromises();
    expect(combos(wrapper).map(c => c.props('modelValue'))).toEqual([
      '',
      'published',
    ]);
  });
});
