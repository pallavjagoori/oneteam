/**
 * OneTeam behaviour spec for the legacy contact edit form.
 *
 * Covers loading a contact into the form, phone number dial codes and
 * validation, country and company selection, avatar upload / delete, the
 * submitted payload (with and without the companies feature) and every
 * error shape the submit handler understands.
 */
import { shallowMount, flushPromises } from '@vue/test-utils';
import ContactForm from '../ContactForm.vue';
import Avatar from 'next/avatar/Avatar.vue';
import ComboBox from 'dashboard/components-next/combobox/ComboBox.vue';
import CompanySelector from 'dashboard/components-next/Companies/CompanySelector.vue';
import {
  DuplicateContactException,
  ExceptionWithMessage,
} from 'shared/helpers/CustomErrors';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const { useAlert } = await import('dashboard/composables');

const PhoneInput = {
  name: 'WootPhoneInput',
  props: ['modelValue', 'value', 'error'],
  emits: ['update:modelValue', 'setCode', 'blur'],
  template: '<input />',
};
const WootInput = {
  name: 'WootInput',
  props: ['modelValue', 'label'],
  emits: ['update:modelValue'],
  template: '<input />',
};
const NextButton = {
  name: 'NextButton',
  props: ['label', 'type'],
  emits: ['click'],
  template: '<button />',
};

const fullContact = {
  id: 9,
  name: 'Jane',
  email: 'jane@example.com',
  phone_number: '+14155550101',
  company_id: 4,
  thumbnail: 'jane.png',
  additional_attributes: {
    company_name: 'Acme',
    country_code: 'US',
    country: 'United States',
    city: 'SF',
    description: 'VIP',
    social_profiles: { github: 'jane', whatsapp: '@@jane', extra: 'x' },
    screen_name: 'jtw',
    social_telegram_user_name: 'jtg',
  },
};

let store;
const mountForm = ({
  contact = fullContact,
  companies = false,
  onSubmit,
  omitContact = false,
} = {}) => {
  store = {
    getters: {
      'accounts/isFeatureEnabledonAccount': (accountId, feature) =>
        companies && accountId === 1 && feature === 'companies',
    },
    dispatch: vi.fn(() => Promise.resolve()),
  };
  return shallowMount(ContactForm, {
    props: {
      ...(omitContact ? {} : { contact }),
      ...(onSubmit ? { onSubmit } : {}),
    },
    global: {
      mocks: {
        $t: key => key,
        $store: store,
        $route: { params: { accountId: '1' } },
      },
      stubs: { WootPhoneInput: PhoneInput, WootInput, NextButton },
    },
  });
};

const submit = async wrapper => {
  await wrapper.find('form').trigger('submit');
  await flushPromises();
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ContactForm loading', () => {
  it('fills the form from the contact and derives the dial code', async () => {
    const wrapper = mountForm();
    await wrapper.vm.$nextTick();
    const { vm } = wrapper;
    expect(vm.name).toBe('Jane');
    expect(vm.activeDialCode).toBe('+1');
    expect(vm.country).toEqual({ id: 'US', name: 'United States' });
    expect(vm.socialProfileUserNames).toMatchObject({
      twitter: 'jtw',
      telegram: 'jtg',
      github: 'jane',
      whatsapp: 'jane',
      extra: 'x',
    });
    expect(wrapper.findComponent(Avatar).props('src')).toBe('jane.png');
    expect(wrapper.findComponent(ComboBox).props('modelValue')).toBe('US');
  });

  it('uses blanks for an empty contact', () => {
    const wrapper = mountForm({ contact: {} });
    const { vm } = wrapper;
    expect(vm.name).toBe('');
    expect(vm.activeDialCode).toBe('');
    expect(vm.country).toEqual({
      id: '',
      name: 'CONTACT_FORM.FORM.COUNTRY.SELECT_COUNTRY',
    });
    expect(vm.socialProfileUserNames.whatsapp).toBe('');
    expect(wrapper.text()).toContain('CONTACT_FORM.FORM.PHONE_NUMBER.HELP');
  });

  it('defaults to an empty contact', () => {
    const wrapper = mountForm({ omitContact: true });
    expect(wrapper.vm.name).toBe('');
  });

  it('prefers stored social handles over legacy fields', () => {
    const wrapper = mountForm({
      contact: {
        additional_attributes: {
          social_profiles: { twitter: 't', telegram: 'tg' },
          social_whatsapp_user_name: '@wa',
        },
      },
    });
    expect(wrapper.vm.socialProfileUserNames).toMatchObject({
      twitter: 't',
      telegram: 'tg',
      whatsapp: 'wa',
    });
  });

  it('reloads when the contact prop changes', async () => {
    const wrapper = mountForm({ contact: {} });
    await wrapper.setProps({ contact: { name: 'Bo' } });
    expect(wrapper.vm.name).toBe('Bo');
  });

  it('formats country labels', () => {
    const { vm } = mountForm();
    expect(vm.countryNameWithCode({ name: 'India', id: 'IN' })).toBe(
      'India (IN)'
    );
    expect(vm.countryNameWithCode({ name: 'Nowhere', id: '' })).toBe('Nowhere');
    expect(vm.normalizeWhatsAppUsername(undefined)).toBe('');
    expect(vm.normalizeWhatsAppUsername(42)).toBe('42');
  });
});

describe('ContactForm phone number', () => {
  it('flags a number without a dial code', async () => {
    const wrapper = mountForm({ contact: {} });
    await wrapper
      .findComponent(PhoneInput)
      .vm.$emit('update:modelValue', '415');
    expect(wrapper.vm.isPhoneNumberNotValid).toBe(true);
    expect(wrapper.find('span.message').text()).toBe(
      'CONTACT_FORM.FORM.PHONE_NUMBER.DIAL_CODE_ERROR'
    );
  });

  it('flags non-digit numbers', async () => {
    const wrapper = mountForm({ contact: {} });
    await wrapper.findComponent(PhoneInput).vm.$emit('setCode', '+44');
    await wrapper
      .findComponent(PhoneInput)
      .vm.$emit('update:modelValue', 'abc');
    expect(wrapper.vm.isPhoneNumberNotValid).toBe(true);
    expect(wrapper.find('span.message').text()).toBe(
      'CONTACT_FORM.FORM.PHONE_NUMBER.ERROR'
    );
    expect(wrapper.vm.phoneNumberError).toBe(
      'CONTACT_FORM.FORM.PHONE_NUMBER.ERROR'
    );
  });

  it('accepts a local number with a dial code and prefixes it', async () => {
    const wrapper = mountForm({ contact: {} });
    await wrapper.findComponent(PhoneInput).vm.$emit('setCode', '+44');
    await wrapper
      .findComponent(PhoneInput)
      .vm.$emit('update:modelValue', '7700900123');
    expect(wrapper.vm.isPhoneNumberNotValid).toBe(false);
    expect(wrapper.vm.phoneNumberError).toBe('');
    expect(wrapper.vm.setPhoneNumber).toBe('+447700900123');
  });

  it('keeps full international numbers and empty numbers as they are', async () => {
    const wrapper = mountForm();
    expect(wrapper.vm.setPhoneNumber).toBe('+14155550101');
    await wrapper.findComponent(PhoneInput).vm.$emit('update:modelValue', '');
    expect(wrapper.vm.setPhoneNumber).toBe('');
    wrapper.vm.activeDialCode = '';
    expect(wrapper.vm.setPhoneNumber).toBe('');
  });

  it('swaps the dial code of an existing number', async () => {
    const wrapper = mountForm();
    await wrapper.findComponent(PhoneInput).vm.$emit('setCode', '1');
    expect(wrapper.vm.phoneNumber).toBe('+14155550101');
    await wrapper.findComponent(PhoneInput).vm.$emit('setCode', '+44');
    expect(wrapper.vm.phoneNumber).toBe('+444155550101');
    expect(wrapper.vm.activeDialCode).toBe('+1');
  });
});

describe('ContactForm fields', () => {
  it('selects a country and clears unknown ones', async () => {
    const wrapper = mountForm();
    const combo = wrapper.findComponent(ComboBox);
    expect(combo.props('options')[0].label).toContain('(');
    await combo.vm.$emit('update:modelValue', 'IN');
    expect(wrapper.vm.country).toEqual({ id: 'IN', name: 'India' });
    await combo.vm.$emit('update:modelValue', 'ZZZ');
    expect(wrapper.vm.country).toEqual({ id: '', name: '' });
  });

  it('uses the company selector when companies are enabled', async () => {
    const wrapper = mountForm({ companies: true });
    expect(
      wrapper.findAllComponents(WootInput).map(i => i.props('label'))
    ).toEqual(['CONTACT_FORM.FORM.CITY.LABEL']);
    await wrapper
      .findComponent(CompanySelector)
      .vm.$emit('select', { id: 7, name: 'Globex' });
    expect(wrapper.vm.companyId).toBe(7);
    expect(wrapper.vm.companyName).toBe('Globex');
  });

  it('uses a plain company input otherwise', () => {
    const wrapper = mountForm();
    expect(wrapper.findComponent(CompanySelector).exists()).toBe(false);
    expect(wrapper.findAllComponents(WootInput)).toHaveLength(2);
  });

  it('shows email and name validation errors', async () => {
    const wrapper = mountForm({ contact: {} });
    const [nameInput, emailInput] = wrapper.findAll('input[type="text"]');
    await emailInput.setValue('bad');
    await nameInput.setValue('');
    await wrapper.find('textarea').setValue('Bio');
    expect(wrapper.find('span.message').text()).toBe(
      'CONTACT_FORM.FORM.EMAIL_ADDRESS.ERROR'
    );
  });

  it('emits cancel', async () => {
    const wrapper = mountForm();
    await wrapper.findAllComponents(NextButton)[1].vm.$emit('click', {
      preventDefault: () => {},
    });
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });
});

describe('ContactForm avatar', () => {
  it('stores an uploaded avatar for the payload', async () => {
    const onSubmit = vi.fn();
    const wrapper = mountForm({ onSubmit });
    const file = new File(['x'], 'a.png');
    await wrapper
      .findComponent(Avatar)
      .vm.$emit('upload', { file, url: 'blob:a' });
    expect(wrapper.findComponent(Avatar).props('src')).toBe('blob:a');
    await submit(wrapper);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      avatar: file,
      isFormData: true,
    });
  });

  it('deletes a saved avatar', async () => {
    const wrapper = mountForm();
    await wrapper.findComponent(Avatar).vm.$emit('delete');
    await flushPromises();
    expect(store.dispatch).toHaveBeenCalledWith('contacts/deleteAvatar', 9);
    expect(useAlert).toHaveBeenCalledWith(
      'CONTACT_FORM.DELETE_AVATAR.API.SUCCESS_MESSAGE'
    );
    expect(wrapper.vm.avatarUrl).toBe('');
    expect(wrapper.vm.activeDialCode).toBe('');
  });

  it('only clears the preview for a new contact', async () => {
    const wrapper = mountForm({ contact: { name: 'New' } });
    await wrapper.findComponent(Avatar).vm.$emit('delete');
    await flushPromises();
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it('clears the preview without a contact object', async () => {
    const wrapper = mountForm();
    await wrapper.setProps({ contact: null }).catch(() => {});
    await wrapper.vm.handleAvatarDelete();
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it.each([
    [new Error('Gone'), 'Gone'],
    [new Error(''), 'CONTACT_FORM.DELETE_AVATAR.API.ERROR_MESSAGE'],
  ])('reports a failed avatar delete', async (error, message) => {
    const wrapper = mountForm();
    store.dispatch.mockRejectedValue(error);
    await wrapper.findComponent(Avatar).vm.$emit('delete');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(message);
  });
});

describe('ContactForm submit', () => {
  it('submits the full contact payload and emits success', async () => {
    const onSubmit = vi.fn();
    const wrapper = mountForm({ onSubmit });
    await submit(wrapper);
    expect(onSubmit).toHaveBeenCalledWith({
      id: 9,
      name: 'Jane',
      email: 'jane@example.com',
      phone_number: '+14155550101',
      additional_attributes: {
        ...fullContact.additional_attributes,
        description: 'VIP',
        company_name: 'Acme',
        country_code: 'US',
        country: 'United States',
        city: 'SF',
        social_profiles: expect.objectContaining({
          github: 'jane',
          whatsapp: 'jane',
        }),
      },
    });
    expect(wrapper.emitted('success')).toHaveLength(1);
    expect(useAlert).toHaveBeenCalledWith('CONTACT_FORM.SUCCESS_MESSAGE');
  });

  it('adds the company id and drops the placeholder country', async () => {
    const onSubmit = vi.fn();
    const wrapper = mountForm({
      contact: { name: 'Bo', company_id: 3 },
      companies: true,
      onSubmit,
    });
    wrapper.vm.country = null;
    await submit(wrapper);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      company_id: 3,
      resolve_legacy_company: true,
      additional_attributes: { country: '', country_code: '' },
    });
  });

  it('keeps the placeholder country out of the payload', async () => {
    const onSubmit = vi.fn();
    const wrapper = mountForm({ contact: { name: 'Bo' }, onSubmit });
    await submit(wrapper);
    expect(onSubmit.mock.calls[0][0].additional_attributes.country).toBe('');
  });

  it('does not submit invalid forms', async () => {
    const onSubmit = vi.fn();
    const wrapper = mountForm({ contact: {}, onSubmit });
    await submit(wrapper);
    expect(onSubmit).not.toHaveBeenCalled();

    await wrapper.setProps({ contact: { name: 'Bo' } });
    await wrapper.findComponent(PhoneInput).vm.$emit('update:modelValue', '12');
    await submit(wrapper);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits with the default handler', async () => {
    const wrapper = mountForm({ contact: { name: 'Bo' } });
    await submit(wrapper);
    expect(wrapper.emitted('success')).toHaveLength(1);
  });

  it.each([
    [
      new DuplicateContactException(['email']),
      'CONTACT_FORM.FORM.EMAIL_ADDRESS.DUPLICATE',
    ],
    [
      new DuplicateContactException(['phone_number']),
      'CONTACT_FORM.FORM.PHONE_NUMBER.DUPLICATE',
    ],
    [new ExceptionWithMessage('Blocked'), 'Blocked'],
    [new Error('x'), 'CONTACT_FORM.ERROR_MESSAGE'],
  ])('reports %s', async (error, message) => {
    const wrapper = mountForm({
      contact: { name: 'Bo' },
      onSubmit: () => Promise.reject(error),
    });
    await submit(wrapper);
    expect(useAlert).toHaveBeenCalledWith(message);
    expect(wrapper.emitted('success')).toBeUndefined();
  });

  it('stays silent for a duplicate on another field', async () => {
    const wrapper = mountForm({
      contact: { name: 'Bo' },
      onSubmit: () => Promise.reject(new DuplicateContactException(['name'])),
    });
    await submit(wrapper);
    expect(useAlert).not.toHaveBeenCalled();
  });
});
