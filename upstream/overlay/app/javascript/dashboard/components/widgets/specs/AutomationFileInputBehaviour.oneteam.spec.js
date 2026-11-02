/**
 * OneTeam behaviour spec for the automation attachment input.
 *
 * Covers the idle and previously-uploaded states, uploading a file
 * (spinner while processing, emitting the attachment id), and the
 * failed state with an error alert.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import AutomationFileInput from '../AutomationFileInput.vue';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const mountInput = (dispatch, props = {}) =>
  mount(AutomationFileInput, {
    props,
    global: {
      mocks: { $store: { dispatch }, $t: key => key },
      stubs: {
        FluentIcon: { props: ['icon'], template: '<i :data-icon="icon" />' },
        Spinner: { template: '<i class="spinner" />' },
      },
    },
  });

const pick = async wrapper => {
  const input = wrapper.find('input[type="file"]');
  const file = new File(['x'], 'a.txt');
  Object.defineProperty(input.element, 'files', { value: [file] });
  await input.trigger('change');
  return file;
};

describe('AutomationFileInput behaviour', () => {
  it('shows idle or an existing file', async () => {
    let wrapper = mountInput(vi.fn());
    expect(wrapper.classes()).toContain('idle');
    expect(wrapper.find('[data-icon="file-upload"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('AUTOMATION.ATTACHMENT.LABEL_IDLE');

    wrapper = mountInput(vi.fn(), { initialFileName: 'terms.pdf' });
    await wrapper.vm.$nextTick();
    expect(wrapper.classes()).toContain('uploaded');
    expect(wrapper.text()).toContain('terms.pdf');
    expect(wrapper.find('[data-icon="checkmark-circle"]').exists()).toBe(true);
  });

  it('uploads a file and emits its id', async () => {
    let resolve;
    const dispatch = vi.fn(
      () =>
        new Promise(done => {
          resolve = done;
        })
    );
    const wrapper = mountInput(dispatch);
    const file = await pick(wrapper);
    expect(dispatch).toHaveBeenCalledWith('automations/uploadAttachment', file);
    expect(wrapper.find('.spinner').exists()).toBe(true);
    expect(wrapper.find('input').exists()).toBe(false);
    expect(wrapper.text()).toContain('AUTOMATION.ATTACHMENT.LABEL_UPLOADING');
    resolve(12);
    await flushPromises();
    expect(wrapper.emitted('update:modelValue')[0]).toEqual([[12]]);
    expect(wrapper.text()).toContain('AUTOMATION.ATTACHMENT.LABEL_UPLOADED');
  });

  it('alerts when the upload fails', async () => {
    const wrapper = mountInput(vi.fn().mockRejectedValue(new Error('big')));
    await pick(wrapper);
    await flushPromises();
    expect(wrapper.classes()).toContain('failed');
    expect(wrapper.find('[data-icon="dismiss-circle"]').exists()).toBe(true);
    expect(wrapper.text()).toContain(
      'AUTOMATION.ATTACHMENT.LABEL_UPLOAD_FAILED'
    );
    expect(useAlert).toHaveBeenCalledWith('AUTOMATION.ATTACHMENT.UPLOAD_ERROR');
  });
});
