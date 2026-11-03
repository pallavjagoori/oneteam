/**
 * OneTeam behaviour spec for the add SLA modal.
 *
 * Covers creating the SLA (success alert and close), the API or default
 * error alert, and closing from the form.
 */
import { mount, flushPromises } from '@vue/test-utils';
import AddSLA from '../AddSLA.vue';
import { useAlert } from 'dashboard/composables';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const SlaForm = {
  name: 'SlaForm',
  emits: ['submitSla', 'close'],
  template: '<form />',
};

describe('AddSLA behaviour', () => {
  it('creates SLAs and alerts errors', async () => {
    const dispatch = vi
      .fn()
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error('Taken'))
      .mockRejectedValueOnce({});
    const wrapper = mount(AddSLA, {
      global: {
        mocks: { $store: { dispatch } },
        stubs: { SlaForm, WootModalHeader: true },
      },
    });
    const form = wrapper.findComponent(SlaForm);
    form.vm.$emit('submitSla', { name: 'Gold' });
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith('sla/create', { name: 'Gold' });
    expect(useAlert).toHaveBeenCalledWith('SLA.ADD.API.SUCCESS_MESSAGE');
    expect(wrapper.emitted('close')).toHaveLength(1);

    form.vm.$emit('submitSla', {});
    form.vm.$emit('submitSla', {});
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('Taken');
    expect(useAlert).toHaveBeenCalledWith('SLA.ADD.API.ERROR_MESSAGE');
    expect(wrapper.emitted('close')).toHaveLength(1);

    form.vm.$emit('close');
    expect(wrapper.emitted('close')).toHaveLength(2);
  });
});
