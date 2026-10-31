/**
 * OneTeam behaviour spec for the "connect a Facebook page" inbox step.
 *
 * The Facebook connect composable, account, router and Sentry are faked.
 * Covers the Meta restriction banner, preloading the SDK, login results
 * (cancelled, SDK failure, other errors), picking a page and name with
 * validation, creating the channel and routing on, and API errors.
 */
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import * as Sentry from '@sentry/vue';
import { useAlert } from 'dashboard/composables';
import router from 'dashboard/routes/index';
import Facebook from '../Facebook.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/routes/index', () => ({ default: { replace: vi.fn() } }));
vi.mock('@sentry/vue', () => ({ captureException: vi.fn() }));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({ isMetaInboxCreationDisabled: env.disabled }),
}));
vi.mock('dashboard/composables/useFacebookPageConnect', () => ({
  useFacebookPageConnect: () => env.facebook,
}));
vi.mock('shared/composables/useBranding', () => ({
  useBranding: () => ({ replaceInstallationName: text => text }),
}));

const ComboBox = {
  name: 'ComboBox',
  props: ['modelValue', 'options', 'hasError'],
  emits: ['update:modelValue'],
  template: '<div class="combo" />',
};

let dispatch;

const pages = [
  { id: 'p1', name: ' Acme Page ', access_token: 'tok1' },
  { id: 'p2', name: 'Old Page', exists: true },
];

const mountPage = () =>
  mount(Facebook, {
    global: {
      mocks: { $store: { dispatch } },
      stubs: {
        ComboBox,
        LoadingState: {
          props: ['message'],
          template: '<div class="loading">{{ message }}</div>',
        },
        PageHeader: true,
        Banner: { template: '<div class="banner"><slot /></div>' },
        Icon: true,
        NextButton: { template: '<button type="submit" />' },
      },
      directives: { dompurifyHtml: {} },
    },
  });

const login = async wrapper => {
  await wrapper.find('button').trigger('click');
  await flushPromises();
};

describe('Facebook channel behaviour', () => {
  beforeEach(() => {
    env.disabled = ref(false);
    env.facebook = {
      preloadSdk: vi.fn(),
      loginAndFetchPages: vi
        .fn()
        .mockResolvedValue({ pages, userAccessToken: 'user-tok' }),
    };
    dispatch = vi.fn().mockResolvedValue({ id: 12 });
  });

  it('blocks connecting when Meta inbox creation is restricted', async () => {
    env.disabled.value = true;
    const wrapper = mountPage();
    expect(env.facebook.preloadSdk).not.toHaveBeenCalled();
    expect(wrapper.find('.banner').exists()).toBe(true);
    wrapper.vm.startLogin();
    await flushPromises();
    expect(env.facebook.loginAndFetchPages).not.toHaveBeenCalled();
  });

  it('shows an auth error when login is cancelled', async () => {
    env.facebook.loginAndFetchPages.mockResolvedValueOnce(null);
    const wrapper = mountPage();
    expect(env.facebook.preloadSdk).toHaveBeenCalled();
    expect(wrapper.find('.banner').exists()).toBe(false);
    await login(wrapper);
    expect(wrapper.find('h5').text()).toBe('INBOX_MGMT.DETAILS.ERROR_FB_AUTH');
  });

  it('alerts when the SDK fails to load or login errors', async () => {
    let wrapper = mountPage();
    env.facebook.loginAndFetchPages.mockRejectedValueOnce(
      Object.assign(new Error('x'), { name: 'ScriptLoaderError' })
    );
    await login(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith(
      'INBOX_MGMT.DETAILS.ERROR_FB_LOADING'
    );
    expect(wrapper.find('.loading').text()).toBe(
      'INBOX_MGMT.DETAILS.LOADING_FB'
    );

    wrapper = mountPage();
    const boom = new Error('boom');
    env.facebook.loginAndFetchPages.mockRejectedValueOnce(boom);
    await login(wrapper);
    expect(Sentry.captureException).toHaveBeenCalledWith(boom);
    expect(useAlert).toHaveBeenLastCalledWith(
      'INBOX_MGMT.DETAILS.ERROR_FB_AUTH'
    );
  });

  it('validates the page and name before creating', async () => {
    const wrapper = mountPage();
    await login(wrapper);
    const combo = wrapper.findComponent(ComboBox);
    expect(combo.props('options')).toEqual([
      { value: 'p1', label: ' Acme Page ' },
    ]);
    await wrapper.find('form').trigger('submit');
    expect(wrapper.text()).toContain('INBOX_MGMT.ADD.FB.CHOOSE_PLACEHOLDER');
    expect(wrapper.text()).toContain('INBOX_MGMT.ADD.FB.ADD_NAME');
    expect(combo.props('hasError')).toBe(true);
    expect(dispatch).not.toHaveBeenCalled();

    await combo.vm.$emit('update:modelValue', 'p1');
    expect(wrapper.find('input').element.value).toBe(' Acme Page ');
    await combo.vm.$emit('update:modelValue', 'missing');
    expect(wrapper.find('input').element.value).toBe('');
    expect(wrapper.text()).toContain('INBOX_MGMT.ADD.FB.CHOOSE_PLACEHOLDER');
    await wrapper.find('input').setValue('x');
    await wrapper.find('input').setValue('');
    expect(wrapper.text()).toContain('INBOX_MGMT.ADD.FB.ADD_NAME');
  });

  it('creates the channel and moves on to agents', async () => {
    const wrapper = mountPage();
    await login(wrapper);
    await wrapper.findComponent(ComboBox).vm.$emit('update:modelValue', 'p1');
    // The edited inbox name is not sent; the page name is used instead.
    await wrapper.find('input').setValue('Support');
    let finish;
    dispatch.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    await wrapper.find('form').trigger('submit');
    expect(wrapper.find('.loading').text()).toBe(
      'INBOX_MGMT.DETAILS.CREATING_CHANNEL'
    );
    expect(dispatch).toHaveBeenCalledWith('inboxes/createFBChannel', {
      user_access_token: 'user-tok',
      page_access_token: 'tok1',
      page_id: 'p1',
      inbox_name: 'Acme Page',
    });
    finish({ id: 12 });
    await flushPromises();
    expect(router.replace).toHaveBeenCalledWith({
      name: 'settings_inboxes_add_agents',
      params: { page: 'new', inbox_id: 12 },
    });
  });

  it('reports channel creation errors', async () => {
    const wrapper = mountPage();
    await login(wrapper);
    await wrapper.findComponent(ComboBox).vm.$emit('update:modelValue', 'p1');
    dispatch.mockRejectedValueOnce({
      response: { data: { message: 'Page already connected' } },
    });
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('Page already connected');
    expect(wrapper.findComponent(ComboBox).exists()).toBe(true);

    dispatch.mockRejectedValueOnce(new Error('x'));
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'INBOX_MGMT.DETAILS.ERROR_CHANNEL_CREATION'
    );
  });
});
