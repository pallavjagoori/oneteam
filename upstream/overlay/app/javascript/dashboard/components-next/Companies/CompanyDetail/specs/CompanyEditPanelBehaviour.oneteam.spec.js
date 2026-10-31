/**
 * OneTeam behaviour spec for the company edit side panel.
 *
 * Covers filling the form from the company (enriched industry/size,
 * legacy twitter links, missing attributes), requiring a name, saving
 * (trimmed fields, cleared optional fields, replacing enriched values,
 * dropping the country code when the country changes, social profile
 * URLs added/removed), the disabled state while updating, save errors
 * and closing the panel.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import CompanyEditPanel from '../CompanyEditPanel.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/stores/companies', async () => {
  const { reactive } = await import('vue');
  env.store = reactive({ getUIFlags: { updatingItem: false }, update: null });
  return { useCompaniesStore: () => env.store };
});

const Panel = {
  name: 'SidePanel',
  methods: { open: () => env.panel.open(), close: () => env.panel.close() },
  template: '<div><slot /><slot name="footer" /></div>',
};
const NextInput = {
  name: 'Input',
  props: ['modelValue', 'label', 'disabled'],
  emits: ['update:modelValue'],
  template: '<input />',
};
const NextTextArea = {
  name: 'TextArea',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<textarea />',
};
const Social = {
  name: 'SocialProfileInput',
  props: ['modelValue', 'network', 'label'],
  emits: ['update:modelValue'],
  template: '<input class="social" />',
};
const NextButton = {
  name: 'Button',
  props: ['label', 'disabled', 'isLoading'],
  template: '<button :disabled="disabled">{{ label }}</button>',
};

const company = (extra = {}) => ({
  id: 3,
  name: 'Acme',
  domain: 'acme.com',
  description: 'Rockets',
  additionalAttributes: {
    industry: 'Aerospace',
    sub_industry: 'Rocketry',
    employee_count: 120,
    employee_count_range: '100-200',
    city: 'Austin',
    country: 'USA',
    country_code: 'US',
    phone: '123',
    custom: 'kept',
    social_profiles: {
      linkedin: 'https://linkedin.com/company/acme',
      twitter: 'https://twitter.com/acme',
    },
  },
  ...extra,
});

const mountPanel = async (value = company()) => {
  const wrapper = mount(CompanyEditPanel, {
    props: { company: value },
    global: {
      stubs: {
        SidePanel: Panel,
        Input: NextInput,
        TextArea: NextTextArea,
        SocialProfileInput: Social,
        Button: NextButton,
        CompanyCustomAttributes: true,
      },
    },
  });
  wrapper.vm.open();
  await flushPromises();
  return wrapper;
};

const field = (wrapper, key) =>
  wrapper
    .findAllComponents(NextInput)
    .find(i => i.props('label').endsWith(key));
const social = (wrapper, network) =>
  wrapper.findAllComponents(Social).find(s => s.props('network') === network);
const save = async wrapper => {
  await wrapper
    .findAll('button')
    .find(b => b.text() === 'COMPANIES.DETAIL.EDIT.SAVE')
    .trigger('click');
  await flushPromises();
};
const saved = () => env.store.update.mock.calls.at(-1)[0];

describe('CompanyEditPanel behaviour', () => {
  beforeEach(() => {
    env.panel = { open: vi.fn(), close: vi.fn() };
    env.store.getUIFlags = { updatingItem: false };
    env.store.update = vi.fn().mockResolvedValue({});
  });

  it('fills the form from the company', async () => {
    const wrapper = await mountPanel();
    await flushPromises();
    expect(env.panel.open).toHaveBeenCalled();
    expect(field(wrapper, 'NAME').props('modelValue')).toBe('Acme');
    expect(field(wrapper, 'INDUSTRY').props('modelValue')).toBe('Rocketry');
    expect(field(wrapper, 'SIZE').props('modelValue')).toBe('120');
    expect(social(wrapper, 'linkedin').props('modelValue')).toBe(
      'company/acme'
    );
    expect(social(wrapper, 'x').props('modelValue')).toBe('acme');
    expect(social(wrapper, 'github').props('modelValue')).toBe('');
  });

  it('saves unchanged details without touching enriched values', async () => {
    const wrapper = await mountPanel();
    await save(wrapper);
    expect(saved()).toMatchObject({
      id: 3,
      name: 'Acme',
      domain: 'acme.com',
      description: 'Rockets',
    });
    expect(saved().additionalAttributes).toMatchObject({
      industry: 'Aerospace',
      sub_industry: 'Rocketry',
      employee_count: 120,
      country_code: 'US',
      custom: 'kept',
      social_profiles: {
        linkedin: 'https://linkedin.com/company/acme',
        x: expect.stringContaining('acme'),
      },
    });
    expect(
      saved().additionalAttributes.social_profiles.twitter
    ).toBeUndefined();
    expect(useAlert).toHaveBeenCalledWith(
      'COMPANIES.DETAIL.PROFILE.MESSAGES.UPDATE_SUCCESS'
    );
    expect(env.panel.close).toHaveBeenCalled();
  });

  it('replaces edited details and clears emptied ones', async () => {
    const wrapper = await mountPanel();
    await field(wrapper, 'NAME').vm.$emit('update:modelValue', '  Acme Inc ');
    await field(wrapper, 'DOMAIN').vm.$emit('update:modelValue', '  ');
    await wrapper.findComponent(NextTextArea).vm.$emit('update:modelValue', '');
    await field(wrapper, 'INDUSTRY').vm.$emit('update:modelValue', ' Space ');
    await field(wrapper, 'SIZE').vm.$emit('update:modelValue', '');
    await field(wrapper, 'CITY').vm.$emit('update:modelValue', '');
    await field(wrapper, 'COUNTRY').vm.$emit('update:modelValue', 'Canada');
    await social(wrapper, 'linkedin').vm.$emit('update:modelValue', '');
    await social(wrapper, 'x').vm.$emit('update:modelValue', '');
    await social(wrapper, 'github').vm.$emit('update:modelValue', 'acme');
    await save(wrapper);
    expect(saved()).toMatchObject({
      name: 'Acme Inc',
      domain: null,
      description: null,
    });
    const attributes = saved().additionalAttributes;
    expect(attributes).toMatchObject({
      industry: 'Space',
      country: 'Canada',
      phone: '123',
    });
    [
      'sub_industry',
      'employee_count',
      'employee_count_range',
      'city',
      'country_code',
    ].forEach(key => {
      expect(attributes[key]).toBeUndefined();
    });
    expect(attributes.social_profiles).toEqual({
      github: expect.stringContaining('acme'),
    });

    await social(wrapper, 'github').vm.$emit('update:modelValue', '');
    await field(wrapper, 'INDUSTRY').vm.$emit('update:modelValue', '');
    await save(wrapper);
    expect(saved().additionalAttributes.social_profiles).toBeUndefined();
    expect(saved().additionalAttributes.industry).toBeUndefined();
  });

  it('handles companies without attributes', async () => {
    const wrapper = await mountPanel({ id: 5 });
    expect(field(wrapper, 'NAME').props('modelValue')).toBe('');
    expect(field(wrapper, 'SIZE').props('modelValue')).toBe('');
    const saveButton = wrapper
      .findAllComponents(NextButton)
      .find(b => b.props('label') === 'COMPANIES.DETAIL.EDIT.SAVE');
    expect(saveButton.props('disabled')).toBe(true);
    await saveButton.vm.$emit('click');
    await flushPromises();
    expect(env.store.update).not.toHaveBeenCalled();
    await field(wrapper, 'NAME').vm.$emit('update:modelValue', 'New');
    await save(wrapper);
    expect(saved()).toEqual({
      id: 5,
      name: 'New',
      domain: null,
      description: null,
      additionalAttributes: {},
    });

    const ranged = await mountPanel({
      id: 6,
      name: 'R',
      additionalAttributes: {
        industry: 'Retail',
        employee_count_range: '1-10',
        social_profiles: { x: 'https://x.com/r' },
      },
    });
    expect(field(ranged, 'INDUSTRY').props('modelValue')).toBe('Retail');
    expect(field(ranged, 'SIZE').props('modelValue')).toBe('1-10');
    expect(social(ranged, 'x').props('modelValue')).toBe('r');
  });

  it('disables the form while updating', async () => {
    const wrapper = await mountPanel();
    env.store.getUIFlags = { updatingItem: true };
    await flushPromises();
    expect(field(wrapper, 'NAME').props('disabled')).toBe(true);
    const saveButton = wrapper
      .findAllComponents(NextButton)
      .find(b => b.props('label') === 'COMPANIES.DETAIL.EDIT.SAVE');
    expect(saveButton.props()).toMatchObject({
      disabled: true,
      isLoading: true,
    });
  });

  it('reports save errors and closes from cancel', async () => {
    const wrapper = await mountPanel();
    env.store.update.mockRejectedValueOnce(new Error('Domain taken'));
    await save(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith('Domain taken');
    env.store.update.mockRejectedValueOnce({});
    await save(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith(
      'COMPANIES.DETAIL.PROFILE.MESSAGES.UPDATE_ERROR'
    );
    expect(env.panel.close).not.toHaveBeenCalled();
    await wrapper
      .findAll('button')
      .find(b => b.text() === 'DIALOG.BUTTONS.CANCEL')
      .trigger('click');
    expect(env.panel.close).toHaveBeenCalled();
  });
});
