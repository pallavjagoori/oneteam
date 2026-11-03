/**
 * OneTeam behaviour spec for the onboarding Facebook page form.
 *
 * Covers preloading the SDK, the loading state, logging in (cancelled,
 * failed, no pages, only connected pages), choosing a page and creating
 * the inbox, create errors, and going back.
 */
import { ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import InboxFacebookForm from '../InboxFacebookForm.vue';

const env = vi.hoisted(() => ({
  authenticating: null,
  preload: vi.fn(),
  login: vi.fn(),
  dispatch: vi.fn(),
  alerts: [],
}));

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
}));
vi.mock('dashboard/composables', () => ({
  useAlert: message => env.alerts.push(message),
}));
vi.mock('dashboard/store/utils/api', () => ({
  parseAPIErrorResponse: error => error.apiMessage,
}));
vi.mock('dashboard/composables/useFacebookPageConnect', () => ({
  useFacebookPageConnect: () => ({
    isAuthenticating: env.authenticating,
    preloadSdk: env.preload,
    loginAndFetchPages: () => env.login(),
  }),
}));

const ComboBox = {
  name: 'ComboBox',
  props: ['modelValue', 'options'],
  emits: ['update:modelValue'],
  template: '<select />',
};
const NextButton = {
  name: 'NextButton',
  props: { label: String, disabled: Boolean, isLoading: Boolean },
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};

/**
 * Finds a button by its label key suffix.
 *
 * @param {import('@vue/test-utils').VueWrapper} wrapper Mounted form.
 * @param {string} suffix Label key suffix.
 * @returns {import('@vue/test-utils').DOMWrapper<Element>} The button.
 */
const button = (wrapper, suffix) =>
  wrapper.findAll('button').find(b => b.text().endsWith(suffix));

/**
 * Mounts the form.
 *
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountForm = () =>
  mount(InboxFacebookForm, {
    global: { stubs: { ComboBox, NextButton, Spinner: true } },
  });

const pages = [
  { id: 'p1', name: 'Shop', access_token: 'pt1' },
  { id: 'p2', name: 'Old', access_token: 'pt2', exists: true },
];

describe('InboxFacebookForm behaviour', () => {
  beforeEach(() => {
    env.authenticating = ref(false);
    env.preload = vi.fn();
    env.login = vi.fn();
    env.dispatch = vi.fn().mockResolvedValue();
    env.alerts = [];
  });

  it('preloads, shows loading, and goes back from the prompt', async () => {
    const wrapper = mountForm();
    expect(env.preload).toHaveBeenCalled();
    await button(wrapper, 'BACK').trigger('click');
    expect(wrapper.emitted('back')).toHaveLength(1);
    env.authenticating.value = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('FACEBOOK_LOADING');
  });

  it('has no page options or inbox to create before logging in', async () => {
    const wrapper = mountForm();
    const state = wrapper.vm.$.setupState;
    expect(state.pageOptions).toEqual([]);
    await state.createInbox();
    expect(env.dispatch).not.toHaveBeenCalled();
  });

  it('stays on the prompt when cancelled and shows a failure', async () => {
    const wrapper = mountForm();
    env.login.mockResolvedValueOnce(null);
    await button(wrapper, 'FACEBOOK_LAUNCH').trigger('click');
    await flushPromises();
    expect(button(wrapper, 'FACEBOOK_LAUNCH')).toBeDefined();
    env.login.mockRejectedValueOnce(new Error('popup blocked'));
    await button(wrapper, 'FACEBOOK_LAUNCH').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('FACEBOOK_ERROR');
  });

  it('explains when every page is already connected', async () => {
    const wrapper = mountForm();
    env.login.mockResolvedValueOnce({
      userAccessToken: 'u',
      pages: [pages[1]],
    });
    await button(wrapper, 'FACEBOOK_LAUNCH').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('FACEBOOK_NO_PAGES');
    await button(wrapper, 'BACK').trigger('click');
    expect(wrapper.emitted('back')).toHaveLength(1);
  });

  it('creates an inbox for the chosen page', async () => {
    const wrapper = mountForm();
    env.login.mockResolvedValueOnce({ userAccessToken: 'u', pages });
    await button(wrapper, 'FACEBOOK_LAUNCH').trigger('click');
    await flushPromises();
    const combo = wrapper.getComponent(ComboBox);
    expect(combo.props('options')).toEqual([{ value: 'p1', label: 'Shop' }]);
    const connect = () =>
      wrapper
        .findAllComponents(NextButton)
        .find(b => b.props('label').endsWith('.CONNECT'));
    expect(connect().props('disabled')).toBe(true);
    await connect().trigger('click');
    expect(env.dispatch).not.toHaveBeenCalled();
    combo.vm.$emit('update:modelValue', 'p1');
    await wrapper.vm.$nextTick();
    let finish;
    env.dispatch = vi.fn(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    await connect().trigger('click');
    expect(connect().props('isLoading')).toBe(true);
    await connect().trigger('click');
    finish();
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledTimes(1);
    expect(env.dispatch).toHaveBeenCalledWith('inboxes/createFBChannel', {
      user_access_token: 'u',
      page_access_token: 'pt1',
      page_id: 'p1',
      inbox_name: 'Shop',
    });
    expect(env.alerts).toEqual(['ONBOARDING_INBOX_SETUP.FACEBOOK_CONNECTED']);
    expect(wrapper.emitted('created')).toHaveLength(1);
    await button(wrapper, 'BACK').trigger('click');
    expect(wrapper.emitted('back')).toHaveLength(1);
  });

  it('alerts create errors', async () => {
    const wrapper = mountForm();
    env.login.mockResolvedValueOnce({ userAccessToken: 'u', pages });
    await button(wrapper, 'FACEBOOK_LAUNCH').trigger('click');
    await flushPromises();
    wrapper.getComponent(ComboBox).vm.$emit('update:modelValue', 'p1');
    await wrapper.vm.$nextTick();
    env.dispatch = vi.fn().mockRejectedValueOnce({ apiMessage: 'Denied' });
    await button(wrapper, '.CONNECT').trigger('click');
    await flushPromises();
    env.dispatch = vi.fn().mockRejectedValueOnce({});
    await button(wrapper, '.CONNECT').trigger('click');
    await flushPromises();
    expect(env.alerts).toEqual(['Denied', 'ONBOARDING_INBOX_SETUP.ERROR']);
    expect(wrapper.emitted('created')).toBeUndefined();
  });
});
