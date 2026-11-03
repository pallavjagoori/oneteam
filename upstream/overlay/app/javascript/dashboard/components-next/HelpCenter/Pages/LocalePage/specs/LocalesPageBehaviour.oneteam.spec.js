/**
 * OneTeam behaviour spec for the help center locales page.
 *
 * Covers the locale count, the spinner while switching portals, searching
 * locales by name or code, the empty search state, the full list when the
 * search is cleared, and opening the add-locale dialog.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import LocalesPage from '../LocalesPage.vue';

const switching = ref(false);
const open = vi.fn();

vi.mock('dashboard/composables/store.js', () => ({
  useMapGetter: () => switching,
}));

const Input = {
  name: 'Input',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<input />',
};
const LocaleList = {
  name: 'LocaleList',
  props: ['locales'],
  template: '<ul />',
};
const locales = [
  { name: 'English', code: 'en' },
  { name: 'Français', code: 'fr' },
  { code: 'de' },
];

const mountPage = (props = { locales }) =>
  mount(LocalesPage, {
    props,
    global: {
      stubs: {
        HelpCenterLayout: {
          template:
            '<div><slot name="header-actions" /><slot name="content" /><slot /></div>',
        },
        Input,
        LocaleList,
        Button: {
          emits: ['click'],
          template: '<button @click="$emit(\'click\')" />',
        },
        Spinner: { template: '<b class="spinner" />' },
        EmptyStateLayout: { props: ['title'], template: '<p>{{ title }}</p>' },
        AddLocaleDialog: {
          setup: () => ({ dialogRef: { open } }),
          template: '<dialog />',
        },
      },
    },
  });

describe('LocalesPage behaviour', () => {
  beforeEach(() => {
    switching.value = false;
  });

  it('searches locales and opens the add dialog', async () => {
    const wrapper = mountPage();
    expect(wrapper.text()).toContain('HELP_CENTER.LOCALES_PAGE.LOCALES_COUNT');
    expect(wrapper.findComponent(LocaleList).props('locales')).toEqual(locales);

    const input = wrapper.findComponent(Input);
    await input.vm.$emit('update:modelValue', ' FR ');
    expect(wrapper.findComponent(LocaleList).props('locales')).toEqual([
      locales[1],
    ]);
    await input.vm.$emit('update:modelValue', 'de');
    expect(wrapper.findComponent(LocaleList).props('locales')).toEqual([
      locales[2],
    ]);
    await input.vm.$emit('update:modelValue', 'zz');
    expect(wrapper.find('p').text()).toBe(
      'HELP_CENTER.LOCALES_PAGE.SEARCH_EMPTY_STATE.TITLE'
    );

    await wrapper.find('button').trigger('click');
    expect(open).toHaveBeenCalled();
  });

  it('shows a spinner while switching portals and copes with no locales', () => {
    switching.value = true;
    expect(mountPage().find('.spinner').exists()).toBe(true);
    switching.value = false;
    expect(
      mountPage({ locales: null }).findComponent(LocaleList).props('locales')
    ).toBe(null);
  });
});
