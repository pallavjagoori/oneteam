/**
 * OneTeam behaviour spec for the WhatsApp business management token
 * setting.
 *
 * Covers the add and replace wording with the configured badge, the
 * disabled button until a token is typed, saving with a success alert,
 * the server and fallback error alerts, resetting when the inbox
 * changes, and ignoring a response that arrives after switching inbox.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import InboxesAPI from 'dashboard/api/inboxes';
import WhatsappBusinessManagementToken from '../WhatsappBusinessManagementToken.vue';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/api/inboxes', () => ({
  default: { updateWhatsappBusinessManagementToken: vi.fn() },
}));

const Section = {
  name: 'SettingsFieldSection',
  props: ['label', 'helpText'],
  template: '<section><h4>{{ label }}</h4><slot /></section>',
};
const WootInput = {
  name: 'WootInput',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<input class="token" />',
};
const NextButton = {
  name: 'NextButton',
  props: ['disabled', 'isLoading'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')"><slot /></button>',
};

const KEY = 'INBOX_MGMT.SETTINGS_POPUP.WHATSAPP_BUSINESS_MANAGEMENT_TOKEN';

const mountSetting = inbox =>
  mount(WhatsappBusinessManagementToken, {
    props: { inbox },
    global: { stubs: { SettingsFieldSection: Section, WootInput, NextButton } },
  });

const typeToken = (wrapper, value) =>
  wrapper.findComponent(WootInput).vm.$emit('update:modelValue', value);

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('WhatsappBusinessManagementToken behaviour', () => {
  it('adds a token and switches to replace', async () => {
    const call = deferred();
    InboxesAPI.updateWhatsappBusinessManagementToken.mockReturnValue(
      call.promise
    );
    const wrapper = mountSetting({ id: 1 });
    expect(wrapper.find('h4').text()).toBe(`${KEY}_ADD_TITLE`);
    expect(wrapper.find('button').text()).toBe(`${KEY}_ADD_BUTTON`);
    expect(wrapper.text()).not.toContain(`${KEY}_CONFIGURED`);
    expect(wrapper.findComponent(NextButton).props('disabled')).toBe(true);
    expect(wrapper.find('a').attributes('href')).toBe(
      'https://chwt.app/zM7G2yU'
    );

    await typeToken(wrapper, 'secret');
    expect(wrapper.findComponent(NextButton).props('disabled')).toBe(false);
    await wrapper.find('button').trigger('click');
    expect(
      InboxesAPI.updateWhatsappBusinessManagementToken
    ).toHaveBeenCalledWith(1, 'secret');
    expect(wrapper.findComponent(NextButton).props('isLoading')).toBe(true);
    call.resolve();
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(`${KEY}_UPDATE_SUCCESS`);
    expect(wrapper.find('h4').text()).toBe(`${KEY}_REPLACE_TITLE`);
    expect(wrapper.text()).toContain(`${KEY}_CONFIGURED`);
    expect(wrapper.findComponent(WootInput).props('modelValue')).toBe('');
    expect(wrapper.findComponent(NextButton).props('isLoading')).toBe(false);

    await wrapper.setProps({ inbox: { id: 2 } });
    expect(wrapper.find('h4').text()).toBe(`${KEY}_ADD_TITLE`);
  });

  it('shows replace wording for a configured token and alerts errors', async () => {
    const wrapper = mountSetting({
      id: 1,
      business_management_token_configured: true,
    });
    expect(wrapper.find('button').text()).toBe(`${KEY}_REPLACE_BUTTON`);
    await typeToken(wrapper, 'bad');
    InboxesAPI.updateWhatsappBusinessManagementToken.mockRejectedValueOnce({
      response: { data: { message: 'Invalid token' } },
    });
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('Invalid token');
    expect(wrapper.findComponent(NextButton).props('isLoading')).toBe(false);

    InboxesAPI.updateWhatsappBusinessManagementToken.mockRejectedValueOnce({});
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(`${KEY}_UPDATE_ERROR`);
  });

  it('ignores responses after the inbox changed', async () => {
    const ok = deferred();
    InboxesAPI.updateWhatsappBusinessManagementToken.mockReturnValueOnce(
      ok.promise
    );
    const wrapper = mountSetting({ id: 1 });
    await typeToken(wrapper, 'one');
    await wrapper.find('button').trigger('click');
    await wrapper.setProps({ inbox: { id: 2 } });
    await typeToken(wrapper, 'two');
    ok.resolve();
    await flushPromises();
    expect(useAlert).not.toHaveBeenCalled();
    expect(wrapper.findComponent(WootInput).props('modelValue')).toBe('two');

    const fail = deferred();
    InboxesAPI.updateWhatsappBusinessManagementToken.mockReturnValueOnce(
      fail.promise
    );
    await wrapper.find('button').trigger('click');
    await wrapper.setProps({ inbox: { id: 3 } });
    fail.reject(new Error('late'));
    await flushPromises();
    expect(useAlert).not.toHaveBeenCalled();
  });
});
