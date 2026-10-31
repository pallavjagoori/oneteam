/**
 * OneTeam behaviour spec for the contact details form.
 *
 * Covers loading a contact (name split, legacy Telegram/WhatsApp fields,
 * WhatsApp "@" stripping), skipping the load for new contacts, editing
 * plain, nested and name fields, validation (required first name, email
 * format, error message type), country and company selection, social
 * profile inputs, and the exposed reset helpers.
 */
import { flushPromises, mount } from '@vue/test-utils';
import ContactsForm from '../ContactsForm.vue';

const env = vi.hoisted(() => ({ companies: true }));

vi.mock('dashboard/composables/useAccount', async () => {
  const { ref } = await import('vue');
  return {
    useAccount: () => ({
      currentAccount: ref({ id: 1 }),
      isCloudFeatureEnabled: () => env.companies,
    }),
  };
});

const Input = {
  name: 'Input',
  props: ['modelValue', 'placeholder', 'messageType', 'customInputClass'],
  emits: ['update:modelValue', 'input', 'blur'],
  template: '<input class="field" :value="modelValue" />',
};
const ComboBox = {
  name: 'ComboBox',
  props: ['modelValue', 'options', 'placeholder'],
  emits: ['update:modelValue'],
  template: '<div class="combo" />',
};
const PhoneNumberInput = {
  name: 'PhoneNumberInput',
  props: ['modelValue', 'placeholder', 'showBorder'],
  emits: ['update:modelValue'],
  template: '<div class="phone" />',
};
const CompanySelector = {
  name: 'CompanySelector',
  props: ['modelValue', 'selectedName', 'isDetailsView'],
  emits: ['select'],
  template: '<div class="company" />',
};

const contact = (overrides = {}) => ({
  id: 7,
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phoneNumber: '+15550001',
  companyId: 4,
  additionalAttributes: {
    city: 'London',
    countryCode: 'GB',
    socialTelegramUserName: 'ada_tg',
    socialWhatsappUserName: '@@ada',
    socialProfiles: { github: 'ada' },
  },
  ...overrides,
});

const mountForm = (props = {}) =>
  mount(ContactsForm, {
    props: { contactData: contact(), ...props },
    global: {
      stubs: { Input, ComboBox, PhoneNumberInput, CompanySelector, Icon: true },
    },
  });

const inputFor = (wrapper, key) =>
  wrapper
    .findAllComponents(Input)
    .find(i => i.props('placeholder').includes(`.${key}.`));
const lastUpdate = wrapper => wrapper.emitted('update')?.at(-1)?.[0];

describe('Contacts form behaviour', () => {
  beforeEach(() => {
    env.companies = true;
  });

  it('loads the contact into the form', () => {
    const wrapper = mountForm();
    const { state } = wrapper.vm;
    expect(state.firstName).toBe('Ada');
    expect(state.lastName).toBe('Lovelace');
    expect(state.companyId).toBe(4);
    expect(state.additionalAttributes.socialProfiles).toEqual({
      github: 'ada',
      telegram: 'ada_tg',
      whatsapp: 'ada',
    });
    expect(inputFor(wrapper, 'CITY').props('modelValue')).toBe('London');
    expect(inputFor(wrapper, 'FIRST_NAME').props('modelValue')).toBe('Ada');
    expect(wrapper.findComponent(ComboBox).props('modelValue')).toBe('GB');
    expect(wrapper.findComponent(PhoneNumberInput).props('modelValue')).toBe(
      '+15550001'
    );
    expect(wrapper.findComponent(CompanySelector).props()).toMatchObject({
      modelValue: 4,
      isDetailsView: false,
    });
    expect(wrapper.findAll('input:not(.field)')).toHaveLength(8);
  });

  it('fills defaults for sparse contacts and prefers social profile values', () => {
    const wrapper = mountForm({
      contactData: {
        id: 2,
        name: null,
        companyId: null,
        additionalAttributes: {
          socialProfiles: { telegram: 'tg', whatsapp: '@wa' },
        },
      },
    });
    const { state } = wrapper.vm;
    expect(state.firstName).toBe('');
    expect(state.companyId).toBe('');
    expect(state.additionalAttributes.socialProfiles).toMatchObject({
      telegram: 'tg',
      whatsapp: 'wa',
    });
    const noAttrs = mountForm({
      contactData: { id: 3, name: 'X', additionalAttributes: null },
    });
    expect(noAttrs.vm.state.additionalAttributes.socialProfiles).toEqual({
      telegram: '',
      whatsapp: '',
    });
    expect(inputFor(noAttrs, 'EMAIL_ADDRESS').props('modelValue')).toBe('');
  });

  it('does not load data for new contacts or contacts without an id', () => {
    expect(mountForm({ isNewContact: true }).vm.state.firstName).toBe('');
    expect(mountForm({ contactData: null }).vm.state.id).toBe(0);
  });

  it('reloads when the contact or its company changes', async () => {
    const wrapper = mountForm();
    await wrapper.setProps({ contactData: contact({ companyId: 9 }) });
    expect(wrapper.vm.state.companyId).toBe(9);
  });

  it('emits updates for plain, nested and name fields without the split names', async () => {
    const wrapper = mountForm();
    await inputFor(wrapper, 'CITY').vm.$emit('update:modelValue', 'Paris');
    await flushPromises();
    expect(lastUpdate(wrapper).additionalAttributes.city).toBe('Paris');
    expect(lastUpdate(wrapper)).not.toHaveProperty('firstName');
    await inputFor(wrapper, 'EMAIL_ADDRESS').vm.$emit(
      'update:modelValue',
      'new@example.com'
    );
    await flushPromises();
    expect(lastUpdate(wrapper).email).toBe('new@example.com');
    await inputFor(wrapper, 'LAST_NAME').vm.$emit('update:modelValue', 'King');
    await flushPromises();
    expect(lastUpdate(wrapper).name).toBe('Ada King');
    await wrapper
      .findComponent(PhoneNumberInput)
      .vm.$emit('update:modelValue', '+1999');
    await flushPromises();
    expect(lastUpdate(wrapper).phoneNumber).toBe('+1999');
  });

  it('validates the first name and email before emitting', async () => {
    const wrapper = mountForm();
    const count = () => wrapper.emitted('update')?.length || 0;
    const first = inputFor(wrapper, 'FIRST_NAME');
    await first.vm.$emit('update:modelValue', '');
    await flushPromises();
    expect(count()).toBe(0);
    expect(wrapper.vm.isFormInvalid).toBe(true);
    expect(inputFor(wrapper, 'FIRST_NAME').props('messageType')).toBe('error');
    expect(inputFor(wrapper, 'CITY').props('messageType')).toBe('info');
    wrapper.vm.resetValidation();
    await flushPromises();
    expect(inputFor(wrapper, 'FIRST_NAME').props('messageType')).toBe('info');
    await inputFor(wrapper, 'FIRST_NAME').vm.$emit('input');
    await inputFor(wrapper, 'FIRST_NAME').vm.$emit('blur');
    expect(inputFor(wrapper, 'FIRST_NAME').props('messageType')).toBe('error');
    await inputFor(wrapper, 'CITY').vm.$emit('input');
    await inputFor(wrapper, 'CITY').vm.$emit('blur');
    await inputFor(wrapper, 'FIRST_NAME').vm.$emit('update:modelValue', 'Ada');
    await flushPromises();
    await inputFor(wrapper, 'EMAIL_ADDRESS').vm.$emit(
      'update:modelValue',
      'bad'
    );
    await flushPromises();
    expect(count()).toBe(1);
  });

  it('sets the country name when a country is picked', async () => {
    const wrapper = mountForm();
    const combo = wrapper.findComponent(ComboBox);
    expect(combo.props('options')).toContainEqual({
      label: 'India',
      value: 'IN',
    });
    await combo.vm.$emit('update:modelValue', 'IN');
    expect(lastUpdate(wrapper).additionalAttributes).toMatchObject({
      countryCode: 'IN',
      country: 'India',
    });
    await combo.vm.$emit('update:modelValue', 'ZZ');
    expect(lastUpdate(wrapper).additionalAttributes.country).toBe('');
  });

  it('selects or clears a company', async () => {
    const wrapper = mountForm({ isDetailsView: true });
    const selector = wrapper.findComponent(CompanySelector);
    await selector.vm.$emit('select', { id: 5, name: 'Acme' });
    await flushPromises();
    expect(lastUpdate(wrapper)).toMatchObject({
      companyId: 5,
      additionalAttributes: { companyName: 'Acme' },
    });
    await selector.vm.$emit('select', {});
    await flushPromises();
    expect(lastUpdate(wrapper)).toMatchObject({
      companyId: '',
      additionalAttributes: { companyName: '' },
    });
  });

  it('uses a plain company name field without the companies feature', () => {
    env.companies = false;
    const wrapper = mountForm();
    expect(wrapper.findComponent(CompanySelector).exists()).toBe(false);
    expect(inputFor(wrapper, 'COMPANY_NAME').exists()).toBe(true);
  });

  it('updates social profiles and strips @ from WhatsApp', async () => {
    const wrapper = mountForm();
    const inputs = wrapper.findAll('input:not(.field)');
    await inputs[0].setValue('ada-li');
    expect(
      lastUpdate(wrapper).additionalAttributes.socialProfiles.linkedin
    ).toBe('ada-li');
    await inputs[3].setValue('@@123');
    expect(
      lastUpdate(wrapper).additionalAttributes.socialProfiles.whatsapp
    ).toBe('123');
  });

  it('resets the form to its defaults', () => {
    const wrapper = mountForm();
    wrapper.vm.resetForm();
    expect(wrapper.vm.state).toMatchObject({ id: 0, firstName: '', email: '' });
  });
});
