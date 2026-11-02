/**
 * OneTeam behaviour spec for the Captain custom tool side panel in its
 * create, edit and view modes.
 *
 * Covers the titles and buttons per mode, the saving state, creating a
 * tool for the open assistant (created event, alert, close), updating
 * one, API error messages with a generic fallback, cancelling, and the
 * close event once the panel has left.
 */
import { reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import CreateCustomToolDialog from '../CreateCustomToolDialog.vue';

const env = vi.hoisted(() => ({ log: [] }));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { assistantId: '3' } }),
}));
vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return {
    useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
    useMapGetter: () => computed(() => env.uiFlags),
  };
});

const SidePanel = {
  name: 'SidePanel',
  props: ['title', 'description'],
  emits: ['afterLeave'],
  methods: { close: () => env.log.push('close') },
  template: '<div><slot /><footer><slot name="footer" /></footer></div>',
};
const Button = {
  name: 'Button',
  props: ['label', 'isLoading', 'disabled', 'type'],
  emits: ['click'],
  template:
    '<button :type="type" @click="$emit(\'click\')">{{ label }}</button>',
};
const CustomToolForm = {
  name: 'CustomToolForm',
  props: ['mode', 'tool'],
  emits: ['submit'],
  template: '<form />',
};
const CustomToolDetails = {
  name: 'CustomToolDetails',
  props: ['tool'],
  template: '<div class="details" />',
};

const tool = { id: 8, title: 'Order lookup' };

const mountPanel = props =>
  mount(CreateCustomToolDialog, {
    props,
    global: {
      stubs: { SidePanel, Button, CustomToolForm, CustomToolDetails },
    },
  });

const labels = wrapper =>
  wrapper.findAllComponents(Button).map(b => b.props('label'));

describe('CreateCustomToolDialog behaviour', () => {
  beforeEach(() => {
    env.log = [];
    env.dispatch = vi.fn().mockResolvedValue();
    env.uiFlags = reactive({ creatingItem: false, updatingItem: false });
    useAlert.mockClear();
  });

  it('creates a tool for the open assistant', async () => {
    env.uiFlags.creatingItem = true;
    const wrapper = mountPanel();
    expect(wrapper.findComponent(SidePanel).props()).toEqual({
      title: 'CAPTAIN.CUSTOM_TOOLS.CREATE.TITLE',
      description: 'CAPTAIN.CUSTOM_TOOLS.FORM_DESCRIPTION',
    });
    expect(labels(wrapper)).toEqual([
      'CAPTAIN.FORM.CANCEL',
      'CAPTAIN.FORM.CREATE',
    ]);
    expect(wrapper.findAllComponents(Button)[1].props('isLoading')).toBe(true);
    expect(wrapper.findComponent(CustomToolForm).props()).toEqual({
      mode: 'create',
      tool: {},
    });
    expect(wrapper.vm.dialogRef).toBeTruthy();

    await wrapper
      .findComponent(CustomToolForm)
      .vm.$emit('submit', { title: 'X' });
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('captainCustomTools/create', {
      title: 'X',
      assistantId: '3',
    });
    expect(wrapper.emitted('created')).toHaveLength(1);
    expect(useAlert).toHaveBeenCalledWith(
      'CAPTAIN.CUSTOM_TOOLS.CREATE.SUCCESS_MESSAGE'
    );
    expect(env.log).toEqual(['close']);
  });

  it('updates a tool and reports errors', async () => {
    env.uiFlags.updatingItem = true;
    const wrapper = mountPanel({ type: 'edit', selectedTool: tool });
    expect(labels(wrapper)[1]).toBe('CAPTAIN.FORM.EDIT');
    expect(wrapper.findAllComponents(Button)[1].props('disabled')).toBe(true);
    const form = wrapper.findComponent(CustomToolForm);

    await form.vm.$emit('submit', { title: 'Y' });
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('captainCustomTools/update', {
      id: 8,
      title: 'Y',
      assistantId: '3',
    });
    expect(useAlert).toHaveBeenLastCalledWith(
      'CAPTAIN.CUSTOM_TOOLS.EDIT.SUCCESS_MESSAGE'
    );
    expect(wrapper.emitted('created')).toBeUndefined();

    env.dispatch.mockRejectedValueOnce({
      response: { data: { message: 'Bad URL' } },
    });
    await form.vm.$emit('submit', {});
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('Bad URL');

    env.dispatch.mockRejectedValueOnce('');
    await form.vm.$emit('submit', {});
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'CAPTAIN.CUSTOM_TOOLS.EDIT.ERROR_MESSAGE'
    );
    expect(env.log).toEqual(['close']);
  });

  it('shows details in view mode, cancels and closes', async () => {
    const wrapper = mountPanel({ type: 'view', selectedTool: tool });
    expect(wrapper.findComponent(SidePanel).props()).toEqual({
      title: 'Order lookup',
      description: '',
    });
    expect(wrapper.findComponent(CustomToolDetails).props('tool')).toEqual(
      tool
    );
    expect(labels(wrapper)).toEqual(['GENERAL.CLOSE']);
    await wrapper.findComponent(Button).trigger('click');
    expect(env.log).toEqual(['close']);
    await wrapper.findComponent(SidePanel).vm.$emit('afterLeave');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
