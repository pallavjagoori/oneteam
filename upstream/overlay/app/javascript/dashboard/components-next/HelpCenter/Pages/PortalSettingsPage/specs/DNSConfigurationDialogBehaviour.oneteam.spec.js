/**
 * OneTeam behaviour spec for the DNS instructions dialog shown after a
 * portal custom domain is saved.
 *
 * Covers the CNAME record built from the help center URL (falling back
 * to the install URL, then to nothing), copying it, validating the email
 * address on blur and submit, sending the instructions (which resets and
 * closes the dialog), and resetting when the dialog closes.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import DNSConfigurationDialog from '../DNSConfigurationDialog.vue';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('shared/helpers/clipboard', () => ({
  copyTextToClipboard: vi.fn().mockResolvedValue(),
}));

const Dialog = {
  name: 'Dialog',
  emits: ['close'],
  template: '<div><slot /></div>',
};
const Input = {
  name: 'Input',
  props: ['modelValue', 'message', 'messageType'],
  emits: ['update:modelValue', 'blur'],
  template: '<div class="email" />',
};
const NextButton = {
  name: 'NextButton',
  props: ['icon', 'label', 'type'],
  emits: ['click'],
  template:
    '<button :type="type || \'button\'" :data-icon="icon" @click="$emit(\'click\', $event)">{{ label }}</button>',
};

const PREFIX =
  'HELP_CENTER.PORTAL_SETTINGS.CONFIGURATION_FORM.CUSTOM_DOMAIN.DNS_CONFIGURATION_DIALOG';

const mountDialog = config => {
  window.chatwootConfig = config;
  return mount(DNSConfigurationDialog, {
    props: { customDomain: 'help.acme.io' },
    global: { stubs: { Dialog, Input, NextButton, Button: NextButton } },
  });
};

const input = wrapper => wrapper.findComponent(Input);

describe('DNSConfigurationDialog behaviour', () => {
  beforeEach(() => {
    useAlert.mockClear();
    copyTextToClipboard.mockResolvedValue();
  });

  it('builds the CNAME record and copies it', async () => {
    const wrapper = mountDialog({
      helpCenterURL: 'https://docs.chatwoot.com',
      hostURL: 'https://app.chatwoot.com',
    });
    expect(wrapper.text()).toContain('help.acme.io CNAME docs.chatwoot.com');
    expect(wrapper.vm.dialogRef).toBeTruthy();

    await wrapper.find('[data-icon="i-lucide-copy"]').trigger('click');
    await flushPromises();
    expect(copyTextToClipboard).toHaveBeenCalledWith(
      'help.acme.io CNAME docs.chatwoot.com'
    );
    expect(useAlert).toHaveBeenCalledWith(`${PREFIX}.COPY`);
  });

  it('falls back to the install URL, then to nothing', () => {
    expect(mountDialog({ hostURL: 'https://app.acme.io' }).text()).toContain(
      'help.acme.io CNAME app.acme.io'
    );
    expect(mountDialog(undefined).text()).toContain('help.acme.io CNAME ');
  });

  it('validates the email before sending', async () => {
    const wrapper = mountDialog({});
    await input(wrapper).vm.$emit('blur');
    expect(input(wrapper).props()).toMatchObject({
      message: `${PREFIX}.SEND_INSTRUCTIONS.ERROR`,
      messageType: 'error',
    });

    await input(wrapper).vm.$emit('update:modelValue', 'not-an-email');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.emitted('send')).toBeUndefined();

    await input(wrapper).vm.$emit('update:modelValue', 'it@acme.io');
    expect(input(wrapper).props('messageType')).toBe('info');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.emitted('send')).toEqual([['it@acme.io']]);
    expect(wrapper.emitted('close')).toHaveLength(1);
    expect(input(wrapper).props('modelValue')).toBe('');
  });

  it('resets when closed from the header or the dialog', async () => {
    const wrapper = mountDialog({});
    await input(wrapper).vm.$emit('update:modelValue', 'bad');
    await input(wrapper).vm.$emit('blur');
    await wrapper.find('[data-icon="i-lucide-x"]').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
    expect(input(wrapper).props()).toMatchObject({
      modelValue: '',
      messageType: 'info',
    });

    await input(wrapper).vm.$emit('update:modelValue', 'bad');
    await wrapper.findComponent(Dialog).vm.$emit('close');
    expect(input(wrapper).props('modelValue')).toBe('');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
