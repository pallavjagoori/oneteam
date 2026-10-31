/**
 * OneTeam behaviour spec for the Captain "add document" form.
 *
 * Covers URL documents (required URL, name falling back to the URL),
 * switching to PDF documents, picking a PDF (wrong type, too large, valid,
 * no file), the PDF error state, submitting PDF documents with and without
 * a name, cancelling, and the loading button.
 */
import { computed } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import DocumentForm from '../DocumentForm.vue';

const env = vi.hoisted(() => ({ state: {} }));

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: name => computed(() => env.state[name]),
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const ComboBox = {
  name: 'ComboBox',
  props: ['modelValue', 'options'],
  emits: ['update:modelValue'],
  template: '<div class="combo" />',
};
const Input = {
  name: 'Input',
  props: ['modelValue', 'label', 'message', 'messageType'],
  emits: ['update:modelValue'],
  template:
    '<input :data-label="label" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
};
const Button = {
  name: 'Button',
  props: ['label', 'type', 'color', 'isLoading', 'disabled'],
  emits: ['click'],
  template:
    '<button :type="type" :data-color="color" :disabled="disabled" @click="$emit(\'click\')">{{ label }}<slot /></button>',
};

const mountForm = () =>
  mount(DocumentForm, {
    props: { assistantId: 4 },
    global: { stubs: { ComboBox, Input, Button } },
  });
const field = (wrapper, label) =>
  wrapper.find(`input[data-label="CAPTAIN.DOCUMENTS.FORM.${label}.LABEL"]`);
const submit = async wrapper => {
  await wrapper.find('form').trigger('submit');
  await flushPromises();
};
const entries = wrapper =>
  Object.fromEntries(wrapper.emitted('submit').at(-1)[0].entries());
const choosePdf = async wrapper => {
  await wrapper.findComponent(ComboBox).vm.$emit('update:modelValue', 'pdf');
};
const pickFile = async (wrapper, file) => {
  const input = wrapper.find('input[type="file"]');
  Object.defineProperty(input.element, 'files', {
    value: file ? [file] : [],
    configurable: true,
  });
  await input.trigger('change');
};
const pdf = (name, size = 2 * 1024 * 1024) => {
  const file = new File(['%PDF'], name, { type: 'application/pdf' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('DocumentForm behaviour', () => {
  beforeEach(() => {
    env.state = { 'captainDocuments/getUIFlags': { creatingItem: false } };
  });

  it('offers URL and PDF types and requires a URL', async () => {
    const wrapper = mountForm();
    expect(
      wrapper
        .findComponent(ComboBox)
        .props('options')
        .map(o => o.value)
    ).toEqual(['url', 'pdf']);
    await submit(wrapper);
    expect(wrapper.emitted('submit')).toBeUndefined();
    expect(wrapper.findComponent(Input).props('message')).toBe(
      'CAPTAIN.DOCUMENTS.FORM.URL.ERROR'
    );
    expect(wrapper.findComponent(Input).props('messageType')).toBe('error');
  });

  it('submits URL documents with the URL as fallback name', async () => {
    const wrapper = mountForm();
    await field(wrapper, 'URL').setValue('https://docs.example.com');
    await submit(wrapper);
    expect(entries(wrapper)).toEqual({
      'document[assistant_id]': '4',
      'document[external_link]': 'https://docs.example.com',
      'document[name]': 'https://docs.example.com',
    });
    expect(wrapper.findComponent(Input).props('messageType')).toBe('info');
    await field(wrapper, 'NAME').setValue('Docs');
    await submit(wrapper);
    expect(entries(wrapper)['document[name]']).toBe('Docs');
  });

  it('requires a PDF and shows the error state', async () => {
    const wrapper = mountForm();
    await choosePdf(wrapper);
    expect(field(wrapper, 'URL').exists()).toBe(false);
    expect(wrapper.text()).toContain(
      'CAPTAIN.DOCUMENTS.FORM.PDF_FILE.CHOOSE_FILE'
    );
    expect(wrapper.text()).toContain(
      'CAPTAIN.DOCUMENTS.FORM.PDF_FILE.HELP_TEXT'
    );
    await submit(wrapper);
    expect(wrapper.emitted('submit')).toBeUndefined();
    expect(wrapper.find('p.text-n-ruby-9').text()).toBe(
      'CAPTAIN.DOCUMENTS.FORM.PDF_FILE.ERROR'
    );
    expect(wrapper.find('button[type="button"]').attributes('data-color')).toBe(
      'ruby'
    );
  });

  it('opens the file dialog', async () => {
    const wrapper = mountForm();
    await choosePdf(wrapper);
    const click = vi.spyOn(wrapper.find('input[type="file"]').element, 'click');
    await wrapper.find('button[type="button"]').trigger('click');
    await flushPromises();
    expect(click).toHaveBeenCalled();
    wrapper.vm.$.setupState.fileInputRef = null;
    await wrapper.find('button[type="button"]').trigger('click');
    await flushPromises();
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('rejects wrong types and large files, then accepts a PDF', async () => {
    const wrapper = mountForm();
    await choosePdf(wrapper);
    await pickFile(wrapper, null);
    expect(useAlert).not.toHaveBeenCalled();
    await pickFile(wrapper, new File(['x'], 'a.txt', { type: 'text/plain' }));
    expect(useAlert).toHaveBeenLastCalledWith(
      'CAPTAIN.DOCUMENTS.FORM.PDF_FILE.INVALID_TYPE'
    );
    await pickFile(wrapper, pdf('huge.pdf', 11 * 1024 * 1024));
    expect(useAlert).toHaveBeenLastCalledWith(
      'CAPTAIN.DOCUMENTS.FORM.PDF_FILE.TOO_LARGE'
    );
    const file = pdf('Guide.PDF');
    await pickFile(wrapper, file);
    expect(wrapper.text()).toContain('Guide.PDF');
    expect(wrapper.text()).toContain('2.00 MB');
    expect(field(wrapper, 'NAME').element.value).toBe('Guide');
    await submit(wrapper);
    expect(entries(wrapper)).toEqual({
      'document[assistant_id]': '4',
      'document[pdf_file]': file,
      'document[name]': 'Guide',
    });
  });

  it('names PDF documents after the file when the name is cleared', async () => {
    const wrapper = mountForm();
    await choosePdf(wrapper);
    await pickFile(wrapper, pdf('manual.pdf'));
    await field(wrapper, 'NAME').setValue('');
    await submit(wrapper);
    expect(entries(wrapper)['document[name]']).toBe('manual');
  });

  it('cancels and shows the loading state', async () => {
    env.state['captainDocuments/getUIFlags'] = { creatingItem: true };
    const wrapper = mountForm();
    expect(
      wrapper.find('button[type="submit"]').attributes('disabled')
    ).toBeDefined();
    await wrapper.findAll('button[type="button"]').at(-1).trigger('click');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });
});
