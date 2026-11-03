/**
 * OneTeam behaviour spec for the Captain "add document" dialog.
 *
 * Covers passing the assistant to the form, creating a document with a
 * success alert and closing, the API error message or its fallback,
 * cancelling, and passing the dialog's close on.
 */
import { mount, flushPromises } from '@vue/test-utils';
import CreateDocumentDialog from '../CreateDocumentDialog.vue';

const env = vi.hoisted(() => ({ dispatch: vi.fn(), alert: vi.fn(), log: [] }));

vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: env.dispatch }),
}));
vi.mock('dashboard/composables', () => ({ useAlert: env.alert }));

const Dialog = {
  name: 'Dialog',
  emits: ['close'],
  methods: { close: () => env.log.push('close') },
  template: '<div><slot /><slot name="footer" /></div>',
};
const DocumentForm = {
  name: 'DocumentForm',
  props: ['assistantId'],
  emits: ['submit', 'cancel'],
  template: '<form />',
};

const mountDialog = () =>
  mount(CreateDocumentDialog, {
    props: { assistantId: 4 },
    global: { stubs: { Dialog, DocumentForm } },
  });

describe('CreateDocumentDialog behaviour', () => {
  beforeEach(() => {
    env.log = [];
    vi.clearAllMocks();
  });

  it('creates a document and closes', async () => {
    const wrapper = mountDialog();
    const form = wrapper.findComponent(DocumentForm);
    expect(form.props('assistantId')).toBe(4);
    expect(wrapper.vm.dialogRef).toBeTruthy();
    env.dispatch.mockResolvedValueOnce();
    await form.vm.$emit('submit', { external_link: 'https://a.example' });
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('captainDocuments/create', {
      external_link: 'https://a.example',
    });
    expect(wrapper.emitted('createSuccess')).toHaveLength(1);
    expect(env.alert).toHaveBeenCalledWith(
      'CAPTAIN.DOCUMENTS.CREATE.SUCCESS_MESSAGE'
    );
    expect(env.log).toEqual(['close']);
  });

  it('shows the API error or a fallback', async () => {
    const wrapper = mountDialog();
    const form = wrapper.findComponent(DocumentForm);
    env.dispatch.mockRejectedValueOnce({
      response: { data: { message: 'Link already added' } },
    });
    await form.vm.$emit('submit', {});
    await flushPromises();
    expect(env.alert).toHaveBeenLastCalledWith('Link already added');

    // parseAPIErrorResponse returns the error itself when it has no API
    // message, so the fallback text only shows for an empty rejection.
    env.dispatch.mockRejectedValueOnce(null);
    await form.vm.$emit('submit', {});
    await flushPromises();
    expect(env.alert).toHaveBeenLastCalledWith(
      'CAPTAIN.DOCUMENTS.CREATE.ERROR_MESSAGE'
    );
    expect(wrapper.emitted('createSuccess')).toBeUndefined();
    expect(env.log).toEqual([]);
  });

  it('cancels and passes the close on', async () => {
    const wrapper = mountDialog();
    await wrapper.findComponent(DocumentForm).vm.$emit('cancel');
    expect(env.log).toEqual(['close']);
    await wrapper.findComponent(Dialog).vm.$emit('close');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
