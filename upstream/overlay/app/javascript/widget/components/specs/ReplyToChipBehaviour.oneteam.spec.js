/**
 * OneTeam behaviour spec for the widget's "replying to" chip.
 *
 * Covers showing the quoted message's text, falling back to its first
 * attachment's type, and scrolling to the quoted message and
 * highlighting it briefly when clicked, including clearing the timer on
 * unmount.
 *
 * Chatwoot quirk: the replyTo default `() => {}` returns undefined, so
 * the chip cannot render without a reply target.
 */
import { mount } from '@vue/test-utils';
import ReplyToChip from '../ReplyToChip.vue';

const mountChip = replyTo =>
  mount(ReplyToChip, {
    props: { replyTo },
    global: { stubs: { FluentIcon: true } },
  });

describe('ReplyToChip behaviour', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('shows the quoted text or the attachment type', () => {
    expect(mountChip({ id: 1, content: 'Hello' }).text()).toBe('Hello');
    expect(
      mountChip({ id: 1, attachments: [{ file_type: 'image' }] }).text()
    ).toBe('ATTACHMENTS.image.CONTENT');
    expect(mountChip({ id: 1, attachments: [] }).text()).toBe('');
    expect(mountChip({ id: 1, attachments: [undefined] }).text()).toBe(
      'ATTACHMENTS.undefined.CONTENT'
    );
  });

  it('scrolls to and briefly highlights the quoted message', async () => {
    vi.useFakeTimers();
    const target = document.createElement('div');
    target.id = 'cwmsg-42';
    target.scrollIntoView = vi.fn();
    document.body.appendChild(target);

    const wrapper = mountChip({ id: 42, content: 'Hi' });
    await wrapper.trigger('click');
    await wrapper.vm.$nextTick();
    expect(target.scrollIntoView).toHaveBeenCalled();
    expect(target.classList).toContain('bg-n-slate-3');
    vi.advanceTimersByTime(500);
    expect(target.classList).not.toContain('bg-n-slate-3');

    const clear = vi.spyOn(window, 'clearTimeout');
    wrapper.unmount();
    expect(clear).toHaveBeenCalled();
  });

  it('has no default reply target', () => {
    // `default: () => {}` is an empty arrow body, so it returns undefined;
    // rendering without a replyTo would throw, so read the default directly.
    expect(ReplyToChip.props.replyTo.default()).toBeUndefined();
  });
});
