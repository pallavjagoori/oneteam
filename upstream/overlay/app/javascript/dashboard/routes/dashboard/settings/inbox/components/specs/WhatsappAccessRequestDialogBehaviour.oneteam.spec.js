/**
 * OneTeam behaviour spec for the WhatsApp embedded signup access request
 * dialog.
 *
 * Covers opening the dialog, keeping submit disabled until a use case is
 * typed, sending the trimmed use case and closing, the loading state and
 * ignoring a second submit while one is in flight, and showing (then
 * clearing on reopen) the error when the request fails.
 */
import { mount, flushPromises } from '@vue/test-utils';
import WhatsappAccessRequestDialog from '../WhatsappAccessRequestDialog.vue';

const env = vi.hoisted(() => ({ dispatch: vi.fn(), log: [] }));

vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: env.dispatch }),
}));

const Dialog = {
  name: 'Dialog',
  props: { disableConfirmButton: Boolean, isLoading: Boolean },
  emits: ['confirm'],
  methods: {
    open: () => env.log.push('open'),
    close: () => env.log.push('close'),
  },
  template: '<div><slot /></div>',
};
const TextArea = {
  name: 'TextArea',
  props: ['modelValue', 'message', 'messageType', 'disabled'],
  emits: ['update:modelValue'],
  template: '<textarea />',
};

const mountDialog = () =>
  mount(WhatsappAccessRequestDialog, {
    global: { stubs: { Dialog, TextArea } },
  });

describe('WhatsappAccessRequestDialog behaviour', () => {
  beforeEach(() => {
    env.log = [];
    vi.clearAllMocks();
  });

  it('opens and needs a use case before submitting', async () => {
    const wrapper = mountDialog();
    wrapper.vm.open();
    expect(env.log).toEqual(['open']);
    const dialog = wrapper.findComponent(Dialog);
    expect(dialog.props('disableConfirmButton')).toBe(true);
    await wrapper.findComponent(TextArea).vm.$emit('update:modelValue', '   ');
    await dialog.vm.$emit('confirm');
    expect(env.dispatch).not.toHaveBeenCalled();
  });

  it('sends the trimmed use case and closes', async () => {
    let finish;
    env.dispatch.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    const wrapper = mountDialog();
    await wrapper
      .findComponent(TextArea)
      .vm.$emit('update:modelValue', '  Support chats  ');
    const dialog = wrapper.findComponent(Dialog);
    expect(dialog.props('disableConfirmButton')).toBe(false);
    await dialog.vm.$emit('confirm');
    expect(dialog.props('isLoading')).toBe(true);
    expect(wrapper.findComponent(TextArea).props('disabled')).toBe(true);
    await dialog.vm.$emit('confirm');
    expect(env.dispatch).toHaveBeenCalledTimes(1);
    expect(env.dispatch).toHaveBeenCalledWith(
      'accounts/requestWhatsappEmbeddedSignupAccess',
      'Support chats'
    );
    finish();
    await flushPromises();
    expect(env.log).toEqual(['close']);
    expect(dialog.props('isLoading')).toBe(false);
  });

  it('shows an error and clears it on reopen', async () => {
    env.dispatch.mockRejectedValueOnce(new Error('nope'));
    const wrapper = mountDialog();
    await wrapper
      .findComponent(TextArea)
      .vm.$emit('update:modelValue', 'Support');
    await wrapper.findComponent(Dialog).vm.$emit('confirm');
    await flushPromises();
    const area = wrapper.findComponent(TextArea);
    expect(area.props('message')).toBe(
      'INBOX_MGMT.ADD.WHATSAPP.EMBEDDED_SIGNUP.ACCESS_REQUEST.ERROR'
    );
    expect(area.props('messageType')).toBe('error');
    expect(env.log).toEqual([]);
    wrapper.vm.open();
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(TextArea).props('messageType')).toBe('info');
  });
});
