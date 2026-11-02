/**
 * OneTeam behaviour spec for the create/edit Captain assistant dialog.
 *
 * Covers the create and edit titles, creating an assistant (emitting
 * created, alerting success and closing), updating an existing one,
 * the error alerts with and without a server message, cancelling, and
 * the close event.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import CreateAssistantDialog from '../CreateAssistantDialog.vue';

const dispatch = vi.fn();
const close = vi.fn();

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch }),
}));

const Dialog = {
  name: 'Dialog',
  props: ['title', 'description'],
  emits: ['close'],
  setup: () => ({ close }),
  template:
    '<div><h2>{{ title }}</h2><slot /><footer><slot name="footer" /></footer></div>',
};
const AssistantForm = {
  name: 'AssistantForm',
  props: ['mode', 'assistant'],
  emits: ['submit', 'cancel'],
  template: '<form />',
};

const mountDialog = props =>
  mount(CreateAssistantDialog, {
    props,
    global: { stubs: { Dialog, AssistantForm } },
  });

const submit = async (wrapper, details) => {
  await wrapper.findComponent(AssistantForm).vm.$emit('submit', details);
  await flushPromises();
};

describe('CreateAssistantDialog behaviour', () => {
  it('creates an assistant', async () => {
    dispatch.mockResolvedValue({ id: 5 });
    const wrapper = mountDialog();
    expect(wrapper.find('h2').text()).toBe('CAPTAIN.ASSISTANTS.CREATE.TITLE');
    expect(wrapper.findComponent(AssistantForm).props('mode')).toBe('create');
    expect(wrapper.vm.dialogRef).toBeTruthy();
    await submit(wrapper, { name: 'Sky' });
    expect(dispatch).toHaveBeenCalledWith('captainAssistants/create', {
      name: 'Sky',
    });
    expect(wrapper.emitted('created')[0]).toEqual([{ id: 5 }]);
    expect(useAlert).toHaveBeenCalledWith(
      'CAPTAIN.ASSISTANTS.CREATE.SUCCESS_MESSAGE'
    );
    expect(close).toHaveBeenCalled();
  });

  it('alerts when creating fails, with or without a message', async () => {
    dispatch.mockRejectedValueOnce(new Error('Name taken'));
    const wrapper = mountDialog({ type: 'create' });
    await submit(wrapper, {});
    expect(useAlert).toHaveBeenCalledWith('Name taken');
    expect(wrapper.emitted('created')).toBeUndefined();

    dispatch.mockRejectedValueOnce({});
    await submit(wrapper, {});
    expect(useAlert).toHaveBeenCalledWith(
      'CAPTAIN.ASSISTANTS.CREATE.ERROR_MESSAGE'
    );
  });

  it('updates an existing assistant', async () => {
    dispatch.mockResolvedValue({});
    const wrapper = mountDialog({
      type: 'edit',
      selectedAssistant: { id: 9, name: 'Old' },
    });
    expect(wrapper.find('h2').text()).toBe('CAPTAIN.ASSISTANTS.EDIT.TITLE');
    expect(wrapper.findComponent(AssistantForm).props('assistant')).toEqual({
      id: 9,
      name: 'Old',
    });
    await submit(wrapper, { name: 'New' });
    expect(dispatch).toHaveBeenCalledWith('captainAssistants/update', {
      id: 9,
      name: 'New',
    });
    expect(useAlert).toHaveBeenCalledWith(
      'CAPTAIN.ASSISTANTS.EDIT.SUCCESS_MESSAGE'
    );
  });

  it('alerts when updating fails, with or without a message', async () => {
    const wrapper = mountDialog({ type: 'edit', selectedAssistant: { id: 9 } });
    dispatch.mockRejectedValueOnce(new Error('Locked'));
    await submit(wrapper, {});
    expect(useAlert).toHaveBeenCalledWith('Locked');
    dispatch.mockRejectedValueOnce(null);
    await submit(wrapper, {});
    expect(useAlert).toHaveBeenCalledWith(
      'CAPTAIN.ASSISTANTS.EDIT.ERROR_MESSAGE'
    );
    expect(close).not.toHaveBeenCalled();
  });

  it('cancels and forwards close', async () => {
    const wrapper = mountDialog();
    await wrapper.findComponent(AssistantForm).vm.$emit('cancel');
    expect(close).toHaveBeenCalled();
    await wrapper.findComponent(Dialog).vm.$emit('close');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
