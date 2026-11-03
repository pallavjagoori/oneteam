/**
 * OneTeam behaviour spec for the CSAT template update confirm dialog.
 *
 * Covers the exposed open and close, and confirming (which emits and
 * closes).
 */
import { mount } from '@vue/test-utils';
import ConfirmTemplateUpdateDialog from '../ConfirmTemplateUpdateDialog.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const calls = [];
const Dialog = {
  name: 'Dialog',
  props: ['title'],
  emits: ['confirm'],
  methods: {
    open() {
      calls.push('open');
    },
    close() {
      calls.push('close');
    },
  },
  template: '<div />',
};

describe('ConfirmTemplateUpdateDialog behaviour', () => {
  it('opens, confirms and closes', () => {
    const wrapper = mount(ConfirmTemplateUpdateDialog, {
      global: { stubs: { Dialog } },
    });
    const dialog = wrapper.getComponent(Dialog);
    expect(dialog.props('title')).toBe(
      'INBOX_MGMT.CSAT.TEMPLATE_UPDATE_DIALOG.TITLE'
    );
    wrapper.vm.open();
    dialog.vm.$emit('confirm');
    wrapper.vm.close();
    expect(wrapper.emitted('confirm')).toHaveLength(1);
    expect(calls).toEqual(['open', 'close', 'close']);
  });
});
