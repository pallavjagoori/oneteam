/**
 * OneTeam behaviour spec for the delete-company confirm dialog.
 *
 * Covers the description with or without the company name, the loading
 * state, confirming, and the empty default company.
 */
import { mount } from '@vue/test-utils';
import ConfirmCompanyDeleteDialog from '../ConfirmCompanyDeleteDialog.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({
    t: (key, args) => (args ? `${key}:${args.companyName}` : key),
  }),
}));

const Dialog = {
  name: 'Dialog',
  props: { description: String, isLoading: Boolean },
  emits: ['confirm'],
  template: '<div />',
};

describe('ConfirmCompanyDeleteDialog behaviour', () => {
  it('names the company and confirms', () => {
    const wrapper = mount(ConfirmCompanyDeleteDialog, {
      props: { company: { name: 'Acme' }, isLoading: true },
      global: { stubs: { Dialog } },
    });
    const dialog = wrapper.getComponent(Dialog);
    expect(dialog.props()).toEqual({
      description: 'COMPANIES.DETAIL.DELETE.DESCRIPTION_WITH_NAME:Acme',
      isLoading: true,
    });
    dialog.vm.$emit('confirm');
    expect(wrapper.emitted('confirm')).toHaveLength(1);
    expect(wrapper.vm.dialogRef).toBeTruthy();
  });

  it('uses the generic description without a name', () => {
    const wrapper = mount(ConfirmCompanyDeleteDialog, {
      global: { stubs: { Dialog } },
    });
    expect(wrapper.getComponent(Dialog).props('description')).toBe(
      'COMPANIES.DETAIL.DELETE.DESCRIPTION'
    );
    expect(ConfirmCompanyDeleteDialog.props.company.default()).toEqual({});
  });
});
