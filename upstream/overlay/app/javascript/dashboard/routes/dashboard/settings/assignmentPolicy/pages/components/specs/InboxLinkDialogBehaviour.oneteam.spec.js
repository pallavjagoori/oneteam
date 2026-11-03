/**
 * OneTeam behaviour spec for the assignment policy InboxLinkDialog.
 *
 * Covers opening for an inbox, closing when cleared, the inbox name and
 * icon, and the link and dismiss events.
 */
import { mount, flushPromises } from '@vue/test-utils';
import InboxLinkDialog from '../InboxLinkDialog.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

const open = vi.fn();
const close = vi.fn();

const DialogStub = {
  name: 'Dialog',
  props: { isLoading: Boolean },
  emits: ['confirm', 'close'],
  methods: { open, close },
  template: '<div><slot name="description" /><slot /></div>',
};

/**
 * Mounts the dialog.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountDialog = props =>
  mount(InboxLinkDialog, { props, global: { stubs: { Dialog: DialogStub } } });

describe('InboxLinkDialog behaviour', () => {
  it('shows a generic icon without an inbox', async () => {
    const wrapper = mountDialog({});
    await flushPromises();
    expect(wrapper.find('i').classes()).toContain('i-lucide-inbox');
    expect(open).not.toHaveBeenCalled();
  });

  it('opens for an inbox and shows its name and icon', async () => {
    const wrapper = mountDialog({
      inbox: { name: 'Support', channelType: 'Channel::Email' },
      isLinking: true,
    });
    await flushPromises();
    expect(open).toHaveBeenCalled();
    expect(wrapper.text()).toContain('Support');
    expect(wrapper.find('i').classes()).not.toContain('i-lucide-inbox');
    expect(wrapper.findComponent(DialogStub).props('isLoading')).toBe(true);
    await wrapper.setProps({ inbox: null });
    expect(close).toHaveBeenCalled();
  });

  it('emits link and dismiss', () => {
    const wrapper = mountDialog({});
    const dialog = wrapper.findComponent(DialogStub);
    dialog.vm.$emit('confirm');
    dialog.vm.$emit('close');
    expect(wrapper.emitted('link')).toHaveLength(1);
    expect(wrapper.emitted('dismiss')).toHaveLength(1);
  });

  it('tolerates a missing dialog ref', () => {
    const wrapper = mountDialog({});
    wrapper.vm.$.setupState.dialogRef = null;
    expect(() => {
      wrapper.vm.openDialog();
      wrapper.vm.closeDialog();
    }).not.toThrow();
  });
});
