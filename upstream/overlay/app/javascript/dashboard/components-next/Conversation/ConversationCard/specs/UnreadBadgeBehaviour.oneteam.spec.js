/**
 * OneTeam behaviour spec for the conversation card unread badge.
 *
 * Covers the count, the overflow label above nine, bottom alignment,
 * and the empty placeholder with no unread messages.
 */
import { mount } from '@vue/test-utils';
import UnreadBadge from '../UnreadBadge.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

describe('UnreadBadge behaviour', () => {
  it('shows the count or the overflow label', async () => {
    const wrapper = mount(UnreadBadge, { props: { count: 3 } });
    expect(wrapper.text()).toBe('3');
    expect(wrapper.classes()).not.toContain('mb-0.5');
    await wrapper.setProps({ count: 12, alignBottom: true });
    expect(wrapper.text()).toBe('CHAT_LIST.UNREAD_COUNT_OVERFLOW');
    expect(wrapper.classes()).toContain('mb-0.5');
  });

  it('renders an empty placeholder with nothing unread', () => {
    const wrapper = mount(UnreadBadge, { props: { count: 0 } });
    expect(wrapper.text()).toBe('');
    expect(wrapper.classes()).not.toContain('bg-n-teal-9');
  });
});
