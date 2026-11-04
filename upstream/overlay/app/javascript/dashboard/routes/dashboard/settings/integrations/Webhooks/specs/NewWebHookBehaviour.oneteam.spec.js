/**
 * OneTeam behaviour spec for the new webhook modal.
 *
 * Covers creating a webhook, showing and copying its secret, closing the
 * modal, and API error alerts.
 */
import { mount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import NewWebHook from '../NewWebHook.vue';
import { useAlert } from 'dashboard/composables';
import { copyTextToClipboard } from 'shared/helpers/clipboard';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('shared/helpers/clipboard', () => ({ copyTextToClipboard: vi.fn() }));
vi.mock('shared/composables/useBranding', () => ({
  useBranding: () => ({ replaceInstallationName: text => text }),
}));

/**
 * Mounts the modal.
 *
 * @param {Function} create webhooks/create action
 * @param {Function} onClose close callback
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountModal = (create, onClose = vi.fn()) => {
  const store = createStore({
    getters: { 'webhooks/getUIFlags': () => ({ creatingItem: false }) },
    actions: { 'webhooks/create': create },
  });
  return mount(NewWebHook, {
    props: { onClose },
    global: {
      plugins: [store],
      directives: { tooltip: {} },
      stubs: {
        WootModalHeader: true,
        WebhookForm: {
          name: 'WebhookForm',
          emits: ['submit', 'cancel'],
          template: '<div class="form" />',
        },
        NextButton: {
          props: ['label', 'icon'],
          template: '<button :class="icon" @click="$emit(\'click\')" />',
        },
      },
    },
  });
};

describe('New webhook behaviour', () => {
  it('shows and copies the secret of a created webhook', async () => {
    copyTextToClipboard.mockResolvedValue();
    const onClose = vi.fn();
    const wrapper = mountModal(() => ({ secret: 'shh' }), onClose);
    wrapper.findComponent({ name: 'WebhookForm' }).vm.$emit('submit', {});
    await flushPromises();
    expect(wrapper.find('input').element.value).toBe('shh');
    await wrapper.find('.i-lucide-copy').trigger('click');
    await flushPromises();
    expect(copyTextToClipboard).toHaveBeenCalledWith('shh');
    expect(useAlert).toHaveBeenCalledWith(
      'INTEGRATION_SETTINGS.WEBHOOK.SECRET.COPY_SUCCESS'
    );
    await wrapper.findAll('button')[1].trigger('click');
    expect(onClose).toHaveBeenCalled();
  });

  it('closes when the form is cancelled', () => {
    const onClose = vi.fn();
    const wrapper = mountModal(vi.fn(), onClose);
    wrapper.findComponent({ name: 'WebhookForm' }).vm.$emit('cancel');
    expect(onClose).toHaveBeenCalled();
  });

  it.each([
    ['Invalid url', 'Invalid url'],
    ['', 'INTEGRATION_SETTINGS.WEBHOOK.EDIT.API.ERROR_MESSAGE'],
  ])('alerts on failure', async (apiMessage, message) => {
    const wrapper = mountModal(() => {
      throw Object.assign(new Error('x'), {
        response: { data: { message: apiMessage } },
      });
    });
    wrapper.findComponent({ name: 'WebhookForm' }).vm.$emit('submit', {});
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(message);
  });
});
