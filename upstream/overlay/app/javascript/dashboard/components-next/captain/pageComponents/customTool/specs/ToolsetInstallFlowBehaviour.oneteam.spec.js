/**
 * OneTeam behaviour spec for the toolset install-link flow on the
 * Captain tools page.
 *
 * Covers installing straight into the open assistant when there is only
 * one, picking another assistant when there are several, cancelling the
 * picker (finishing with the open assistant), the install dialog's
 * installed and close events, a failed assistant load, and leaving the
 * page while assistants are still loading.
 */
import { ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import ToolsetInstallFlow from '../ToolsetInstallFlow.vue';

const env = vi.hoisted(() => ({ log: [], dispatch: null, assistants: null }));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
  useMapGetter: () => env.assistants,
}));

const Dialog = {
  name: 'Dialog',
  props: ['disableConfirmButton'],
  emits: ['confirm', 'close'],
  methods: {
    open: () => env.log.push('picker open'),
    close: () => env.log.push('picker close'),
  },
  template: '<div><slot /></div>',
};
const ComboBox = {
  name: 'ComboBox',
  props: ['modelValue', 'options'],
  emits: ['update:modelValue'],
  template: '<div />',
};
const InstallManifestDialog = {
  name: 'InstallManifestDialog',
  props: ['assistantId'],
  emits: ['installed', 'close'],
  methods: { open: source => env.log.push(`install ${source}`) },
  template: '<div />',
};

const mountFlow = () =>
  mount(ToolsetInstallFlow, {
    props: { source: 'acme/tools/shop', assistantId: '4' },
    global: { stubs: { Dialog, ComboBox, InstallManifestDialog } },
  });

describe('ToolsetInstallFlow behaviour', () => {
  beforeEach(() => {
    env.log = [];
    env.dispatch = vi.fn().mockResolvedValue();
    env.assistants = ref([{ id: 4, name: 'Sales' }]);
    useAlert.mockClear();
  });

  it('installs into the only assistant straight away', async () => {
    const wrapper = mountFlow();
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('captainAssistants/get');
    expect(env.log).toEqual(['install acme/tools/shop']);
    const dialog = wrapper.findComponent(InstallManifestDialog);
    expect(dialog.props('assistantId')).toBe(4);
    await dialog.vm.$emit('installed');
    await dialog.vm.$emit('close');
    expect(wrapper.emitted('installed')).toEqual([[4]]);
    expect(wrapper.emitted('done')).toEqual([[4]]);
  });

  it('lets the agent pick an assistant when there are several', async () => {
    env.assistants.value.push({ id: 9, name: 'Support' });
    const wrapper = mountFlow();
    await flushPromises();
    expect(env.log).toEqual(['picker open']);
    const combo = wrapper.findComponent(ComboBox);
    expect(combo.props()).toEqual({
      modelValue: 4,
      options: [
        { value: 4, label: 'Sales' },
        { value: 9, label: 'Support' },
      ],
    });
    await combo.vm.$emit('update:modelValue', null);
    expect(wrapper.findComponent(Dialog).props('disableConfirmButton')).toBe(
      true
    );
    await combo.vm.$emit('update:modelValue', 9);
    await wrapper.findComponent(Dialog).vm.$emit('confirm');
    await flushPromises();
    expect(env.log).toEqual([
      'picker open',
      'picker close',
      'install acme/tools/shop',
    ]);
    expect(
      wrapper.findComponent(InstallManifestDialog).props('assistantId')
    ).toBe(9);
    await wrapper.findComponent(Dialog).vm.$emit('close');
    expect(wrapper.emitted('done')).toBeUndefined();
  });

  it('finishes with the open assistant when the picker is cancelled', async () => {
    env.assistants.value.push({ id: 9, name: 'Support' });
    const wrapper = mountFlow();
    await flushPromises();
    await wrapper.findComponent(Dialog).vm.$emit('close');
    expect(wrapper.emitted('done')).toEqual([[4]]);
  });

  it('alerts and finishes when assistants fail to load', async () => {
    env.dispatch.mockRejectedValueOnce(new Error('down'));
    const wrapper = mountFlow();
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'CAPTAIN.CUSTOM_TOOLS.INSTALL_LINK.LOAD_ERROR'
    );
    expect(wrapper.emitted('done')).toEqual([[4]]);
    expect(env.log).toEqual([]);
  });

  it('does nothing when the page is left while loading', async () => {
    let finish;
    env.dispatch.mockReturnValueOnce(
      new Promise((resolve, reject) => {
        finish = { resolve, reject };
      })
    );
    const left = mountFlow();
    left.unmount();
    finish.resolve();
    await flushPromises();
    expect(env.log).toEqual([]);

    env.dispatch.mockRejectedValueOnce(new Error('gone'));
    const failed = mountFlow();
    failed.unmount();
    await flushPromises();
    expect(useAlert).not.toHaveBeenCalled();
    expect(failed.emitted('done')).toBeUndefined();
  });
});
