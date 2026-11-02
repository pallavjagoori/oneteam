/**
 * OneTeam behaviour spec for the dialog that reports a wrong Captain
 * reply.
 *
 * Covers opening with a clean form, the reason options, requiring a
 * reason, sending the report (trimmed description, or none), the loading
 * state, the success and error alerts, and closing.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import MessageReportsAPI from 'dashboard/api/captain/messageReports';
import ReportCaptainMessageDialog from '../ReportCaptainMessageDialog.vue';

const env = vi.hoisted(() => ({ log: [] }));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/api/captain/messageReports', () => ({
  default: { create: vi.fn() },
}));

const Dialog = {
  name: 'Dialog',
  props: ['isLoading', 'disableConfirmButton'],
  emits: ['confirm'],
  methods: {
    open: () => env.log.push('open'),
    close: () => env.log.push('close'),
  },
  template: '<div><slot /></div>',
};
const field = name => ({
  name,
  props: ['modelValue', 'options'],
  emits: ['update:modelValue'],
  template: '<div />',
});
const Select = field('Select');
const TextArea = field('TextArea');

const mountDialog = () =>
  mount(ReportCaptainMessageDialog, {
    props: { messageId: 12 },
    global: { stubs: { Dialog, Select, TextArea } },
  });

const PREFIX = 'CONVERSATION.CONTEXT_MENU.REPORT_MESSAGE';

describe('ReportCaptainMessageDialog behaviour', () => {
  beforeEach(() => {
    env.log = [];
    useAlert.mockClear();
    MessageReportsAPI.create.mockReset();
    MessageReportsAPI.create.mockResolvedValue({});
  });

  it('requires a reason and sends the report', async () => {
    const wrapper = mountDialog();
    const dialog = wrapper.findComponent(Dialog);
    expect(wrapper.findComponent(Select).props('options')).toHaveLength(5);
    expect(wrapper.findComponent(Select).props('options')[0]).toEqual({
      value: 'incorrect_information',
      label: `${PREFIX}.REASONS.incorrect_information`,
    });
    expect(dialog.props('disableConfirmButton')).toBe(true);
    await dialog.vm.$emit('confirm');
    expect(MessageReportsAPI.create).not.toHaveBeenCalled();

    await wrapper.findComponent(Select).vm.$emit('update:modelValue', 'other');
    await wrapper
      .findComponent(TextArea)
      .vm.$emit('update:modelValue', '  Wrong price  ');
    expect(dialog.props('disableConfirmButton')).toBe(false);
    let finish;
    MessageReportsAPI.create.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    await dialog.vm.$emit('confirm');
    expect(dialog.props('isLoading')).toBe(true);
    expect(MessageReportsAPI.create).toHaveBeenCalledWith({
      message_id: 12,
      report_reason: 'other',
      description: 'Wrong price',
    });
    finish();
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(`${PREFIX}.SUCCESS`);
    expect(env.log).toEqual(['close']);
    expect(dialog.props('isLoading')).toBe(false);
  });

  it('opens clean, sends no empty description and reports errors', async () => {
    const wrapper = mountDialog();
    await wrapper.findComponent(Select).vm.$emit('update:modelValue', 'other');
    await wrapper.findComponent(TextArea).vm.$emit('update:modelValue', 'x');
    wrapper.vm.open();
    await wrapper.vm.$nextTick();
    expect(env.log).toEqual(['open']);
    expect(wrapper.findComponent(Select).props('modelValue')).toBe('');
    expect(wrapper.findComponent(TextArea).props('modelValue')).toBe('');

    await wrapper
      .findComponent(Select)
      .vm.$emit('update:modelValue', 'outdated_information');
    MessageReportsAPI.create.mockRejectedValueOnce(new Error('down'));
    await wrapper.findComponent(Dialog).vm.$emit('confirm');
    await flushPromises();
    expect(MessageReportsAPI.create).toHaveBeenCalledWith(
      expect.objectContaining({ description: null })
    );
    expect(useAlert).toHaveBeenCalledWith(`${PREFIX}.ERROR`);
    expect(env.log).toEqual(['open']);
    wrapper.vm.close();
    expect(env.log).toEqual(['open', 'close']);
  });
});
