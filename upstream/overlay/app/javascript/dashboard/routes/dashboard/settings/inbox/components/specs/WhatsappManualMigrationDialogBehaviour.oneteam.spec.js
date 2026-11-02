/**
 * OneTeam behaviour spec for the WhatsApp manual migration wizard in
 * inbox settings.
 *
 * Covers opening the dialog with a form prefilled from the inbox, the
 * step indicator, the before-you-start, business details, access token
 * and review steps, the Continue and Review buttons being blocked until
 * the step is filled in, Back, Cancel and close, the review fallbacks for
 * missing details, and emitting trimmed credentials on Reconnect.
 */
import { mount } from '@vue/test-utils';
import WhatsappManualMigrationDialog from '../WhatsappManualMigrationDialog.vue';

const env = vi.hoisted(() => ({ log: [] }));

vi.mock('shared/composables/useBranding', () => ({
  useBranding: () => ({ replaceInstallationName: text => `[${text}]` }),
}));

const Dialog = {
  name: 'Dialog',
  methods: {
    open: () => env.log.push('open'),
    close: () => env.log.push('close'),
  },
  template: '<div><slot /><footer><slot name="footer" /></footer></div>',
};
const field = name => ({
  name,
  props: ['modelValue', 'label', 'disabled'],
  emits: ['update:modelValue'],
  template: `<div class="${name}" />`,
});
const Input = field('Input');
const TextArea = field('TextArea');
const Button = {
  name: 'Button',
  props: ['disabled', 'isLoading', 'icon'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')"><slot /></button>',
};

const KEY = 'INBOX_MGMT.SETTINGS_POPUP.WHATSAPP_MANUAL_MIGRATION';

const inbox = {
  name: 'Support line',
  phone_number: '+15550100',
  provider_config: { business_account_id: ' 111 ', phone_number_id: '222' },
};

const mountDialog = (props = {}) =>
  mount(WhatsappManualMigrationDialog, {
    props: { inbox, ...props },
    global: {
      stubs: {
        Dialog,
        Input,
        TextArea,
        NextButton: Button,
        Button,
        Icon: true,
      },
      directives: { tooltip: {} },
    },
  });

const footer = wrapper => wrapper.find('footer').findAllComponents(Button);
const pressText = (wrapper, text) =>
  footer(wrapper)
    .find(b => b.text() === text)
    .trigger('click');

describe('WhatsappManualMigrationDialog behaviour', () => {
  beforeEach(() => {
    env.log = [];
  });

  it('walks through the steps and reconnects with trimmed values', async () => {
    const wrapper = mountDialog({ isLoading: true });
    wrapper.vm.open();
    expect(env.log).toEqual(['open']);
    expect(wrapper.text()).toContain(
      `[${KEY}.STEPS.BEFORE_YOU_START.DESCRIPTION]`
    );
    expect(wrapper.find('a').attributes('href')).toBe(
      'https://chwt.app/migrate-whatsapp'
    );
    expect(wrapper.findAll('li .bg-n-blue-9')).toHaveLength(1);
    expect(footer(wrapper)[0].props('disabled')).toBe(true);

    await pressText(wrapper, `${KEY}.DIALOG.CONTINUE`);
    const inputs = wrapper.findAllComponents(Input);
    expect(inputs.map(i => i.props('modelValue'))).toEqual([
      ' 111 ',
      '222',
      '+15550100',
    ]);
    expect(inputs[2].props('disabled')).toBe('');
    expect(wrapper.findAll('li .bg-n-teal-9')).toHaveLength(2);
    expect(footer(wrapper)[0].props('disabled')).toBe(false);

    await inputs[1].vm.$emit('update:modelValue', ' ');
    expect(footer(wrapper)[2].props('disabled')).toBe(true);
    await inputs[1].vm.$emit('update:modelValue', '222 ');
    await pressText(wrapper, `${KEY}.DIALOG.CONTINUE`);

    expect(footer(wrapper)[2].text()).toBe(`${KEY}.DIALOG.REVIEW_MIGRATION`);
    expect(footer(wrapper)[2].props('disabled')).toBe(true);
    await wrapper
      .findComponent(TextArea)
      .vm.$emit('update:modelValue', ' token ');
    expect(wrapper.text()).toContain(`${KEY}.DIALOG.MESSAGING_PERMISSION`);
    await pressText(wrapper, `${KEY}.DIALOG.REVIEW_MIGRATION`);

    expect(wrapper.text()).toContain('Support line');
    expect(wrapper.text()).toContain(`[${KEY}.DIALOG.VERIFY_NOTICE]`);
    const reconnect = footer(wrapper)[2];
    expect(reconnect.props()).toMatchObject({
      disabled: false,
      isLoading: true,
    });
    await reconnect.trigger('click');
    expect(wrapper.emitted('reconnect')[0]).toEqual([
      { wabaId: '111', phoneNumberId: '222', accessToken: 'token' },
    ]);

    await pressText(wrapper, `${KEY}.DIALOG.BACK`);
    expect(wrapper.findComponent(TextArea).exists()).toBe(true);
  });

  it('blocks reconnect and shows fallbacks when details are missing', async () => {
    const wrapper = mountDialog({
      inbox: { name: 'Bare', phone_number: '' },
    });
    await pressText(wrapper, `${KEY}.DIALOG.CONTINUE`);
    expect(
      wrapper.findAllComponents(Input).map(i => i.props('modelValue'))
    ).toEqual(['', '', '']);
    expect(footer(wrapper)[2].props('disabled')).toBe(true);

    // The stub buttons ignore `disabled`, so the guards inside the
    // component are what keep an incomplete form from reconnecting.
    await pressText(wrapper, `${KEY}.DIALOG.CONTINUE`);
    await pressText(wrapper, `${KEY}.DIALOG.REVIEW_MIGRATION`);
    const values = wrapper.findAll('dd').map(d => d.text());
    expect(values).toEqual([
      'Bare',
      '',
      `${KEY}.DIALOG.NOT_ENTERED`,
      `${KEY}.DIALOG.NOT_ENTERED`,
    ]);
    expect(footer(wrapper)[2].props('disabled')).toBe(true);
    await pressText(wrapper, `${KEY}.DIALOG.RECONNECT`);
    expect(wrapper.emitted('reconnect')).toBeUndefined();

    wrapper.vm.open();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('a').exists()).toBe(true);
    await pressText(wrapper, `${KEY}.DIALOG.BACK`);
    expect(wrapper.find('a').exists()).toBe(true);
  });

  it('closes from the header and Cancel', async () => {
    const wrapper = mountDialog();
    await wrapper.findComponent(Button).trigger('click');
    await pressText(wrapper, `${KEY}.DIALOG.CANCEL`);
    expect(env.log).toEqual(['close', 'close']);
    wrapper.vm.close();
    expect(env.log).toHaveLength(3);
  });
});
