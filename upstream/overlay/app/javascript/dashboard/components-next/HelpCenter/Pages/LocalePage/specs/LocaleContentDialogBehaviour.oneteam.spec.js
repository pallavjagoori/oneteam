/**
 * OneTeam behaviour spec for the per-locale portal content dialog.
 *
 * Covers opening for a locale (prefilled from saved translations or
 * empty, with the portal's defaults as placeholders), saving trimmed
 * fields, removing a locale's overrides when every field is blank, and
 * the success and failure alerts.
 */
import { flushPromises, mount } from '@vue/test-utils';
import LocaleContentDialog from '../LocaleContentDialog.vue';

const env = vi.hoisted(() => ({ dispatch: null, alert: null, log: [] }));

vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
}));
vi.mock('dashboard/composables', () => ({
  useAlert: (...args) => env.alert(...args),
}));

const Dialog = {
  name: 'Dialog',
  emits: ['confirm'],
  methods: {
    open: () => env.log.push('open'),
    close: () => env.log.push('close'),
  },
  template: '<div class="dialog"><slot /></div>',
};
const Input = {
  name: 'Input',
  props: ['modelValue', 'placeholder'],
  emits: ['update:modelValue'],
  template:
    '<input :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" />',
};

const portal = {
  slug: 'docs',
  name: 'Docs',
  page_title: 'Docs home',
  header_text: 'How can we help?',
  config: {
    locale_translations: {
      fr: { name: 'Aide', page_title: 'Accueil' },
      de: { name: 'Hilfe' },
    },
  },
};
const mountDialog = (props = { portal }) =>
  mount(LocaleContentDialog, { props, global: { stubs: { Dialog, Input } } });
const inputs = wrapper => wrapper.findAll('input');
const confirm = async wrapper => {
  wrapper.findComponent(Dialog).vm.$emit('confirm');
  await flushPromises();
};
const savedTranslations = () =>
  env.dispatch.mock.calls.at(-1)[1].config.locale_translations;

describe('Locale content dialog behaviour', () => {
  beforeEach(() => {
    env.dispatch = vi.fn(() => Promise.resolve());
    env.alert = vi.fn();
    env.log = [];
  });

  it('opens prefilled for a saved locale with portal placeholders', async () => {
    const wrapper = mountDialog();
    wrapper.vm.openForLocale('fr');
    await flushPromises();
    expect(env.log).toEqual(['open']);
    expect(inputs(wrapper).map(i => i.element.value)).toEqual([
      'Aide',
      'Accueil',
      '',
    ]);
    expect(inputs(wrapper).map(i => i.attributes('placeholder'))).toEqual([
      'Docs',
      'Docs home',
      'How can we help?',
    ]);
  });

  it('saves trimmed overrides for a new locale', async () => {
    const wrapper = mountDialog();
    wrapper.vm.openForLocale('es');
    await flushPromises();
    expect(inputs(wrapper).map(i => i.element.value)).toEqual(['', '', '']);
    await inputs(wrapper)[0].setValue('  Ayuda ');
    await inputs(wrapper)[1].setValue(' Inicio');
    await inputs(wrapper)[2].setValue('¿Cómo ayudamos? ');
    await confirm(wrapper);
    expect(env.dispatch.mock.calls[0][0]).toBe('portals/update');
    expect(env.dispatch.mock.calls[0][1].portalSlug).toBe('docs');
    expect(savedTranslations()).toEqual({
      ...portal.config.locale_translations,
      es: {
        name: 'Ayuda',
        page_title: 'Inicio',
        header_text: '¿Cómo ayudamos?',
      },
    });
    expect(env.log).toEqual(['open', 'close']);
    expect(env.alert).toHaveBeenCalledWith(
      'HELP_CENTER.LOCALES_PAGE.CONTENT_DIALOG.API.SUCCESS_MESSAGE'
    );
  });

  it('drops a locale whose fields are all blank', async () => {
    const wrapper = mountDialog();
    wrapper.vm.openForLocale('de');
    await flushPromises();
    await inputs(wrapper)[0].setValue('   ');
    await confirm(wrapper);
    expect(savedTranslations()).toEqual({
      fr: portal.config.locale_translations.fr,
    });
  });

  it('alerts the server error or a fallback', async () => {
    env.dispatch = vi
      .fn()
      .mockRejectedValueOnce(new Error('Slug locked'))
      .mockRejectedValueOnce(null);
    const wrapper = mountDialog({ portal: { name: 'Bare' } });
    wrapper.vm.openForLocale('en');
    await confirm(wrapper);
    await confirm(wrapper);
    expect(env.dispatch.mock.calls[0][1]).toEqual({
      portalSlug: undefined,
      config: { locale_translations: {} },
    });
    expect(env.alert.mock.calls).toEqual([
      ['Slug locked'],
      ['HELP_CENTER.LOCALES_PAGE.CONTENT_DIALOG.API.ERROR_MESSAGE'],
    ]);
    expect(env.log).toEqual(['open']);
  });
});
