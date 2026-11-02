/**
 * OneTeam behaviour spec for the profile name, display name and email
 * form.
 *
 * Covers prefilling from props and following prop changes, showing the
 * email field only when it is editable, field errors on input and blur,
 * refusing an invalid form with an alert, and emitting the edited
 * details on submit.
 */
import { mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import UserBasicDetails from '../UserBasicDetails.vue';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const WootInput = {
  name: 'WootInput',
  props: ['modelValue', 'error'],
  emits: ['update:modelValue', 'input', 'blur'],
  template: '<div class="field" />',
};
const NextButton = {
  name: 'NextButton',
  props: ['label', 'type'],
  template: '<button :type="type">{{ label }}</button>',
};

const mountForm = props =>
  mount(UserBasicDetails, {
    props: {
      name: 'Jane',
      displayName: 'JD',
      email: 'jane@example.com',
      emailEnabled: true,
      ...props,
    },
    global: { stubs: { WootInput, NextButton } },
  });

const fields = wrapper => wrapper.findAllComponents(WootInput);

describe('UserBasicDetails behaviour', () => {
  beforeEach(() => {
    useAlert.mockClear();
  });

  it('prefills the fields and follows prop changes', async () => {
    const wrapper = mountForm();
    expect(fields(wrapper).map(f => f.props('modelValue'))).toEqual([
      'Jane',
      'JD',
      'jane@example.com',
    ]);
    await wrapper.setProps({
      name: 'Janet',
      displayName: 'JT',
      email: 'janet@example.com',
    });
    expect(fields(wrapper).map(f => f.props('modelValue'))).toEqual([
      'Janet',
      'JT',
      'janet@example.com',
    ]);
    expect(fields(mountForm({ emailEnabled: false }))).toHaveLength(2);
  });

  it('shows field errors on input and blur', async () => {
    const wrapper = mountForm();
    const [name, displayName, email] = fields(wrapper);
    await name.vm.$emit('update:modelValue', '');
    await name.vm.$emit('input');
    expect(fields(wrapper)[0].props('error')).toBe(
      'PROFILE_SETTINGS.FORM.NAME.ERROR'
    );
    await email.vm.$emit('update:modelValue', 'not-an-email');
    await email.vm.$emit('blur');
    expect(fields(wrapper)[2].props('error')).toBe(
      'PROFILE_SETTINGS.FORM.EMAIL.ERROR'
    );
    await email.vm.$emit('input');
    await name.vm.$emit('blur');
    await displayName.vm.$emit('input');
    await displayName.vm.$emit('blur');
    expect(fields(wrapper)[1].props('error')).toBe('');

    await wrapper.find('form').trigger('submit');
    expect(useAlert).toHaveBeenCalledWith('PROFILE_SETTINGS.FORM.ERROR');
    expect(wrapper.emitted('updateUser')).toBeUndefined();
  });

  it('emits the edited details', async () => {
    const wrapper = mountForm();
    await fields(wrapper)[1].vm.$emit('update:modelValue', 'Janey');
    await wrapper.find('form').trigger('submit');
    expect(useAlert).not.toHaveBeenCalled();
    expect(wrapper.emitted('updateUser')).toEqual([
      [{ name: 'Jane', displayName: 'Janey', email: 'jane@example.com' }],
    ]);
  });
});
