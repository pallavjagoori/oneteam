/**
 * OneTeam behaviour spec for the create/edit Captain FAQ response dialog.
 *
 * Covers the create and edit titles, passing the response to the form,
 * creating or updating with the assistant from the URL (alert and
 * close), the server's error message or the fallback, cancelling, and
 * telling the parent when the dialog closes.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import CreateResponseDialog from '../CreateResponseDialog.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: env.dispatch }),
}));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { assistantId: '6' } }),
}));

const Dialog = {
  name: 'Dialog',
  props: ['title', 'description'],
  emits: ['close'],
  methods: {
    close() {
      env.log.push('close');
    },
  },
  template:
    '<div><h3>{{ title }}</h3><slot /><footer><slot name="footer" /></footer></div>',
};
const ResponseForm = {
  name: 'ResponseForm',
  props: ['mode', 'response'],
  emits: ['submit', 'cancel'],
  template: '<form />',
};

const mountDialog = props =>
  mount(CreateResponseDialog, {
    props,
    global: { stubs: { Dialog, ResponseForm } },
  });

const form = wrapper => wrapper.findComponent(ResponseForm);
const submit = async (wrapper, payload) => {
  await form(wrapper).vm.$emit('submit', payload);
  await flushPromises();
};

describe('CreateResponseDialog behaviour', () => {
  beforeEach(() => {
    env.log = [];
    env.dispatch = vi.fn().mockResolvedValue();
  });

  it('creates a response for the current assistant', async () => {
    const wrapper = mountDialog();
    expect(wrapper.find('h3').text()).toBe('CAPTAIN.RESPONSES.CREATE.TITLE');
    expect(form(wrapper).props()).toEqual({ mode: 'create', response: {} });
    await submit(wrapper, { question: 'Q', answer: 'A' });
    expect(env.dispatch).toHaveBeenCalledWith('captainResponses/create', {
      question: 'Q',
      answer: 'A',
      assistant_id: '6',
    });
    expect(useAlert).toHaveBeenCalledWith(
      'CAPTAIN.RESPONSES.CREATE.SUCCESS_MESSAGE'
    );
    expect(env.log).toEqual(['close']);
    expect(wrapper.vm.dialogRef).toBeTruthy();
  });

  it('updates an existing response', async () => {
    const wrapper = mountDialog({
      type: 'edit',
      selectedResponse: { id: 4, question: 'Q' },
    });
    expect(wrapper.find('h3').text()).toBe('CAPTAIN.RESPONSES.EDIT.TITLE');
    await submit(wrapper, { question: 'New' });
    expect(env.dispatch).toHaveBeenCalledWith('captainResponses/update', {
      id: 4,
      question: 'New',
      assistant_id: '6',
    });
    expect(useAlert).toHaveBeenCalledWith(
      'CAPTAIN.RESPONSES.EDIT.SUCCESS_MESSAGE'
    );
  });

  it('reports failures and keeps the dialog open', async () => {
    const wrapper = mountDialog();
    env.dispatch.mockRejectedValueOnce({ response: { message: 'Duplicate' } });
    await submit(wrapper, {});
    expect(useAlert).toHaveBeenCalledWith('Duplicate');
    env.dispatch.mockRejectedValueOnce(undefined);
    await submit(wrapper, {});
    expect(useAlert).toHaveBeenCalledWith(
      'CAPTAIN.RESPONSES.CREATE.ERROR_MESSAGE'
    );
    expect(env.log).toEqual([]);
  });

  it('cancels and reports closing', async () => {
    const wrapper = mountDialog();
    await form(wrapper).vm.$emit('cancel');
    expect(env.log).toEqual(['close']);
    await wrapper.findComponent(Dialog).vm.$emit('close');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
