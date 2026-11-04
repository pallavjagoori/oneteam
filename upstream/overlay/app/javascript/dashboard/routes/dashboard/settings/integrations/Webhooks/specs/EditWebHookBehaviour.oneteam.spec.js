/**
 * OneTeam behaviour spec for the edit webhook modal.
 *
 * Covers saving changes, closing on success or cancel, and API error
 * alerts with and without a server message.
 */
import { mount, flushPromises } from '@vue/test-utils';
import EditWebHook from '../EditWebHook.vue';
import { useAlert } from 'dashboard/composables';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

/**
 * Mounts the modal with a fake store.
 *
 * @param {Function} dispatch store dispatch
 * @param {Function} onClose close callback
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountModal = (dispatch, onClose = vi.fn()) =>
  mount(EditWebHook, {
    props: { value: { url: 'https://a.test' }, id: 4, onClose },
    global: {
      mocks: {
        $t: key => key,
        $store: {
          dispatch,
          getters: { 'webhooks/getUIFlags': { updatingItem: true } },
        },
      },
      stubs: {
        WootModalHeader: true,
        WebhookForm: {
          name: 'WebhookForm',
          props: ['value', 'isSubmitting'],
          emits: ['submit', 'cancel'],
          template: '<form />',
        },
      },
    },
  });

describe('Edit webhook behaviour', () => {
  it('saves the webhook and closes', async () => {
    const dispatch = vi.fn().mockResolvedValue();
    const onClose = vi.fn();
    const wrapper = mountModal(dispatch, onClose);
    const form = wrapper.findComponent({ name: 'WebhookForm' });
    expect(form.props()).toMatchObject({
      value: { url: 'https://a.test' },
      isSubmitting: true,
    });
    form.vm.$emit('submit', { url: 'https://b.test' });
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith('webhooks/update', {
      webhook: { url: 'https://b.test' },
      id: 4,
    });
    expect(useAlert).toHaveBeenCalledWith(
      'INTEGRATION_SETTINGS.WEBHOOK.EDIT.API.SUCCESS_MESSAGE'
    );
    expect(onClose).toHaveBeenCalledTimes(1);
    form.vm.$emit('cancel');
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it.each([
    [{ response: { data: { message: 'Bad url' } } }, 'Bad url'],
    [undefined, 'INTEGRATION_SETTINGS.WEBHOOK.EDIT.API.ERROR_MESSAGE'],
  ])('alerts on failure', async (error, message) => {
    const wrapper = mountModal(vi.fn().mockRejectedValue(error));
    wrapper.findComponent({ name: 'WebhookForm' }).vm.$emit('submit', {});
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(message);
  });
});
