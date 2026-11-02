/**
 * OneTeam behaviour spec for the new data import dialog.
 *
 * Covers opening and closing with the show prop (clearing credentials),
 * the Intercom and Freshdesk wording, validating the key on blur
 * (missing credentials, success, server and fallback errors, stale
 * responses), re-validating when data types change, the active-import
 * warning, and creating the import with the default or typed name.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import DataImportsAPI from 'dashboard/api/dataImports';
import NewImportDialog from '../NewImportDialog.vue';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/api/dataImports', () => ({
  default: { validateSource: vi.fn(), create: vi.fn() },
}));

const open = vi.fn();
const close = vi.fn();
const Dialog = {
  name: 'Dialog',
  props: ['disableConfirmButton', 'isLoading'],
  emits: ['confirm', 'close'],
  setup: () => ({ open, close }),
  template: '<div><slot /></div>',
};
const Select = {
  name: 'Select',
  props: ['modelValue', 'options'],
  emits: ['update:modelValue'],
  template: '<select />',
};
const Input = {
  name: 'Input',
  props: ['modelValue', 'label', 'placeholder', 'message', 'messageType'],
  emits: ['update:modelValue', 'blur'],
  template: '<input />',
};
const Checkbox = {
  name: 'Checkbox',
  props: ['modelValue'],
  emits: ['change'],
  template: '<i class="check" />',
};

const mountDialog = (props = {}) =>
  mount(NewImportDialog, {
    props,
    global: { stubs: { Dialog, Select, Input, Checkbox } },
  });

const inputs = wrapper => wrapper.findAllComponents(Input);
const tokenInput = wrapper => inputs(wrapper).at(-1);
const dialog = wrapper => wrapper.findComponent(Dialog);
const setToken = async (wrapper, value) => {
  await tokenInput(wrapper).vm.$emit('update:modelValue', value);
};

describe('NewImportDialog behaviour', () => {
  it('opens and closes with the show prop', async () => {
    const wrapper = mountDialog();
    await wrapper.setProps({ show: true });
    expect(open).toHaveBeenCalled();
    await setToken(wrapper, 'abc');
    await wrapper.setProps({ show: false });
    expect(close).toHaveBeenCalled();
    expect(tokenInput(wrapper).props('modelValue')).toBe('');
    await dialog(wrapper).vm.$emit('close');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('switches wording and fields for Freshdesk', async () => {
    const wrapper = mountDialog();
    expect(wrapper.findComponent(Select).props('options')).toEqual([
      { value: 'intercom', label: 'Intercom' },
      { value: 'freshdesk', label: 'Freshdesk' },
    ]);
    expect(inputs(wrapper)).toHaveLength(2);
    expect(inputs(wrapper)[0].props('modelValue')).toBe(
      'DATA_IMPORTS.DEFAULT_IMPORT_NAMES.INTERCOM'
    );
    expect(tokenInput(wrapper).props('label')).toBe(
      'DATA_IMPORTS.DRAWER.INTERCOM_ACCESS_KEY'
    );

    await wrapper
      .findComponent(Select)
      .vm.$emit('update:modelValue', 'freshdesk');
    expect(inputs(wrapper)).toHaveLength(3);
    expect(inputs(wrapper)[0].props('modelValue')).toBe(
      'DATA_IMPORTS.DEFAULT_IMPORT_NAMES.FRESHDESK'
    );
    expect(tokenInput(wrapper).props()).toMatchObject({
      label: 'DATA_IMPORTS.DRAWER.FRESHDESK_API_KEY',
      placeholder: 'DATA_IMPORTS.DRAWER.FRESHDESK_API_KEY_PLACEHOLDER',
    });

    await wrapper
      .findComponent(Select)
      .vm.$emit('update:modelValue', 'zendesk');
    expect(tokenInput(wrapper).props('placeholder')).toBe(
      'DATA_IMPORTS.DRAWER.INTERCOM_ACCESS_KEY_PLACEHOLDER'
    );
    expect(inputs(wrapper)).toHaveLength(2);
  });

  it('validates the key on blur', async () => {
    const wrapper = mountDialog();
    await tokenInput(wrapper).vm.$emit('blur');
    expect(DataImportsAPI.validateSource).not.toHaveBeenCalled();

    let resolve;
    DataImportsAPI.validateSource.mockReturnValueOnce(
      new Promise(done => {
        resolve = done;
      })
    );
    await setToken(wrapper, ' key ');
    await tokenInput(wrapper).vm.$emit('blur');
    expect(DataImportsAPI.validateSource).toHaveBeenCalledWith({
      source_provider: 'intercom',
      access_token: 'key',
      import_types: ['contacts', 'conversations'],
    });
    expect(tokenInput(wrapper).props('message')).toBe(
      'DATA_IMPORTS.DRAWER.VALIDATING'
    );
    expect(dialog(wrapper).props('isLoading')).toBe(true);
    resolve();
    await flushPromises();
    expect(tokenInput(wrapper).props()).toMatchObject({
      message: 'DATA_IMPORTS.DRAWER.VALID_KEY',
      messageType: 'success',
    });
    expect(dialog(wrapper).props('disableConfirmButton')).toBe(false);

    DataImportsAPI.validateSource.mockRejectedValueOnce({
      response: { data: { message: 'Bad key' } },
    });
    await tokenInput(wrapper).vm.$emit('blur');
    await flushPromises();
    expect(tokenInput(wrapper).props()).toMatchObject({
      message: 'Bad key',
      messageType: 'error',
    });

    DataImportsAPI.validateSource.mockRejectedValueOnce(null);
    await tokenInput(wrapper).vm.$emit('blur');
    await flushPromises();
    expect(tokenInput(wrapper).props('message')).toBe(
      'DATA_IMPORTS.DRAWER.INVALID_KEY'
    );
  });

  it('ignores stale validation results', async () => {
    const wrapper = mountDialog();
    await setToken(wrapper, 'one');
    let resolve;
    let reject;
    DataImportsAPI.validateSource
      .mockReturnValueOnce(
        new Promise(done => {
          resolve = done;
        })
      )
      .mockReturnValueOnce(
        new Promise((_, fail) => {
          reject = fail;
        })
      );
    await tokenInput(wrapper).vm.$emit('blur');
    await setToken(wrapper, 'two');
    resolve();
    await flushPromises();
    expect(tokenInput(wrapper).props('messageType')).toBe('info');

    await tokenInput(wrapper).vm.$emit('blur');
    await setToken(wrapper, 'three');
    reject(new Error('late'));
    await flushPromises();
    expect(tokenInput(wrapper).props('messageType')).toBe('info');
  });

  it('needs a Freshdesk domain and re-validates on type changes', async () => {
    DataImportsAPI.validateSource.mockResolvedValue({});
    const wrapper = mountDialog();
    await wrapper
      .findComponent(Select)
      .vm.$emit('update:modelValue', 'freshdesk');
    await setToken(wrapper, 'key');
    await tokenInput(wrapper).vm.$emit('blur');
    expect(DataImportsAPI.validateSource).not.toHaveBeenCalled();

    await inputs(wrapper)[1].vm.$emit('update:modelValue', ' acme ');
    await inputs(wrapper)[1].vm.$emit('blur');
    expect(DataImportsAPI.validateSource).toHaveBeenLastCalledWith(
      expect.objectContaining({ domain: 'acme' })
    );

    const checks = wrapper.findAllComponents(Checkbox);
    await checks[0].vm.$emit('change');
    await flushPromises();
    expect(DataImportsAPI.validateSource).toHaveBeenLastCalledWith(
      expect.objectContaining({ import_types: ['conversations'] })
    );
    expect(checks[0].props('modelValue')).toBe(false);

    await checks[1].vm.$emit('change');
    await flushPromises();
    expect(DataImportsAPI.validateSource).toHaveBeenCalledTimes(2);
    expect(dialog(wrapper).props('disableConfirmButton')).toBe(true);
    await tokenInput(wrapper).vm.$emit('blur');
    expect(DataImportsAPI.validateSource).toHaveBeenCalledTimes(2);

    await checks[0].vm.$emit('change');
    await flushPromises();
    expect(DataImportsAPI.validateSource).toHaveBeenLastCalledWith(
      expect.objectContaining({ import_types: ['contacts'] })
    );
  });

  it('creates the import, falling back to the default name', async () => {
    DataImportsAPI.validateSource.mockResolvedValue({});
    const wrapper = mountDialog();
    await dialog(wrapper).vm.$emit('confirm');
    expect(DataImportsAPI.create).not.toHaveBeenCalled();

    await setToken(wrapper, 'key');
    await tokenInput(wrapper).vm.$emit('blur');
    await flushPromises();
    await inputs(wrapper)[0].vm.$emit('update:modelValue', '   ');

    DataImportsAPI.create.mockResolvedValueOnce({ data: { id: 8 } });
    await dialog(wrapper).vm.$emit('confirm');
    await flushPromises();
    expect(DataImportsAPI.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'DATA_IMPORTS.DEFAULT_IMPORT_NAMES.INTERCOM',
        access_token: 'key',
      })
    );
    expect(useAlert).toHaveBeenCalledWith('DATA_IMPORTS.ALERTS.IMPORT_STARTED');
    expect(wrapper.emitted('created')[0]).toEqual([8]);

    await inputs(wrapper)[0].vm.$emit('update:modelValue', ' Q3 ');
    DataImportsAPI.create.mockRejectedValueOnce({
      response: { data: { message: 'Quota' } },
    });
    await dialog(wrapper).vm.$emit('confirm');
    await flushPromises();
    expect(DataImportsAPI.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'Q3' })
    );
    expect(useAlert).toHaveBeenCalledWith('Quota');

    DataImportsAPI.create.mockRejectedValueOnce({});
    await dialog(wrapper).vm.$emit('confirm');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('DATA_IMPORTS.ALERTS.IMPORT_FAILED');
  });

  it('warns about an active import and blocks creating', async () => {
    DataImportsAPI.validateSource.mockResolvedValue({});
    const wrapper = mountDialog({ hasActiveImport: true });
    expect(wrapper.text()).toContain('DATA_IMPORTS.DRAWER.ACTIVE_IMPORT');
    await setToken(wrapper, 'key');
    await tokenInput(wrapper).vm.$emit('blur');
    await flushPromises();
    expect(dialog(wrapper).props('disableConfirmButton')).toBe(true);
  });
});
