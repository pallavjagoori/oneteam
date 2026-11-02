/**
 * OneTeam behaviour spec for the "add agent" and "edit agent" modals.
 *
 * Add: default and custom roles, validation (name, email, role), creating
 * with a built-in or custom role, and the error alert picked from the
 * server response (error, message, duplicate email, base error, generic).
 * Edit: prefilled fields, availability options with the current one
 * disabled, saving with a built-in or custom role, failure, the password
 * reset link (hidden for SAML users) and cancelling.
 */
import { computed } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import AddAgent from '../AddAgent.vue';
import EditAgent from '../EditAgent.vue';

const env = vi.hoisted(() => ({ state: {}, dispatch: null, alert: null, reset: null }));

vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
  useMapGetter: name => computed(() => env.state[name]),
}));
vi.mock('dashboard/composables', () => ({
  useAlert: (...args) => env.alert(...args),
}));
vi.mock('../../../../../api/auth', () => ({
  default: { resetPassword: (...args) => env.reset(...args) },
}));

const Button = {
  name: 'NextButton',
  props: ['label', 'disabled', 'type'],
  emits: ['click'],
  template:
    '<button :type="type" :disabled="disabled" @click="$emit(\'click\', $event)">{{ label }}</button>',
};
const WootModalHeader = {
  name: 'WootModalHeader',
  props: ['headerTitle'],
  template: '<h2>{{ headerTitle }}</h2>',
};
const global = { stubs: { NextButton: Button, Button, WootModalHeader } };

const submit = wrapper => wrapper.find('button[type="submit"]');

describe('Agent forms behaviour', () => {
  beforeEach(() => {
    env.state = {
      'agents/getUIFlags': { isCreating: false, isUpdating: false },
      'customRole/getCustomRoles': [{ id: 5, name: 'Supervisor' }],
    };
    env.dispatch = vi.fn(() => Promise.resolve());
    env.alert = vi.fn();
    env.reset = vi.fn(() => Promise.resolve());
  });

  describe('add agent', () => {
    const fill = async (wrapper, role = 'agent') => {
      await wrapper.find('input[type="text"]').setValue('Asha');
      await wrapper.find('input[type="email"]').setValue('asha@acme.com');
      await wrapper.find('select').setValue(role);
    };

    it('validates and creates an agent with a built-in role', async () => {
      const wrapper = mount(AddAgent, { global });
      expect(wrapper.findAll('option').map(o => o.text())).toEqual([
        'AGENT_MGMT.AGENT_TYPES.ADMINISTRATOR',
        'AGENT_MGMT.AGENT_TYPES.AGENT',
        'Supervisor',
      ]);
      expect(submit(wrapper).attributes('disabled')).toBeDefined();
      await wrapper.find('form').trigger('submit');
      expect(env.dispatch).not.toHaveBeenCalled();
      expect(wrapper.findAll('label.error')).toHaveLength(2);

      await fill(wrapper, 'administrator');
      expect(submit(wrapper).attributes('disabled')).toBeUndefined();
      await wrapper.find('form').trigger('submit');
      await flushPromises();
      expect(env.dispatch).toHaveBeenCalledWith('agents/create', {
        name: 'Asha',
        email: 'asha@acme.com',
        role: 'administrator',
      });
      expect(env.alert).toHaveBeenCalledWith('AGENT_MGMT.ADD.API.SUCCESS_MESSAGE');
      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('creates an agent with a custom role and flags an empty role', async () => {
      const wrapper = mount(AddAgent, { global });
      await fill(wrapper, 5);
      await wrapper.find('form').trigger('submit');
      await flushPromises();
      expect(env.dispatch.mock.calls[0][1]).toEqual({
        name: 'Asha',
        email: 'asha@acme.com',
        custom_role_id: 5,
      });
      wrapper.find('select').element.value = '';
      await wrapper.find('select').trigger('change');
      expect(wrapper.find('.message').text()).toBe('AGENT_MGMT.ADD.FORM.AGENT_TYPE.ERROR');
      await wrapper.find('button[type="reset"]').trigger('click');
      expect(wrapper.emitted('close')).toHaveLength(2);
    });

    it.each([
      [{ response: { data: { error: 'Seat limit' } } }, 'Seat limit'],
      [{ response: { data: { message: 'Bad email' } } }, 'Bad email'],
      [{ response: { status: 422, data: {} } }, 'AGENT_MGMT.ADD.API.EXIST_MESSAGE'],
      [{ response: { status: 422, data: { attributes: ['base'] } } }, 'AGENT_MGMT.ADD.API.ERROR_MESSAGE'],
      [{}, 'AGENT_MGMT.ADD.API.ERROR_MESSAGE'],
    ])('alerts the right message when creating fails (%#)', async (error, message) => {
      env.dispatch = vi.fn(() => Promise.reject(error));
      const wrapper = mount(AddAgent, { global });
      await fill(wrapper);
      await wrapper.find('form').trigger('submit');
      await flushPromises();
      expect(env.alert).toHaveBeenCalledWith(message);
      expect(wrapper.emitted('close')).toBeUndefined();
    });
  });

  describe('edit agent', () => {
    const mountEdit = props =>
      mount(EditAgent, {
        props: { id: 3, name: 'Ben', email: 'ben@acme.com', type: 'agent', availability: 'busy', ...props },
        global,
      });

    it('prefills the agent and saves with a built-in role', async () => {
      const wrapper = mountEdit();
      expect(wrapper.find('h2').text()).toBe('AGENT_MGMT.EDIT.TITLE - Ben');
      const [role, availability] = wrapper.findAll('select');
      expect(role.element.value).toBe('agent');
      expect(availability.findAll('option').map(o => o.attributes('value'))).toEqual([
        'online',
        'busy',
        'offline',
      ]);
      await availability.setValue('online');
      await wrapper.find('form').trigger('submit');
      await flushPromises();
      expect(env.dispatch).toHaveBeenCalledWith('agents/update', {
        id: 3,
        name: 'Ben',
        availability: 'online',
        role: 'agent',
        custom_role_id: null,
      });
      expect(env.alert).toHaveBeenCalledWith('AGENT_MGMT.EDIT.API.SUCCESS_MESSAGE');
      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('saves a custom role, reports failures and validates fields', async () => {
      env.dispatch = vi.fn(() => Promise.reject(new Error('nope')));
      const wrapper = mountEdit({ customRoleId: 5 });
      expect(wrapper.find('select').element.value).toBe('5');
      await wrapper.find('form').trigger('submit');
      await flushPromises();
      expect(env.dispatch.mock.calls[0][1]).toMatchObject({ custom_role_id: 5 });
      expect(env.alert).toHaveBeenCalledWith('AGENT_MGMT.EDIT.API.ERROR_MESSAGE');

      await wrapper.find('input').setValue('');
      const [role, availability] = wrapper.findAll('select');
      role.element.value = '';
      await role.trigger('change');
      availability.element.value = '';
      await availability.trigger('change');
      await wrapper.find('form').trigger('submit');
      expect(env.dispatch).toHaveBeenCalledTimes(1);
      expect(wrapper.findAll('.message')).toHaveLength(2);
      expect(wrapper.findAll('label.error')).toHaveLength(3);
      await wrapper.find('button[type="reset"]').trigger('click');
      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('sends a password reset link unless the user signs in with SAML', async () => {
      const wrapper = mountEdit();
      const resetButton = () => wrapper.find('button[type="button"]');
      await resetButton().trigger('click');
      await flushPromises();
      expect(env.reset).toHaveBeenCalledWith({ email: 'ben@acme.com' });
      expect(env.alert).toHaveBeenCalledWith('AGENT_MGMT.EDIT.PASSWORD_RESET.ADMIN_SUCCESS_MESSAGE');
      env.reset = vi.fn(() => Promise.reject(new Error('down')));
      await resetButton().trigger('click');
      await flushPromises();
      expect(env.alert).toHaveBeenCalledWith('AGENT_MGMT.EDIT.PASSWORD_RESET.ERROR_MESSAGE');

      const saml = mountEdit({ provider: 'saml' });
      expect(saml.find('button[type="button"]').exists()).toBe(false);
    });
  });
});
