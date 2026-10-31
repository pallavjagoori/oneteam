/**
 * OneTeam behaviour spec for the WhatsApp manual setup wizard.
 *
 * Walks the five steps (Meta app, phone/WABA ids, access token, review,
 * webhook verification), covering validation, API errors, the webhook
 * status polling loop, copying the callback URL and the hand-off to the
 * "add agents" page. The poll timer is replaced so ticks run on demand.
 */
import { h } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import WhatsappManualSetup from '../WhatsappManualSetup.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: key => key }),
  I18nT: {
    name: 'I18nT',
    setup:
      (_, { slots }) =>
      () =>
        h('span', slots.metaDevelopers()),
  },
}));
vi.mock('vue-router', () => ({
  useRoute: () => env.route,
  useRouter: () => env.router,
}));
vi.mock('vuex', () => ({ useStore: () => env.store }));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('shared/composables/useBranding', () => ({
  useBranding: () => ({ replaceInstallationName: text => `branded:${text}` }),
}));
vi.mock('shared/helpers/clipboard', () => ({
  copyTextToClipboard: vi.fn(async () => {}),
}));
vi.mock('dashboard/api/channel/whatsappChannel', () => ({
  default: {
    previewManualSetup: vi.fn(),
    connectManualSetup: vi.fn(),
    getManualWebhookStatus: vi.fn(),
    setupManualWebhook: vi.fn(),
  },
}));
vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  useTimeoutPoll: fn => {
    env.poll = fn;
    env.pollControls = { pause: vi.fn(), resume: vi.fn() };
    return env.pollControls;
  },
}));

const { useAlert } = await import('dashboard/composables');
const { copyTextToClipboard } = await import('shared/helpers/clipboard');
const { default: API } = await import('dashboard/api/channel/whatsappChannel');

const P = 'INBOX_MGMT.ADD.WHATSAPP.MANUAL_SETUP';

const ButtonStub = {
  name: 'Button',
  props: ['label', 'isLoading', 'disabled', 'icon'],
  emits: ['click'],
  template:
    '<button :data-label="label" :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
};
const InputStub = {
  name: 'Input',
  props: ['modelValue', 'label', 'message', 'messageType', 'type'],
  emits: ['update:modelValue'],
  template:
    '<input :data-label="label" :type="type || \'text\'" :data-message="message" :data-type="messageType" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
};
const BannerStub = {
  name: 'Banner',
  props: ['color'],
  template: '<div class="banner" :data-color="color"><slot /></div>',
};

const apiError = message => ({ response: { data: { message } } });

const mountSetup = () =>
  mount(WhatsappManualSetup, {
    global: {
      stubs: {
        Button: ButtonStub,
        Input: InputStub,
        Banner: BannerStub,
        Icon: { name: 'Icon', props: ['icon'], template: '<i />' },
        ManualSetupVideo: {
          name: 'ManualSetupVideo',
          props: ['src', 'poster', 'title', 'description'],
          template: '<video :src="src" />',
        },
      },
    },
  });

const btn = (wrapper, key) =>
  wrapper.find(`button[data-label="${P}.ACTIONS.${key}"]`);
const input = (wrapper, key) => wrapper.find(`input[data-label="${P}.${key}"]`);
const errorBanner = wrapper =>
  wrapper.findAll('.banner').find(b => b.attributes('data-color') === 'ruby');

const preview = {
  verified_name: 'Acme',
  display_phone_number: '+1 555',
  phone_number_id: 'pn-1',
  waba_id: 'waba-1',
  suggested_inbox_name: 'Acme WhatsApp',
};

/** Fills the ids and token and lands on the review step. */
const toReview = async (wrapper, data = preview) => {
  API.previewManualSetup.mockResolvedValueOnce({ data });
  await btn(wrapper, 'APP_READY').trigger('click');
  await input(wrapper, 'DETAILS.PHONE_ID_LABEL').setValue(' pn-1 ');
  await input(wrapper, 'DETAILS.WABA_LABEL').setValue(' waba-1 ');
  await btn(wrapper, 'NEXT').trigger('click');
  await input(wrapper, 'DETAILS.TOKEN_LABEL').setValue(' tok ');
  await btn(wrapper, 'VERIFY_DETAILS').trigger('click');
  await flushPromises();
};

/** Continues from review to the verification step. */
const toVerify = async (wrapper, data) => {
  await toReview(wrapper);
  API.connectManualSetup.mockResolvedValueOnce({ data });
  await btn(wrapper, 'CONNECT').trigger('click');
  await flushPromises();
};

describe('WhatsappManualSetup behaviour', () => {
  beforeEach(() => {
    env.route = { name: 'settings_inbox_new', params: { accountId: 1 } };
    env.router = { push: vi.fn(), replace: vi.fn() };
    env.store = { dispatch: vi.fn(async () => {}) };
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renders the header and the app step with progress', () => {
    const wrapper = mountSetup();
    expect(wrapper.text()).toContain(`branded:${P}.HEADER.DESCRIPTION`);
    expect(wrapper.text()).toContain(`${P}.APP.META_DEVELOPERS`);
    expect(wrapper.text()).toContain(`${P}.APP.ITEM_4`);
    expect(wrapper.find('a').attributes('href')).toBe(
      'https://developers.facebook.com/apps/'
    );
    expect(wrapper.find('video').attributes('src')).toContain(
      'create-meta-app.mp4'
    );
    const bars = wrapper.findAll('.grid.w-40 > *');
    expect(bars.map(b => b.classes('bg-n-brand'))).toEqual([
      true,
      false,
      false,
      false,
      false,
    ]);
  });

  it('back on the first step returns to the provider list', async () => {
    const wrapper = mountSetup();
    await btn(wrapper, 'BACK').trigger('click');
    expect(env.router.push).toHaveBeenCalledWith({
      name: 'settings_inbox_new',
      params: { accountId: 1 },
      query: {},
    });
  });

  it('moves between steps and scrolls the wizard into view', async () => {
    const wrapper = mountSetup();
    await btn(wrapper, 'APP_READY').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain(`${P}.NUMBER.ITEM_6`);
    expect(wrapper.text()).toContain(`${P}.ACTIONS.OPEN_META_APPS`);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      block: 'start',
    });
    await btn(wrapper, 'BACK').trigger('click');
    expect(wrapper.text()).toContain(`${P}.APP.ITEM_2`);
    expect(env.router.push).not.toHaveBeenCalled();
  });

  it('skips scrolling when the wizard is gone before the next tick', async () => {
    const wrapper = mountSetup();
    await btn(wrapper, 'APP_READY').trigger('click');
    await flushPromises();
    Element.prototype.scrollIntoView.mockClear();
    btn(wrapper, 'BACK').element.click();
    wrapper.unmount();
    await flushPromises();
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('requires both ids before the token step and clears the error on edit', async () => {
    const wrapper = mountSetup();
    await btn(wrapper, 'APP_READY').trigger('click');
    await btn(wrapper, 'NEXT').trigger('click');
    expect(errorBanner(wrapper).text()).toBe(`${P}.ERRORS.IDS_REQUIRED`);
    expect(
      input(wrapper, 'DETAILS.PHONE_ID_LABEL').attributes('data-type')
    ).toBe('error');
    expect(input(wrapper, 'DETAILS.WABA_LABEL').attributes('data-type')).toBe(
      'error'
    );

    await input(wrapper, 'DETAILS.PHONE_ID_LABEL').setValue('pn');
    expect(errorBanner(wrapper)).toBeUndefined();
    await btn(wrapper, 'NEXT').trigger('click');
    expect(
      input(wrapper, 'DETAILS.PHONE_ID_LABEL').attributes('data-type')
    ).toBe('info');
    expect(input(wrapper, 'DETAILS.WABA_LABEL').attributes('data-type')).toBe(
      'error'
    );
    await input(wrapper, 'DETAILS.WABA_LABEL').setValue('waba');
    expect(input(wrapper, 'DETAILS.WABA_LABEL').attributes('data-type')).toBe(
      'info'
    );
    await btn(wrapper, 'NEXT').trigger('click');
    expect(wrapper.text()).toContain(`${P}.TOKEN.ITEM_6`);
  });

  it('token step toggles visibility, validates and shows errors inline', async () => {
    const wrapper = mountSetup();
    await btn(wrapper, 'APP_READY').trigger('click');
    await input(wrapper, 'DETAILS.PHONE_ID_LABEL').setValue('pn');
    await input(wrapper, 'DETAILS.WABA_LABEL').setValue('waba');
    await btn(wrapper, 'NEXT').trigger('click');

    const token = () => input(wrapper, 'DETAILS.TOKEN_LABEL');
    expect(token().attributes('type')).toBe('password');
    expect(wrapper.text()).toContain(`${P}.TOKEN.WARNING`);
    await btn(wrapper, 'SHOW_TOKEN').trigger('click');
    expect(token().attributes('type')).toBe('text');
    await btn(wrapper, 'HIDE_TOKEN').trigger('click');
    expect(token().attributes('type')).toBe('password');

    await btn(wrapper, 'VERIFY_DETAILS').trigger('click');
    expect(token().attributes('data-message')).toBe(`${P}.ERRORS.REQUIRED`);
    expect(token().attributes('data-type')).toBe('error');
    expect(errorBanner(wrapper)).toBeUndefined();
    expect(wrapper.text()).not.toContain(`${P}.TOKEN.WARNING`);
    expect(API.previewManualSetup).not.toHaveBeenCalled();

    await token().setValue('tok');
    expect(token().attributes('data-type')).toBe('info');

    API.previewManualSetup.mockRejectedValueOnce(
      apiError('Error: Invalid OAuth access token.')
    );
    await btn(wrapper, 'VERIFY_DETAILS').trigger('click');
    await flushPromises();
    expect(token().attributes('data-message')).toBe(
      `${P}.ERRORS.INVALID_TOKEN`
    );

    API.previewManualSetup.mockRejectedValueOnce(apiError('Rate limited'));
    await btn(wrapper, 'VERIFY_DETAILS').trigger('click');
    await flushPromises();
    expect(token().attributes('data-message')).toBe('Rate limited');

    API.previewManualSetup.mockRejectedValueOnce(new Error('offline'));
    await btn(wrapper, 'VERIFY_DETAILS').trigger('click');
    await flushPromises();
    expect(token().attributes('data-message')).toBe(`${P}.ERRORS.GENERIC`);
    expect(btn(wrapper, 'VERIFY_DETAILS').attributes('disabled')).toBe(
      undefined
    );

    await btn(wrapper, 'BACK').trigger('click');
    expect(input(wrapper, 'DETAILS.WABA_LABEL').exists()).toBe(true);
  });

  it('shows the loading state while verifying', async () => {
    const wrapper = mountSetup();
    let resolve;
    await btn(wrapper, 'APP_READY').trigger('click');
    await input(wrapper, 'DETAILS.PHONE_ID_LABEL').setValue('pn');
    await input(wrapper, 'DETAILS.WABA_LABEL').setValue('waba');
    await btn(wrapper, 'NEXT').trigger('click');
    await input(wrapper, 'DETAILS.TOKEN_LABEL').setValue('tok');
    API.previewManualSetup.mockReturnValueOnce(
      new Promise(r => {
        resolve = r;
      })
    );
    await btn(wrapper, 'VERIFY_DETAILS').trigger('click');
    expect(btn(wrapper, 'VERIFY_DETAILS').attributes('disabled')).toBe('');
    resolve({ data: preview });
    await flushPromises();
    expect(wrapper.text()).toContain(`${P}.REVIEW.VERIFIED`);
  });

  it('verifies trimmed details and shows the review rows', async () => {
    const wrapper = mountSetup();
    await toReview(wrapper);
    expect(API.previewManualSetup).toHaveBeenCalledWith({
      waba_id: 'waba-1',
      phone_number_id: 'pn-1',
      access_token: 'tok',
    });
    const values = wrapper.findAll('dd').map(d => d.text());
    expect(values).toEqual(['Acme', '+1 555', 'pn-1', 'waba-1']);
    expect(input(wrapper, 'REVIEW.INBOX_NAME').element.value).toBe(
      'Acme WhatsApp'
    );

    await input(wrapper, 'REVIEW.INBOX_NAME').setValue('  ');
    expect(btn(wrapper, 'CONNECT').attributes('disabled')).toBe('');
    await btn(wrapper, 'BACK').trigger('click');
    expect(input(wrapper, 'DETAILS.TOKEN_LABEL').exists()).toBe(true);
  });

  it('falls back to the phone number when there is no verified name', async () => {
    const wrapper = mountSetup();
    await toReview(wrapper, { ...preview, verified_name: '' });
    expect(wrapper.find('dd').text()).toBe('+1 555');
  });

  it('shows connect errors on the review step', async () => {
    const wrapper = mountSetup();
    await toReview(wrapper);
    API.connectManualSetup.mockRejectedValueOnce(apiError('Nope'));
    await btn(wrapper, 'CONNECT').trigger('click');
    await flushPromises();
    expect(errorBanner(wrapper).text()).toBe('Nope');
    expect(env.pollControls.resume).not.toHaveBeenCalled();
  });

  it('connects, starts polling and reports webhook errors', async () => {
    const wrapper = mountSetup();
    await toVerify(wrapper, {
      id: 9,
      number_access: 1,
      template_access: 0,
      webhook_error: 'Webhook failed',
    });
    expect(API.connectManualSetup).toHaveBeenCalledWith({
      waba_id: 'waba-1',
      phone_number_id: 'pn-1',
      access_token: 'tok',
      inbox_name: 'Acme WhatsApp',
    });
    expect(wrapper.text()).toContain(`branded:${P}.VERIFY.DESCRIPTION`);
    expect(errorBanner(wrapper).text()).toBe('Webhook failed');
    expect(env.pollControls.resume).toHaveBeenCalled();
    const states = wrapper
      .findAll('.flex.items-center.gap-2.text-sm')
      .map(s => s.text());
    expect(states).toEqual([
      `${P}.VERIFY.COMPLETE`,
      `${P}.VERIFY.PENDING`,
      `${P}.VERIFY.PENDING`,
      `${P}.VERIFY.PENDING`,
    ]);
    expect(wrapper.find('code').exists()).toBe(false);
  });

  it('polls webhook status until ready, then continues to agents', async () => {
    const wrapper = mountSetup();
    await toVerify(wrapper, {
      id: 9,
      number_access: true,
      template_access: true,
    });
    expect(errorBanner(wrapper)).toBeUndefined();

    API.getManualWebhookStatus.mockRejectedValueOnce(apiError('down'));
    await env.poll();
    expect(errorBanner(wrapper)).toBeUndefined();
    expect(env.pollControls.pause).not.toHaveBeenCalled();

    API.getManualWebhookStatus.mockResolvedValueOnce({
      data: {
        callback_configured: true,
        callback_url: 'https://cw.test/hook',
        subscription_verified: true,
      },
    });
    await env.poll();
    await flushPromises();
    expect(API.getManualWebhookStatus).toHaveBeenLastCalledWith(9);
    expect(env.pollControls.pause).toHaveBeenCalledTimes(1);
    expect(wrapper.find('code').text()).toBe('https://cw.test/hook');
    expect(wrapper.text()).toContain(`${P}.VERIFY.SUCCESS`);

    await wrapper
      .find(`button[data-label="${P}.VERIFY.COPY"]`)
      .trigger('click');
    await flushPromises();
    expect(copyTextToClipboard).toHaveBeenCalledWith('https://cw.test/hook');
    expect(useAlert).toHaveBeenCalledWith(`${P}.VERIFY.COPY_SUCCESS`);

    await btn(wrapper, 'CONTINUE').trigger('click');
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenCalledWith('inboxes/get');
    expect(env.router.replace).toHaveBeenCalledWith({
      name: 'settings_inboxes_add_agents',
      params: { page: 'new', inbox_id: 9 },
    });
  });

  it('stops polling after the maximum number of attempts', async () => {
    const wrapper = mountSetup();
    await toVerify(wrapper, { id: 9 });
    API.getManualWebhookStatus.mockResolvedValue({ data: {} });
    for (let i = 0; i < 4; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await env.poll();
    }
    expect(env.pollControls.pause).not.toHaveBeenCalled();
    await env.poll();
    expect(env.pollControls.pause).toHaveBeenCalledTimes(1);
    expect(wrapper.find('code').exists()).toBe(false);
    API.getManualWebhookStatus.mockReset();
  });

  it('a poll tick before connecting does not call the API', async () => {
    mountSetup();
    await env.poll();
    expect(API.getManualWebhookStatus).not.toHaveBeenCalled();
  });

  it('retries the webhook setup', async () => {
    const wrapper = mountSetup();
    await toVerify(wrapper, {
      id: 9,
      number_access: true,
      template_access: true,
    });
    env.pollControls.resume.mockClear();

    API.setupManualWebhook.mockRejectedValueOnce(apiError('retry failed'));
    await btn(wrapper, 'RETRY_WEBHOOK').trigger('click');
    await flushPromises();
    expect(errorBanner(wrapper).text()).toBe('retry failed');

    API.setupManualWebhook.mockResolvedValueOnce({
      data: { callback_configured: true },
    });
    await btn(wrapper, 'RETRY_WEBHOOK').trigger('click');
    await flushPromises();
    expect(API.setupManualWebhook).toHaveBeenLastCalledWith(9);
    expect(errorBanner(wrapper)).toBeUndefined();
    expect(env.pollControls.resume).toHaveBeenCalledTimes(1);

    API.setupManualWebhook.mockResolvedValueOnce({
      data: {
        callback_configured: true,
        callback_url: 'https://cw.test/hook',
        subscription_verified: true,
      },
    });
    await btn(wrapper, 'RETRY_WEBHOOK').trigger('click');
    await flushPromises();
    expect(env.pollControls.resume).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain(`${P}.VERIFY.SUCCESS`);
  });
});
