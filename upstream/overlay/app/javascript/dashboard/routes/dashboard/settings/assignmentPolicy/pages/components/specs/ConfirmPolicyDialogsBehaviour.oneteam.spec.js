/**
 * OneTeam behaviour spec for the assignment policy confirm dialogs.
 *
 * Covers opening the delete-policy and add-inbox dialogs for a target,
 * emitting the target on confirm, closing, and naming the inbox in the
 * add-inbox description.
 */
import { mount } from '@vue/test-utils';
import ConfirmDeletePolicyDialog from '../ConfirmDeletePolicyDialog.vue';
import ConfirmInboxDialog from '../ConfirmInboxDialog.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({
    t: (key, args) => (args ? `${key}:${args.inboxName}` : key),
  }),
}));

const calls = [];
const Dialog = {
  name: 'Dialog',
  props: ['title', 'description'],
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

/**
 * Mounts a dialog component.
 *
 * @param {object} component Dialog component.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountDialog = component =>
  mount(component, { global: { stubs: { Dialog } } });

describe('assignment policy confirm dialogs', () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it('confirms deleting a policy', () => {
    const wrapper = mountDialog(ConfirmDeletePolicyDialog);
    const dialog = wrapper.getComponent(Dialog);
    expect(dialog.props('title')).toBe('ASSIGNMENT_POLICY.DELETE_POLICY.TITLE');
    wrapper.vm.openDialog(7);
    dialog.vm.$emit('confirm');
    wrapper.vm.closeDialog();
    expect(wrapper.emitted('delete')).toEqual([[7]]);
    expect(calls).toEqual(['open', 'close']);
  });

  it('confirms adding an inbox', async () => {
    const wrapper = mountDialog(ConfirmInboxDialog);
    const dialog = wrapper.getComponent(Dialog);
    expect(dialog.props('description')).toMatch(/:undefined$/);
    wrapper.vm.openDialog({ id: 3, name: 'Support' });
    await wrapper.vm.$nextTick();
    expect(dialog.props('description')).toMatch(/:Support$/);
    dialog.vm.$emit('confirm');
    wrapper.vm.closeDialog();
    expect(wrapper.emitted('add')).toEqual([[3]]);
    expect(calls).toEqual(['open', 'close']);
  });
});
