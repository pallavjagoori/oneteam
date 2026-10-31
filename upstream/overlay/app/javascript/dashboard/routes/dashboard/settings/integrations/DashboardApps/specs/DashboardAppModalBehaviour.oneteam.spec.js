/**
 * OneTeam behaviour spec for the dashboard app create/edit modal.
 *
 * Covers create and update titles, prefilling an app being edited,
 * validation of the title and URL (errors on input and blur, blocked
 * submit), creating and updating apps (success resets and closes,
 * errors keep the modal open), and cancelling or closing the modal.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import DashboardAppModal from '../DashboardAppModal.vue';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const Modal = {
  name: 'WootModal',
  props: ['show', 'onClose'],
  template: '<div class="modal"><slot /></div>',
};
const Header = {
  name: 'WootModalHeader',
  props: ['headerTitle'],
  template: '<header>{{ headerTitle }}</header>',
};
const WootInput = {
  name: 'WootInput',
  props: ['modelValue', 'error'],
  emits: ['update:modelValue', 'input', 'blur'],
  template: '<div class="woot-input" />',
};
const NextButton = {
  name: 'NextButton',
  props: ['label', 'disabled', 'type', 'isLoading'],
  emits: ['click'],
  template:
    '<button :type="type" :disabled="disabled" @click="$emit(\'click\', $event)">{{ label }}</button>',
};

const mountModal = async props => {
  const dispatch = vi.fn().mockResolvedValue();
  const wrapper = mount(DashboardAppModal, {
    props: { show: true, ...props },
    global: {
      stubs: {
        WootModal: Modal,
        WootModalHeader: Header,
        WootInput,
        NextButton,
      },
      mocks: { $t: key => key, $store: { dispatch } },
    },
  });
  await flushPromises();
  return { wrapper, dispatch };
};
const inputs = wrapper => wrapper.findAllComponents(WootInput);
const fill = async (wrapper, title, url) => {
  const [titleInput, urlInput] = inputs(wrapper);
  titleInput.vm.$emit('update:modelValue', title);
  titleInput.vm.$emit('input');
  urlInput.vm.$emit('update:modelValue', url);
  urlInput.vm.$emit('blur');
  await flushPromises();
};
const submitButton = wrapper =>
  wrapper.findAllComponents(NextButton).find(b => b.props('type') === 'submit');
const submit = async wrapper => {
  await wrapper.find('form').trigger('submit');
  await flushPromises();
};

describe('DashboardAppModal behaviour', () => {
  it('starts an empty create form', async () => {
    const { wrapper } = await mountModal();
    expect(wrapper.find('header').text()).toBe(
      'INTEGRATION_SETTINGS.DASHBOARD_APPS.create.HEADER'
    );
    expect(inputs(wrapper).map(i => i.props('modelValue'))).toEqual(['', '']);
    expect(submitButton(wrapper).props('disabled')).toBe(true);
  });

  it('shows validation errors and blocks invalid submits', async () => {
    const { wrapper, dispatch } = await mountModal({ mode: 'CREATE' });
    await fill(wrapper, '', 'not a url');
    expect(inputs(wrapper).map(i => i.props('error'))).toEqual([
      'INTEGRATION_SETTINGS.DASHBOARD_APPS.FORM.TITLE_ERROR',
      'INTEGRATION_SETTINGS.DASHBOARD_APPS.FORM.URL_ERROR',
    ]);
    expect(inputs(wrapper)[0].classes()).toContain('error');
    await submit(wrapper);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('creates an app, then resets and closes', async () => {
    const { wrapper, dispatch } = await mountModal({ mode: 'CREATE' });
    await fill(wrapper, 'CRM', 'https://crm.example.com');
    expect(inputs(wrapper).map(i => i.props('error'))).toEqual([null, null]);
    await submit(wrapper);
    expect(dispatch).toHaveBeenCalledWith('dashboardApps/create', {
      title: 'CRM',
      content: [{ type: 'frame', url: 'https://crm.example.com' }],
    });
    expect(useAlert).toHaveBeenCalledWith(
      'INTEGRATION_SETTINGS.DASHBOARD_APPS.CREATE.API_SUCCESS'
    );
    expect(wrapper.emitted('close')).toHaveLength(1);
    expect(inputs(wrapper)[0].props('modelValue')).toBe('');
  });

  it('prefills and updates an existing app', async () => {
    const { wrapper, dispatch } = await mountModal({
      mode: 'UPDATE',
      selectedAppData: {
        id: 8,
        title: 'Orders',
        content: [{ type: 'frame', url: 'https://orders.example.com' }],
      },
    });
    expect(wrapper.find('header').text()).toBe(
      'INTEGRATION_SETTINGS.DASHBOARD_APPS.UPDATE.HEADER'
    );
    expect(inputs(wrapper).map(i => i.props('modelValue'))).toEqual([
      'Orders',
      'https://orders.example.com',
    ]);
    await submit(wrapper);
    expect(dispatch).toHaveBeenCalledWith('dashboardApps/update', {
      id: 8,
      title: 'Orders',
      content: [{ type: 'frame', url: 'https://orders.example.com' }],
    });
  });

  it('skips prefilling without app data', async () => {
    const { wrapper } = await mountModal({
      mode: 'UPDATE',
      selectedAppData: null,
    });
    expect(inputs(wrapper)[0].props('modelValue')).toBe('');
  });

  it('keeps the modal open when saving fails', async () => {
    const { wrapper, dispatch } = await mountModal({ mode: 'CREATE' });
    dispatch.mockRejectedValue(new Error('nope'));
    await fill(wrapper, 'CRM', 'https://crm.example.com');
    await submit(wrapper);
    expect(useAlert).toHaveBeenCalledWith(
      'INTEGRATION_SETTINGS.DASHBOARD_APPS.CREATE.API_ERROR'
    );
    expect(wrapper.emitted('close')).toBeUndefined();
    expect(submitButton(wrapper).props('isLoading')).toBe(false);
  });

  it('cancels from the button or the modal', async () => {
    const { wrapper } = await mountModal();
    await wrapper.findAllComponents(NextButton)[0].trigger('click');
    wrapper.findComponent(Modal).props('onClose')();
    expect(wrapper.emitted('close')).toHaveLength(2);
  });
});
