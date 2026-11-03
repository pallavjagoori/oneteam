/**
 * OneTeam behaviour spec for the portal AddCustomDomainDialog.
 *
 * Covers add and edit labels, domain validation and its error message,
 * syncing the prop and emitting a valid domain.
 */
import { mount, flushPromises } from '@vue/test-utils';
import AddCustomDomainDialog from '../AddCustomDomainDialog.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

const DialogStub = {
  name: 'Dialog',
  props: { title: String, confirmButtonLabel: String },
  emits: ['confirm'],
  template: '<div><slot /></div>',
};

const InputStub = {
  name: 'Input',
  props: { modelValue: String, message: String, messageType: String },
  emits: ['update:modelValue', 'blur'],
  template: '<input />',
};

/**
 * Mounts the dialog.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountDialog = props =>
  mount(AddCustomDomainDialog, {
    props,
    global: { stubs: { Dialog: DialogStub, Input: InputStub } },
  });

const PREFIX =
  'HELP_CENTER.PORTAL_SETTINGS.CONFIGURATION_FORM.CUSTOM_DOMAIN.DIALOG';

describe('AddCustomDomainDialog behaviour', () => {
  it('uses the add or edit labels', () => {
    expect(mountDialog({}).findComponent(DialogStub).props('title')).toBe(
      `${PREFIX}.ADD_HEADER`
    );
    const edit = mountDialog({ mode: 'edit', customDomain: 'help.acme.com' });
    expect(edit.findComponent(DialogStub).props('confirmButtonLabel')).toBe(
      `${PREFIX}.EDIT_CONFIRM_BUTTON_LABEL`
    );
    expect(edit.findComponent(InputStub).props('modelValue')).toBe(
      'help.acme.com'
    );
    expect(edit.vm.dialogRef).toBeTruthy();
  });

  it('shows a format error and does not emit for a bad domain', async () => {
    const wrapper = mountDialog({});
    const input = wrapper.findComponent(InputStub);
    input.vm.$emit('update:modelValue', 'not a domain');
    input.vm.$emit('blur');
    await wrapper.vm.$nextTick();
    expect(input.props('message')).toBe(`${PREFIX}.FORMAT_ERROR`);
    expect(input.props('messageType')).toBe('error');
    wrapper.findComponent(DialogStub).vm.$emit('confirm');
    await flushPromises();
    expect(wrapper.emitted('addCustomDomain')).toBeUndefined();
  });

  it('syncs the prop and emits a valid domain', async () => {
    const wrapper = mountDialog({});
    await wrapper.setProps({ customDomain: 'docs.acme.com' });
    expect(wrapper.findComponent(InputStub).props('messageType')).toBe('info');
    wrapper.findComponent(DialogStub).vm.$emit('confirm');
    await flushPromises();
    expect(wrapper.emitted('addCustomDomain')).toEqual([['docs.acme.com']]);
  });
});
