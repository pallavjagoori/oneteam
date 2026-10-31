/**
 * OneTeam behaviour spec for the custom role create/edit form.
 *
 * Covers the add and edit titles, prefilling a role (with missing
 * fields), validation (submit disabled, errors shown on blur and on
 * submit), the "manage all conversations" permission pulling in and
 * releasing the narrower conversation permissions, creating and
 * updating roles (success resets and closes, errors keep the form),
 * and cancelling.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import CustomRoleModal from '../CustomRoleModal.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('dashboard/composables/store', () => ({ useStore: () => env.store }));

const Header = {
  name: 'WootModalHeader',
  props: ['headerTitle', 'headerContent'],
  template: '<header />',
};
const NextButton = {
  name: 'Button',
  props: ['label', 'disabled', 'isLoading'],
  emits: ['click'],
  template:
    '<button :disabled="disabled" @click="$emit(\'click\', $event)">{{ label }}</button>',
};

const mountModal = async props => {
  env.store = { dispatch: vi.fn().mockResolvedValue() };
  const wrapper = mount(CustomRoleModal, {
    props,
    attachTo: document.body,
    global: {
      stubs: { WootModalHeader: Header, Button: NextButton },
      mocks: { $t: key => key },
    },
  });
  await flushPromises();
  return wrapper;
};

const checked = wrapper =>
  wrapper
    .findAll('input[type="checkbox"]')
    .filter(c => c.element.checked)
    .map(c => c.element.value);
const fill = async (wrapper, name, description) => {
  await wrapper.find('input[type="text"]').setValue(name);
  await wrapper.find('textarea').setValue(description);
};

let wrapper;

describe('Custom role modal behaviour', () => {
  afterEach(() => wrapper?.unmount());

  it('creates a role after validation', async () => {
    wrapper = await mountModal();
    expect(wrapper.findComponent(Header).props()).toEqual({
      headerTitle: 'CUSTOM_ROLE.ADD.TITLE',
      headerContent: 'CUSTOM_ROLE.ADD.DESC',
    });
    expect(document.activeElement).toBe(
      wrapper.find('input[type="text"]').element
    );
    const submit = () => wrapper.findAllComponents(NextButton)[1];
    expect(submit().props()).toMatchObject({
      label: 'CUSTOM_ROLE.ADD.SUBMIT',
      disabled: true,
    });

    await wrapper.find('form').trigger('submit');
    expect(env.store.dispatch).not.toHaveBeenCalled();
    expect(wrapper.find('label.error').exists()).toBe(true);

    await fill(wrapper, ' Auditor ', 'Reads reports');
    await wrapper.find('#report_manage').setValue(true);
    expect(submit().props('disabled')).toBe(false);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenCalledWith(
      'customRole/createCustomRole',
      {
        name: 'Auditor',
        description: 'Reads reports',
        permissions: ['report_manage'],
      }
    );
    expect(useAlert).toHaveBeenLastCalledWith(
      'CUSTOM_ROLE.ADD.API.SUCCESS_MESSAGE'
    );
    expect(wrapper.emitted('close')).toHaveLength(1);
    expect(wrapper.find('input[type="text"]').element.value).toBe('');
    expect(checked(wrapper)).toEqual([]);
  });

  it('flags fields on blur', async () => {
    wrapper = await mountModal();
    await wrapper.find('input[type="text"]').trigger('blur');
    await wrapper.find('textarea').trigger('blur');
    expect(wrapper.findAll('label.error')).toHaveLength(2);
  });

  it('adds and releases conversation permissions with manage all', async () => {
    wrapper = await mountModal();
    await wrapper.find('#conversation_manage').setValue(true);
    await flushPromises();
    expect(checked(wrapper)).toEqual([
      'conversation_manage',
      'conversation_unassigned_manage',
      'conversation_participating_manage',
    ]);
    await wrapper.find('#contact_manage').setValue(true);
    await wrapper.find('#conversation_manage').setValue(false);
    await flushPromises();
    expect(checked(wrapper)).toEqual([
      'conversation_unassigned_manage',
      'conversation_participating_manage',
      'contact_manage',
    ]);
  });

  it('edits a role and keeps the form on errors', async () => {
    wrapper = await mountModal({
      mode: 'edit',
      selectedRole: {
        id: 4,
        name: 'Lead',
        description: 'Team lead',
        permissions: ['contact_manage'],
      },
    });
    expect(wrapper.findComponent(Header).props('headerTitle')).toBe(
      'CUSTOM_ROLE.EDIT.TITLE'
    );
    expect(checked(wrapper)).toEqual(['contact_manage']);
    env.store.dispatch.mockRejectedValueOnce(new Error('Name taken'));
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenCalledWith(
      'customRole/updateCustomRole',
      {
        id: 4,
        name: 'Lead',
        description: 'Team lead',
        permissions: ['contact_manage'],
      }
    );
    expect(useAlert).toHaveBeenLastCalledWith('Name taken');
    expect(wrapper.emitted('close')).toBeUndefined();
    env.store.dispatch.mockRejectedValueOnce({});
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'CUSTOM_ROLE.FORM.API.ERROR_MESSAGE'
    );
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'CUSTOM_ROLE.EDIT.API.SUCCESS_MESSAGE'
    );
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('prefills an incomplete role and cancels', async () => {
    wrapper = await mountModal({ mode: 'edit', selectedRole: {} });
    expect(wrapper.find('input[type="text"]').element.value).toBe('');
    await wrapper.findAllComponents(NextButton)[0].trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
