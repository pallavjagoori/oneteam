/**
 * OneTeam behaviour spec for an email inbox's outgoing SMTP settings.
 *
 * Covers loading the saved settings (and reloading when the inbox
 * changes), showing the fields only while SMTP is on, field validation
 * on blur and the save button state, picking the encryption, OpenSSL
 * verify mode and auth mechanism, and saving with success and error
 * alerts.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import SmtpSettings from '../SmtpSettings.vue';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const Field = {
  name: 'SettingsFieldSection',
  props: ['label', 'helpText'],
  template: '<section><slot /></section>',
};
const WootInput = {
  name: 'WootInput',
  props: ['modelValue', 'label', 'placeholder', 'type'],
  emits: ['update:modelValue', 'blur'],
  template: '<div class="woot-input" />',
};
const Radios = {
  name: 'InputRadioGroup',
  props: ['label', 'items', 'action'],
  template: '<div class="radios" />',
};
const Dropdown = {
  name: 'SingleSelectDropdown',
  props: ['label', 'selected', 'options', 'action'],
  template: '<div class="dropdown" />',
};
const NextButton = {
  name: 'NextButton',
  props: ['label', 'isLoading', 'disabled', 'type'],
  template: '<button type="submit" :disabled="disabled">{{ label }}</button>',
};

const savedInbox = {
  id: 9,
  smtp_enabled: true,
  smtp_address: 'smtp.example.com',
  smtp_port: 587,
  smtp_login: 'me',
  smtp_password: 'secret',
  smtp_domain: 'example.com',
  smtp_enable_starttls_auto: true,
  smtp_enable_ssl_tls: false,
  smtp_openssl_verify_mode: 'peer',
  smtp_authentication: 'plain',
};

const mountForm = async (inbox, uiFlags = {}) => {
  const dispatch = vi.fn().mockResolvedValue();
  const wrapper = mount(SmtpSettings, {
    props: { inbox },
    global: {
      stubs: {
        SettingsFieldSection: Field,
        WootInput,
        InputRadioGroup: Radios,
        SingleSelectDropdown: Dropdown,
        NextButton,
      },
      mocks: {
        $t: key => key,
        $store: { getters: { 'inboxes/getUIFlags': uiFlags }, dispatch },
      },
    },
  });
  await flushPromises();
  return { wrapper, dispatch };
};
const inputs = wrapper => wrapper.findAllComponents(WootInput);
const button = wrapper => wrapper.findComponent(NextButton);

describe('SmtpSettings behaviour', () => {
  it('hides the fields while SMTP is off and allows saving', async () => {
    const { wrapper } = await mountForm({ id: 1, smtp_enabled: false });
    expect(inputs(wrapper)).toHaveLength(0);
    expect(button(wrapper).props('disabled')).toBeFalsy();
  });

  it('loads the saved settings', async () => {
    const { wrapper } = await mountForm(savedInbox);
    expect(inputs(wrapper).map(i => i.props('modelValue'))).toEqual([
      'smtp.example.com',
      587,
      'me',
      'secret',
      'example.com',
    ]);
    expect(wrapper.findComponent(Radios).props('items')).toEqual([
      { id: 'ssl', title: 'SSL/TLS', checked: false },
      { id: 'starttls', title: 'STARTTLS', checked: true },
    ]);
    const [verify, auth] = wrapper.findAllComponents(Dropdown);
    expect(verify.props('selected')).toBe('peer');
    expect(auth.props('selected')).toBe('plain');
    expect(button(wrapper).props('disabled')).toBeFalsy();
  });

  it('reloads when the inbox changes', async () => {
    const { wrapper } = await mountForm({ id: 1, smtp_enabled: false });
    await wrapper.setProps({ inbox: savedInbox });
    expect(inputs(wrapper)).toHaveLength(5);
  });

  it('validates the fields once touched and blocks saving', async () => {
    const { wrapper } = await mountForm({ id: 1, smtp_enabled: false });
    await wrapper.find('input[type="checkbox"]').setValue(true);
    expect(button(wrapper).props('disabled')).toBe(true);
    const fields = inputs(wrapper);
    fields.forEach(field => field.vm.$emit('blur'));
    await flushPromises();
    expect(inputs(wrapper).every(i => i.classes().includes('error'))).toBe(
      true
    );
    const values = ['smtp.example.com', '25', 'me', 'pw', 'example.com'];
    values.forEach((value, index) =>
      fields[index].vm.$emit('update:modelValue', value)
    );
    await flushPromises();
    expect(inputs(wrapper).some(i => i.classes().includes('error'))).toBe(
      false
    );
    expect(button(wrapper).props('disabled')).toBeFalsy();
  });

  it('disables saving while an update is running', async () => {
    const { wrapper } = await mountForm(savedInbox, { isUpdatingSMTP: true });
    expect(button(wrapper).props('isLoading')).toBe(true);
    expect(button(wrapper).props('disabled')).toBe(true);
  });

  it('switches encryption, verify mode and auth mechanism, then saves', async () => {
    const { wrapper, dispatch } = await mountForm(savedInbox);
    const { action } = wrapper.findComponent(Radios).props();
    action({ id: 'ssl' });
    const [verify, auth] = wrapper.findAllComponents(Dropdown);
    verify.props('action')('client_once');
    auth.props('action')('ntlm');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith('inboxes/updateInboxSMTP', {
      id: 9,
      channel: {
        smtp_enabled: true,
        smtp_address: 'smtp.example.com',
        smtp_port: 587,
        smtp_login: 'me',
        smtp_password: 'secret',
        smtp_domain: 'example.com',
        smtp_enable_ssl_tls: true,
        smtp_enable_starttls_auto: false,
        smtp_openssl_verify_mode: 'client_once',
        smtp_authentication: 'ntlm',
      },
    });
    expect(useAlert).toHaveBeenCalledWith(
      'INBOX_MGMT.SMTP.EDIT.SUCCESS_MESSAGE'
    );

    action({ id: 'starttls' });
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(dispatch.mock.calls[1][1].channel).toMatchObject({
      smtp_enable_ssl_tls: false,
      smtp_enable_starttls_auto: true,
    });
  });

  it('shows the error message or a fallback when saving fails', async () => {
    const { wrapper, dispatch } = await mountForm(savedInbox);
    dispatch.mockRejectedValueOnce(new Error('Auth failed'));
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('Auth failed');
    dispatch.mockRejectedValueOnce(new Error(''));
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('INBOX_MGMT.SMTP.EDIT.ERROR_MESSAGE');
  });
});
