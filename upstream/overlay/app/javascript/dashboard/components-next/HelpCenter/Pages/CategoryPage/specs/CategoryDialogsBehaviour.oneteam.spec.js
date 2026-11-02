/**
 * OneTeam behaviour spec for the help center category popover and the
 * edit-category dialog.
 *
 * Popover: header per mode, passing details to the form, creating (with
 * locale and description tracking) or updating (with id) a category,
 * closing on success or cancel, and the error alerts.
 * Dialog: active locale from the route, loading and disabled confirm
 * (updating or invalid form), updating from the form state, closing,
 * tracking, and the error alerts.
 */
import { computed, reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import CategoryDialog from '../CategoryDialog.vue';
import EditCategoryDialog from '../EditCategoryDialog.vue';

const env = vi.hoisted(() => ({
  dispatch: null,
  alert: null,
  track: null,
  flags: {},
  log: [],
}));

vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
  useStoreGetters: () => ({
    'categories/uiFlags': computed(() => id => env.flags[id]),
  }),
}));
vi.mock('dashboard/composables', () => ({
  useAlert: (...args) => env.alert(...args),
  useTrack: (...args) => env.track(...args),
}));
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { portalSlug: 'docs', locale: 'fr' } }),
}));

const CategoryForm = {
  name: 'CategoryForm',
  props: [
    'mode',
    'selectedCategory',
    'activeLocaleCode',
    'activeLocaleName',
    'portalName',
    'showActionButtons',
  ],
  emits: ['submit', 'cancel'],
  setup: () => ({
    state: reactive({
      id: 9,
      name: 'Billing',
      slug: 'billing',
      icon: '💳',
      iconColor: '',
      description: '',
    }),
    isSubmitDisabled: false,
  }),
  template: '<form class="category-form" />',
};
const Dialog = {
  name: 'Dialog',
  props: ['isLoading', 'disableConfirmButton', 'title'],
  emits: ['confirm'],
  methods: { close: () => env.log.push('close') },
  template: '<div class="dialog"><slot /></div>',
};

const formData = {
  id: 9,
  name: 'Billing',
  slug: 'billing',
  icon: '💳',
  iconColor: '#123',
  description: 'Money',
  locale: 'fr',
};

describe('Category dialogs behaviour', () => {
  beforeEach(() => {
    env.dispatch = vi.fn(() => Promise.resolve());
    env.alert = vi.fn();
    env.track = vi.fn();
    env.flags = {};
    env.log = [];
  });

  describe('category popover', () => {
    const mountPopover = props =>
      mount(CategoryDialog, {
        props: {
          portalName: 'Docs',
          activeLocaleName: 'French',
          activeLocaleCode: 'fr',
          ...props,
        },
        global: { stubs: { CategoryForm } },
      });
    const submit = async (wrapper, data = formData) => {
      wrapper.findComponent(CategoryForm).vm.$emit('submit', data);
      await flushPromises();
    };

    it('creates a category in the active locale', async () => {
      const wrapper = mountPopover({ mode: 'create' });
      expect(wrapper.find('h3').text()).toBe(
        'HELP_CENTER.CATEGORY_PAGE.CATEGORY_DIALOG.HEADER.CREATE'
      );
      expect(wrapper.findComponent(CategoryForm).props()).toMatchObject({
        mode: 'create',
        portalName: 'Docs',
        activeLocaleCode: 'fr',
      });
      await submit(wrapper);
      expect(env.dispatch).toHaveBeenCalledWith('categories/create', {
        portalSlug: 'docs',
        categoryObj: {
          name: 'Billing',
          icon: '💳',
          icon_color: '#123',
          slug: 'billing',
          description: 'Money',
          locale: 'fr',
        },
      });
      expect(env.alert).toHaveBeenCalledWith(
        'HELP_CENTER.CATEGORY_PAGE.CATEGORY_DIALOG.CREATE.API.SUCCESS_MESSAGE'
      );
      expect(env.track.mock.calls[0][1]).toEqual({ hasDescription: true });
      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('updates a category and reports failures', async () => {
      const wrapper = mountPopover();
      await submit(wrapper);
      expect(env.dispatch).toHaveBeenCalledWith('categories/update', {
        portalSlug: 'docs',
        categoryId: 9,
        categoryObj: expect.objectContaining({ id: 9, name: 'Billing' }),
      });
      expect(env.track.mock.calls[0][1]).toBeUndefined();

      env.dispatch = vi
        .fn()
        .mockRejectedValueOnce(new Error('Slug taken'))
        .mockRejectedValueOnce({});
      await submit(wrapper);
      await submit(wrapper);
      expect(env.alert.mock.calls.slice(1)).toEqual([
        ['Slug taken'],
        ['HELP_CENTER.CATEGORY_PAGE.CATEGORY_DIALOG.EDIT.API.ERROR_MESSAGE'],
      ]);
      wrapper.findComponent(CategoryForm).vm.$emit('cancel');
      expect(wrapper.emitted('close')).toHaveLength(2);
    });
  });

  describe('edit category dialog', () => {
    const allowedLocales = [
      { code: 'en', name: 'English' },
      { code: 'fr', name: 'French' },
    ];
    const mountDialog = props =>
      mount(EditCategoryDialog, {
        props: { selectedCategory: { id: 9 }, allowedLocales, ...props },
        global: { stubs: { CategoryForm, Dialog } },
      });
    const confirm = async wrapper => {
      wrapper.findComponent(Dialog).vm.$emit('confirm');
      await flushPromises();
    };

    it('passes the active locale and loading state', async () => {
      env.flags = { 9: { isUpdating: true } };
      const wrapper = mountDialog();
      await flushPromises();
      const form = wrapper.findComponent(CategoryForm);
      expect(form.props()).toMatchObject({
        mode: 'edit',
        activeLocaleCode: 'fr',
        activeLocaleName: 'French',
        portalName: 'docs',
        showActionButtons: false,
      });
      expect(wrapper.findComponent(Dialog).props('isLoading')).toBe(true);
      expect(wrapper.findComponent(Dialog).props('disableConfirmButton')).toBe(
        true
      );

      const other = mountDialog({ selectedCategory: {}, allowedLocales: [] });
      await flushPromises();
      expect(other.findComponent(CategoryForm).props('activeLocaleCode')).toBe(
        ''
      );
      expect(other.findComponent(Dialog).props('isLoading')).toBe(false);
      expect(other.findComponent(Dialog).props('disableConfirmButton')).toBe(
        false
      );
    });

    it('updates from the form state and closes', async () => {
      const wrapper = mountDialog();
      await flushPromises();
      await confirm(wrapper);
      expect(env.dispatch).toHaveBeenCalledWith('categories/update', {
        portalSlug: 'docs',
        categoryId: 9,
        categoryObj: {
          id: 9,
          name: 'Billing',
          icon: '💳',
          icon_color: '',
          slug: 'billing',
          description: '',
        },
      });
      expect(env.alert).toHaveBeenCalledWith(
        'HELP_CENTER.CATEGORY_PAGE.CATEGORY_DIALOG.EDIT.API.SUCCESS_MESSAGE'
      );
      expect(env.log).toEqual(['close']);
      expect(env.track.mock.calls[0][1]).toEqual({ hasDescription: false });
      expect(wrapper.vm.dialogRef).toBeTruthy();
    });

    it('alerts when updating fails', async () => {
      env.dispatch = vi
        .fn()
        .mockRejectedValueOnce(new Error('Locked'))
        .mockRejectedValueOnce(null);
      const wrapper = mountDialog();
      await flushPromises();
      await confirm(wrapper);
      await confirm(wrapper);
      expect(env.alert.mock.calls).toEqual([
        ['Locked'],
        ['HELP_CENTER.CATEGORY_PAGE.CATEGORY_DIALOG.EDIT.API.ERROR_MESSAGE'],
      ]);
      expect(env.log).toEqual([]);
    });
  });
});
