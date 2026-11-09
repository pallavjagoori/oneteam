/**
 * OneTeam behaviour spec for the install manifest dialog.
 *
 * Covers the preview with boolean, select and text fields, required
 * value checks, install, reinstall and update labels, preview and
 * install failures, stale installs after a reopen, and closing when
 * the assistant changes.
 */
import { mount, flushPromises } from '@vue/test-utils';
import InstallManifestDialog from '../InstallManifestDialog.vue';
import ToolsManifestAPI from 'dashboard/api/captain/toolsManifest';
import { useAlert } from 'dashboard/composables';

const env = vi.hoisted(() => ({ open: vi.fn(), close: vi.fn() }));

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/store/utils/api', () => ({
  parseAPIErrorResponse: error => error.apiMessage,
}));
vi.mock('dashboard/composables/useAbortableRequest', () => ({
  useAbortableRequest: () => ({
    run: request => request('signal'),
    abort: vi.fn(),
  }),
}));
vi.mock('dashboard/api/captain/toolsManifest', () => ({
  default: { preview: vi.fn(), install: vi.fn() },
}));

const preview = extra => ({
  data: {
    name: 'Shopify',
    description: 'Orders',
    version: '1.2',
    revision: 'abcdef123456',
    repository: 'acme/tools',
    path: 'shopify',
    tools: [{ id: 1, title: 'Lookup' }],
    fields: [
      { section: 'inputs', name: 'debug', type: 'boolean', label: 'Debug' },
      { section: 'inputs', name: 'region', type: 'select', label: 'Region' },
      {
        section: 'inputs',
        name: 'tier',
        type: 'select',
        label: 'Tier',
        options: ['a'],
        placeholder: 'Pick',
      },
      {
        section: 'secrets',
        name: 'token',
        type: 'password',
        label: 'Token',
        required: true,
      },
      { section: 'inputs', name: 'shop', type: 'string', label: 'Shop' },
    ],
    ...extra,
  },
});

/**
 * Mounts the dialog.
 *
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountDialog = () =>
  mount(InstallManifestDialog, {
    props: { assistantId: 3 },
    global: {
      stubs: {
        Dialog: {
          name: 'Dialog',
          emits: ['close'],
          methods: { open: () => env.open(), close: () => env.close() },
          template: '<div><slot /><slot name="footer" /></div>',
        },
        Spinner: { template: '<i class="spinner" />' },
        Switch: { props: ['modelValue'], template: '<i class="switch" />' },
        ComboBox: {
          name: 'ComboBox',
          props: ['options', 'placeholder'],
          template: '<i />',
        },
        Input: {
          name: 'Input',
          props: ['modelValue', 'type'],
          emits: ['update:modelValue'],
          template: '<i />',
        },
        Button: {
          props: ['label', 'disabled'],
          emits: ['click'],
          template:
            '<button :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
        },
      },
    },
  });

/**
 * Finds the install button.
 *
 * @param {import('@vue/test-utils').VueWrapper} wrapper mounted dialog
 * @returns {import('@vue/test-utils').DOMWrapper}
 */
const installButton = wrapper => wrapper.findAll('button')[1];

describe('InstallManifestDialog behaviour', () => {
  it('previews fields, requires values and installs', async () => {
    ToolsManifestAPI.preview.mockResolvedValue(preview());
    ToolsManifestAPI.install.mockResolvedValue({});
    const wrapper = mountDialog();
    expect(wrapper.find('.spinner').exists()).toBe(true);
    wrapper.vm.open('Acme/Tools/shopify');
    await flushPromises();
    expect(ToolsManifestAPI.preview).toHaveBeenCalledWith(
      { assistantId: 3, source: 'Acme/Tools/shopify' },
      { signal: 'signal' }
    );
    expect(wrapper.text()).toContain('acme/tools/shopify');
    expect(wrapper.findAll('.switch')).toHaveLength(1);
    const combos = wrapper.findAllComponents({ name: 'ComboBox' });
    expect(combos[0].props()).toEqual({ options: [], placeholder: '' });
    expect(combos[1].props('options')).toEqual([{ value: 'a', label: 'a' }]);
    expect(installButton(wrapper).text()).toBe(
      'CAPTAIN.CUSTOM_TOOLS.INSTALL_MANIFEST.INSTALL'
    );
    expect(installButton(wrapper).attributes('disabled')).toBeDefined();
    const token = wrapper.findComponent({ name: 'Input' });
    expect(token.props('type')).toBe('password');
    expect(wrapper.findAllComponents({ name: 'Input' })[1].props('type')).toBe(
      'text'
    );
    token.vm.$emit('update:modelValue', 'secret');
    await wrapper.vm.$nextTick();
    await installButton(wrapper).trigger('click');
    await flushPromises();
    expect(ToolsManifestAPI.install).toHaveBeenCalledWith({
      assistantId: 3,
      source: 'Acme/Tools/shopify',
      revision: 'abcdef123456',
      configuration: expect.objectContaining({
        secrets: expect.objectContaining({ token: 'secret' }),
      }),
    });
    expect(wrapper.emitted('installed')).toHaveLength(1);
    expect(env.close).toHaveBeenCalled();
  });

  it.each([
    [
      { installed_revision: 'abcdef123456' },
      'CAPTAIN.CUSTOM_TOOLS.INSTALL_MANIFEST.REINSTALL',
      'REINSTALL_NOTE',
    ],
    [
      { installed_revision: 'old' },
      'CAPTAIN.CUSTOM_TOOLS.INSTALL_MANIFEST.UPDATE',
      'UPDATE_NOTE',
    ],
    [
      { installed_revision: 'abcdef123456', up_to_date: true },
      'CAPTAIN.CUSTOM_TOOLS.INSTALL_MANIFEST.ALREADY_INSTALLED',
      null,
    ],
  ])('labels install state %o', async (extra, label, note) => {
    ToolsManifestAPI.preview.mockResolvedValue(preview(extra));
    const wrapper = mountDialog();
    wrapper.vm.open('acme/tools/shopify');
    await flushPromises();
    expect(installButton(wrapper).text()).toBe(label);
    if (note) expect(wrapper.text()).toContain(note);
    else expect(wrapper.find('.switch').exists()).toBe(false);
  });

  it.each([
    [{ apiMessage: 'Not found' }, 'Not found'],
    [{}, 'CAPTAIN.CUSTOM_TOOLS.INSTALL_MANIFEST.PREVIEW_ERROR'],
  ])('alerts and closes when the preview fails', async (error, message) => {
    ToolsManifestAPI.preview.mockRejectedValue(error);
    const wrapper = mountDialog();
    wrapper.vm.open('x');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(message);
    expect(env.close).toHaveBeenCalled();
  });

  it('skips a missing preview response', async () => {
    ToolsManifestAPI.preview.mockResolvedValue(undefined);
    const wrapper = mountDialog();
    wrapper.vm.open('x');
    await flushPromises();
    expect(wrapper.find('.spinner').exists()).toBe(true);
  });

  it.each([
    [{ apiMessage: 'Conflict' }, 'Conflict'],
    [{}, 'CAPTAIN.CUSTOM_TOOLS.INSTALL_MANIFEST.ERROR_MESSAGE'],
  ])('alerts when installing fails', async (error, message) => {
    ToolsManifestAPI.preview.mockResolvedValue(preview({ fields: [] }));
    ToolsManifestAPI.install.mockRejectedValue(error);
    const wrapper = mountDialog();
    wrapper.vm.open('x');
    await flushPromises();
    await installButton(wrapper).trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(message);
    expect(wrapper.emitted('installed')).toBeUndefined();
  });

  it('ignores installs that finish after the dialog closed', async () => {
    ToolsManifestAPI.preview.mockResolvedValue(preview({ fields: [] }));
    let settle;
    ToolsManifestAPI.install.mockImplementation(
      () =>
        new Promise((resolve, reject) => {
          settle = { resolve, reject };
        })
    );
    const wrapper = mountDialog();
    wrapper.vm.open('x');
    await flushPromises();
    await installButton(wrapper).trigger('click');
    wrapper.findComponent({ name: 'Dialog' }).vm.$emit('close');
    expect(wrapper.emitted('close')).toHaveLength(1);
    settle.resolve({});
    await flushPromises();
    expect(wrapper.emitted('installed')).toBeUndefined();
    wrapper.vm.open('x');
    await flushPromises();
    await installButton(wrapper).trigger('click');
    await wrapper.setProps({ assistantId: 4 });
    settle.reject({ apiMessage: 'late' });
    await flushPromises();
    expect(useAlert).not.toHaveBeenCalledWith('late');
    expect(env.close).toHaveBeenCalled();
  });
});
