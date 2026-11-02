/**
 * OneTeam behaviour spec for the WhatsApp embedded signup step.
 *
 * Covers the intro (benefits, Meta restriction banner with and
 * without a status link), the loader while authenticating, the disabled
 * state, SDK load failures, a dismissed popup, creating the inbox (redirect
 * to agents, optional calling enablement and its failure, fallback when no
 * inbox comes back) and API errors.
 */
import { ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import WhatsappEmbeddedSignup from '../WhatsappEmbeddedSignup.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('vuex', () => ({
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
}));
vi.mock('vue-router', () => ({ useRouter: () => ({ replace: env.replace }) }));
vi.mock('dashboard/composables/useWhatsappEmbeddedSignup', () => ({
  useWhatsappEmbeddedSignup: () => ({
    isAuthenticating: env.isAuthenticating,
    runEmbeddedSignup: () => env.runSignup(),
  }),
}));
vi.mock('dashboard/api/inboxes', () => ({
  default: { enableWhatsappCalling: (...args) => env.enableCalling(...args) },
}));
vi.mock('dashboard/store/utils/api', () => ({
  parseAPIErrorResponse: error => error.apiMessage,
}));

const NextButton = {
  name: 'NextButton',
  props: { disabled: Boolean, isLoading: Boolean },
  emits: ['click'],
  template: '<button class="submit" @click="$emit(\'click\')"><slot /></button>',
};

const mountSignup = (props = {}) =>
  mount(WhatsappEmbeddedSignup, {
    props,
    global: {
      stubs: {
        NextButton,
        LoadingState: { props: ['message'], template: '<div class="loading">{{ message }}</div>' },
        Banner: { template: '<div class="banner"><slot /></div>' },
        Icon: true,
      },
    },
  });

const submit = async wrapper => {
  await wrapper.find('.submit').trigger('click');
  await flushPromises();
};

describe('WhatsApp embedded signup behaviour', () => {
  beforeEach(() => {
    env.isAuthenticating = ref(false);
    env.runSignup = vi.fn().mockResolvedValue({ code: 'abc' });
    env.dispatch = vi.fn().mockResolvedValue({ id: 12 });
    env.enableCalling = vi.fn().mockResolvedValue({});
    env.replace = vi.fn();
  });

  it('shows the benefits', () => {
    const wrapper = mountSignup();
    expect(wrapper.text()).toContain('INBOX_MGMT.ADD.WHATSAPP.EMBEDDED_SIGNUP.BENEFITS.EASY_SETUP');
    expect(wrapper.find('.banner').exists()).toBe(false);
  });

  it('warns about Meta restrictions with an optional status link', () => {
    const withLink = mountSignup({
      showRestrictionAlert: true,
      restrictionStatusUrl: 'https://status.example.com',
    });
    expect(withLink.find('.banner a').attributes('href')).toBe('https://status.example.com');
    const withoutLink = mountSignup({ showRestrictionAlert: true });
    expect(withoutLink.find('.banner a').exists()).toBe(false);
  });

  it('shows the loader while authenticating', () => {
    env.isAuthenticating.value = true;
    const wrapper = mountSignup();
    expect(wrapper.find('.loading').exists()).toBe(true);
  });

  it('does nothing while disabled', async () => {
    const wrapper = mountSignup({ isDisabled: true });
    expect(wrapper.findComponent(NextButton).props('disabled')).toBe(true);
    await submit(wrapper);
    expect(env.runSignup).not.toHaveBeenCalled();
  });

  it('reports SDK failures and dismissed popups', async () => {
    const wrapper = mountSignup();
    env.runSignup.mockRejectedValueOnce(new Error('Blocked by browser'));
    await submit(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith('Blocked by browser');
    env.runSignup.mockRejectedValueOnce(new Error(''));
    await submit(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith('INBOX_MGMT.ADD.WHATSAPP.EMBEDDED_SIGNUP.SDK_LOAD_ERROR');
    env.runSignup.mockResolvedValueOnce(null);
    await submit(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith('INBOX_MGMT.ADD.WHATSAPP.EMBEDDED_SIGNUP.CANCELLED');
    expect(env.dispatch).not.toHaveBeenCalled();
  });

  it('creates the inbox and moves on to adding agents', async () => {
    let finish;
    env.dispatch.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    const wrapper = mountSignup();
    wrapper.find('.submit').trigger('click');
    await flushPromises();
    expect(wrapper.find('.loading').text()).toBe('INBOX_MGMT.ADD.WHATSAPP.EMBEDDED_SIGNUP.PROCESSING');
    finish({ id: 12 });
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('inboxes/createWhatsAppEmbeddedSignup', { code: 'abc' });
    expect(env.enableCalling).not.toHaveBeenCalled();
    expect(useAlert).toHaveBeenCalledWith('INBOX_MGMT.FINISH.MESSAGE');
    expect(env.replace).toHaveBeenCalledWith({
      name: 'settings_inboxes_add_agents',
      params: { page: 'new', inbox_id: 12 },
    });
    expect(wrapper.find('.loading').exists()).toBe(false);
  });

  it('enables calling when asked and reports when that fails', async () => {
    const wrapper = mountSignup({ enableCallingOnComplete: true });
    await submit(wrapper);
    expect(env.enableCalling).toHaveBeenCalledWith(12);
    env.enableCalling.mockRejectedValueOnce(new Error('x'));
    await submit(wrapper);
    expect(useAlert).toHaveBeenCalledWith('INBOX_MGMT.ADD.WHATSAPP.EMBEDDED_SIGNUP.CALLING_ENABLE_FAILED');
    expect(env.replace).toHaveBeenCalledTimes(2);
  });

  it('falls back to the inbox list when no inbox comes back', async () => {
    env.dispatch.mockResolvedValueOnce(null);
    const wrapper = mountSignup();
    await submit(wrapper);
    expect(useAlert).toHaveBeenCalledWith('INBOX_MGMT.ADD.WHATSAPP.EMBEDDED_SIGNUP.SUCCESS_FALLBACK');
    expect(env.replace).toHaveBeenCalledWith({ name: 'settings_inbox_list' });
  });

  it('reports API errors', async () => {
    const wrapper = mountSignup();
    env.dispatch.mockRejectedValueOnce({ apiMessage: 'Number already used' });
    await submit(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith('Number already used');
    env.dispatch.mockRejectedValueOnce({});
    await submit(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith('INBOX_MGMT.ADD.WHATSAPP.API.ERROR_MESSAGE');
    expect(wrapper.find('.loading').exists()).toBe(false);
  });
});
