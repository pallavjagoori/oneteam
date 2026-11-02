/**
 * OneTeam behaviour spec for the contact CSV import dialog.
 *
 * Covers the sample CSV link, choosing a file through the hidden input
 * (long names shortened with the extension kept), changing and removing
 * the file, importing only once a file is chosen, and the loading state
 * while an import runs.
 */
import { reactive } from 'vue';
import { mount } from '@vue/test-utils';
import ContactImportDialog from '../ContactImportDialog.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return { useMapGetter: () => computed(() => env.flags) };
});

const Dialog = {
  name: 'Dialog',
  props: ['isLoading', 'disableConfirmButton'],
  emits: ['confirm'],
  template: '<div><slot name="description" /><slot /></div>',
};
const Button = {
  name: 'Button',
  props: ['label', 'icon'],
  emits: ['click'],
  template:
    '<button :data-icon="icon" @click="$emit(\'click\')">{{ label }}</button>',
};

const mountDialog = () =>
  mount(ContactImportDialog, {
    global: { stubs: { Dialog, Button, NextButton: Button } },
  });

const pick = async (wrapper, files) => {
  const input = wrapper.find('input[type="file"]');
  Object.defineProperty(input.element, 'files', {
    value: files,
    configurable: true,
  });
  await input.trigger('change');
};

describe('ContactImportDialog behaviour', () => {
  beforeEach(() => {
    env.flags = reactive({ isImporting: false });
  });

  it('links the sample file and opens the file picker', async () => {
    const wrapper = mountDialog();
    expect(wrapper.find('a').attributes('href')).toBe(
      '/downloads/import-contacts-sample.csv'
    );
    const click = vi.spyOn(wrapper.find('input[type="file"]').element, 'click');
    await wrapper.find('[data-icon="i-lucide-upload"]').trigger('click');
    expect(click).toHaveBeenCalled();
    expect(wrapper.vm.dialogRef).toBeTruthy();

    wrapper.findComponent(Dialog).vm.$emit('confirm');
    expect(wrapper.emitted('import')).toBeUndefined();
  });

  it('chooses, renames, changes and removes a file', async () => {
    const wrapper = mountDialog();
    const file = new File(['a'], 'customers-from-the-old-crm.csv');
    await pick(wrapper, [file]);
    expect(wrapper.find('span.text-sm').text()).toBe(
      'customers-from-the-o....csv'
    );
    wrapper.findComponent(Dialog).vm.$emit('confirm');
    expect(wrapper.emitted('import')[0][0]).toBe(file);

    await pick(wrapper, [new File(['b'], 'short.csv')]);
    expect(wrapper.find('span.text-sm').text()).toBe('short.csv');
    const click = vi.spyOn(wrapper.find('input[type="file"]').element, 'click');
    await wrapper.findAll('button')[0].trigger('click');
    expect(click).toHaveBeenCalled();

    await wrapper.find('[data-icon="i-lucide-trash"]').trigger('click');
    expect(wrapper.find('span.text-sm').exists()).toBe(false);
    expect(wrapper.find('[data-icon="i-lucide-upload"]').exists()).toBe(true);

    await pick(wrapper, []);
    expect(wrapper.find('span.text-sm').exists()).toBe(false);
  });

  it('shows the loading state while importing', () => {
    env.flags.isImporting = true;
    const dialog = mountDialog().findComponent(Dialog);
    expect(dialog.props()).toEqual({
      isLoading: true,
      disableConfirmButton: true,
    });
  });
});
