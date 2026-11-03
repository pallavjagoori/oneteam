/**
 * OneTeam behaviour spec for the widget preview footer.
 *
 * Covers the default screen's availability card (online and offline)
 * with the start-conversation button in the widget colour, and the chat
 * screen's input that highlights while focused.
 */
import { mount } from '@vue/test-utils';
import WidgetFooter from '../WidgetFooter.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const ResizableTextArea = {
  name: 'ResizableTextArea',
  emits: ['focus', 'blur'],
  template: '<textarea />',
};

/**
 * Mounts the footer for a preview config.
 *
 * @param {object} config Widget preview config.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountFooter = config =>
  mount(WidgetFooter, {
    props: config ? { config } : {},
    global: {
      stubs: { ResizableTextArea, Avatar: true, FluentIcon: true },
      mocks: { $t: key => key },
    },
  });

describe('WidgetFooter behaviour', () => {
  it('shows the online card with the start button', () => {
    const wrapper = mountFooter({
      isDefaultScreen: true,
      isOnline: true,
      replyTime: 'In a few minutes',
      color: '#1f93ff',
    });
    expect(wrapper.text()).toContain(
      'INBOX_MGMT.WIDGET_BUILDER.BODY.TEAM_AVAILABILITY.ONLINE'
    );
    expect(wrapper.text()).toContain('In a few minutes');
    expect(wrapper.get('button').attributes('style')).toContain(
      'color: rgb(31, 147, 255)'
    );
  });

  it('shows the offline status', () => {
    expect(mountFooter({ isDefaultScreen: true }).text()).toContain(
      'INBOX_MGMT.WIDGET_BUILDER.BODY.TEAM_AVAILABILITY.OFFLINE'
    );
  });

  it('highlights the chat input while focused', async () => {
    const wrapper = mountFooter();
    const box = wrapper.get('.h-10');
    const input = wrapper.getComponent(ResizableTextArea);
    input.vm.$emit('focus');
    await wrapper.vm.$nextTick();
    expect(box.classes()).toContain('ring-2');
    input.vm.$emit('blur');
    await wrapper.vm.$nextTick();
    expect(box.classes()).not.toContain('ring-2');
  });
});
