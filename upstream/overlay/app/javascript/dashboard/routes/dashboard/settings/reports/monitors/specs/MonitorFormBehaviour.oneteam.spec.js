/**
 * OneTeam behaviour spec for the monitor create dialog.
 *
 * Covers listing the preview's matching conversations once the preview
 * finishes, and ignoring a failed create that settles after the dialog
 * was reopened for another monitor.
 */
import { ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import MonitorsAPI from 'dashboard/api/monitors';
import MonitorForm from '../MonitorForm.vue';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: key => key, te: () => false }),
}));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({ accountId: ref(1) }),
}));
vi.mock('dashboard/api/monitors', () => ({
  default: { create: vi.fn(), preview: vi.fn(), previewStatus: vi.fn() },
}));

const Dialog = {
  name: 'Dialog',
  methods: { open() {}, close() {} },
  template: '<div><slot /></div>',
};
const ReportDrilldownCard = {
  name: 'ReportDrilldownCard',
  props: { record: { type: Object, default: () => ({}) } },
  template: '<div class="record" />',
};

const mountForm = () =>
  mount(MonitorForm, {
    global: {
      stubs: {
        Dialog,
        ReportDrilldownCard,
        Input: true,
        TextArea: true,
        Button: true,
        MonitorIconPicker: true,
      },
    },
  });

describe('MonitorForm behaviour', () => {
  it('lists the preview matches once the preview finishes', async () => {
    MonitorsAPI.preview.mockResolvedValue({
      data: { token: 'tok', retry_after: 0 },
    });
    MonitorsAPI.previewStatus.mockResolvedValue({
      data: {
        status: 'done',
        payload: [{ conversation: { id: 11 } }, { conversation: { id: 12 } }],
        sampled: 2,
        excluded: 0,
      },
    });
    const wrapper = mountForm();
    const state = wrapper.vm.$.setupState;
    wrapper.vm.open({ name: 'Refunds', condition: 'asks for a refund' });
    // Let the condition watcher reset the preview before starting one.
    await flushPromises();
    await state.previewMatches();
    await state.refreshPreview();
    await flushPromises();
    expect(
      wrapper
        .findAllComponents(ReportDrilldownCard)
        .map(card => card.props('record').conversation.id)
    ).toEqual([11, 12]);
    wrapper.unmount();
  });

  it('ignores a failed create that settles after the dialog reopened', async () => {
    let reject;
    MonitorsAPI.create.mockReturnValue(
      new Promise((_, rej) => {
        reject = rej;
      })
    );
    const wrapper = mountForm();
    const state = wrapper.vm.$.setupState;
    wrapper.vm.open({ name: 'Refunds', condition: 'asks for a refund' });
    const pending = state.create();
    wrapper.vm.open({ name: 'Churn', condition: 'mentions cancelling' });
    reject({ response: { data: { error: 'invalid' } } });
    await pending;
    expect(state.error).toBe('');
    expect(state.isSaving).toBe(false);
    wrapper.unmount();
  });
});
