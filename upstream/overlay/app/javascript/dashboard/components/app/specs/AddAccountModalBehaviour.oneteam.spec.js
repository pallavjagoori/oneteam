/**
 * OneTeam behaviour spec for the "create a new account" modal.
 *
 * Covers the no-accounts warning, requiring a name, the creating state,
 * creating the account (alert, close and opening its dashboard), the
 * "already exists" and generic errors, and closing from Cancel or the
 * modal.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import AddAccountModal from '../AddAccountModal.vue';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const NextButton = {
  name: 'NextButton',
  props: ['label', 'disabled', 'isLoading', 'type'],
  emits: ['click'],
  template:
    '<button :type="type" :disabled="disabled" :data-loading="isLoading" @click="$emit(\'click\', $event)">{{ label }}</button>',
};
const WootModal = {
  name: 'WootModal',
  props: ['show', 'onClose'],
  template: '<div class="modal"><slot /></div>',
};

const realLocation = window.location;

const mountModal = (props = {}, uiFlags = { isCreating: false }) => {
  const dispatch = vi.fn().mockResolvedValue(42);
  const wrapper = mount(AddAccountModal, {
    props: { show: true, ...props },
    global: {
      stubs: {
        NextButton,
        WootModal,
        WootModalHeader: true,
        FluentIcon: true,
      },
      mocks: {
        $store: { dispatch, getters: { 'agents/getUIFlags': uiFlags } },
      },
    },
  });
  return { wrapper, dispatch };
};
const submit = wrapper => wrapper.find('button[type="submit"]');

describe('AddAccountModal behaviour', () => {
  beforeEach(() => {
    delete window.location;
    window.location = { href: '' };
    useAlert.mockClear();
  });

  afterEach(() => {
    window.location = realLocation;
  });

  it('warns when there are no accounts and requires a name', async () => {
    const { wrapper } = mountModal({ hasAccounts: false });
    expect(wrapper.text()).toContain('CREATE_ACCOUNT.NO_ACCOUNT_WARNING');
    expect(submit(wrapper).attributes('disabled')).toBeDefined();
    await wrapper.find('input').setValue('Acme');
    expect(submit(wrapper).attributes('disabled')).toBeUndefined();
    await wrapper.find('input').setValue('');
    expect(wrapper.find('label').classes()).toContain('error');

    const busy = mountModal({}, { isCreating: true }).wrapper;
    expect(busy.text()).not.toContain('CREATE_ACCOUNT.NO_ACCOUNT_WARNING');
    expect(submit(busy).attributes('data-loading')).toBe('true');
  });

  it('creates the account and opens it', async () => {
    const { wrapper, dispatch } = mountModal();
    await wrapper.find('input').setValue('Acme');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith('accounts/create', {
      account_name: 'Acme',
    });
    expect(wrapper.emitted('closeAccountCreateModal')).toHaveLength(1);
    expect(useAlert).toHaveBeenCalledWith('CREATE_ACCOUNT.API.SUCCESS_MESSAGE');
    expect(window.location).toBe('/app/accounts/42/dashboard');
  });

  it('reports existing names and other errors', async () => {
    const { wrapper, dispatch } = mountModal();
    dispatch
      .mockRejectedValueOnce({ response: { status: 422 } })
      .mockRejectedValueOnce({ response: { status: 500 } });
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'CREATE_ACCOUNT.API.EXIST_MESSAGE'
    );
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'CREATE_ACCOUNT.API.ERROR_MESSAGE'
    );
    expect(wrapper.emitted('closeAccountCreateModal')).toBeUndefined();
  });

  it('closes from Cancel or the modal', async () => {
    const { wrapper } = mountModal();
    await wrapper.find('button[type="reset"]').trigger('click');
    wrapper.findComponent(WootModal).props('onClose')();
    expect(wrapper.emitted('closeAccountCreateModal')).toHaveLength(2);
  });
});
