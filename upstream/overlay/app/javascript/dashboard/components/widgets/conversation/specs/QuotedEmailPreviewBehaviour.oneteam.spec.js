/**
 * OneTeam behaviour spec for the quoted email preview in the reply box.
 *
 * Covers expanding and collapsing the quoted text (with its optional
 * header), asking the editor to grow by the quote's height (capped at
 * 240px) and to shrink back, ignoring a measurement after a quick
 * double toggle, removing the quote, collapsing when a message is sent,
 * and shrinking the editor on unmount.
 */
import { mount } from '@vue/test-utils';
import QuotedEmailPreview from '../QuotedEmailPreview.vue';

let onSent;
vi.mock('dashboard/composables/emitter', () => ({
  useEmitter: (_, handler) => {
    onSent = handler;
  },
}));
vi.mock('shared/composables/useMessageFormatter', () => ({
  useMessageFormatter: () => ({
    formatMessage: (text, ...flags) => `<em>${text}</em>${flags.join(',')}`,
  }),
}));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

const NextButton = {
  name: 'NextButton',
  props: { icon: String },
  emits: ['click'],
  template: '<button :data-icon="icon" @click="$emit(\'click\')" />',
};

const mountPreview = ({ props = {}, requestEditorHeight } = {}) =>
  mount(QuotedEmailPreview, {
    attachTo: document.body,
    props: { quotedEmailText: 'Earlier mail', ...props },
    global: {
      stubs: { NextButton, Transition: { template: '<div><slot /></div>' } },
      directives: {
        tooltip: {},
        dompurifyHtml: {
          mounted(el, { value }) {
            el.innerHTML = value;
          },
        },
      },
      provide: requestEditorHeight ? { requestEditorHeight } : {},
    },
  });

const toggle = wrapper => wrapper.find('button[data-icon="i-lucide-ellipsis"]');
const content = wrapper => wrapper.find('.max-h-60');

const sizeContent = (wrapper, scrollHeight) => {
  Object.defineProperty(wrapper.element.parentElement, 'offsetHeight', {
    configurable: true,
    value: 100,
  });
  const spy = vi
    .spyOn(Element.prototype, 'scrollHeight', 'get')
    .mockImplementation(function height() {
      return this.classList.contains('max-h-60') ? scrollHeight : 0;
    });
  return () => spy.mockRestore();
};

describe('QuotedEmailPreview behaviour', () => {
  it('expands and collapses the quote and resizes the editor', async () => {
    const requestEditorHeight = vi.fn();
    const wrapper = mountPreview({
      props: { header: 'On Monday, Ann wrote:' },
      requestEditorHeight,
    });
    const restore = sizeContent(wrapper, 80);
    expect(content(wrapper).exists()).toBe(false);
    expect(toggle(wrapper).attributes('aria-expanded')).toBe('false');
    expect(toggle(wrapper).attributes('aria-label')).toBe(
      'CONVERSATION.REPLYBOX.QUOTED_REPLY.SHOW_TOOLTIP'
    );

    await toggle(wrapper).trigger('click');
    await wrapper.vm.$nextTick();
    expect(content(wrapper).text()).toContain('On Monday, Ann wrote:');
    expect(content(wrapper).find('em').text()).toBe('Earlier mail');
    expect(content(wrapper).text()).toContain('false,false,true');
    expect(toggle(wrapper).attributes('aria-label')).toBe(
      'CONVERSATION.REPLYBOX.QUOTED_REPLY.HIDE_TOOLTIP'
    );
    expect(requestEditorHeight).toHaveBeenLastCalledWith(180);

    await toggle(wrapper).trigger('click');
    expect(requestEditorHeight).toHaveBeenLastCalledWith(0);
    restore();

    const tall = mountPreview({ requestEditorHeight });
    const restoreTall = sizeContent(tall, 900);
    await toggle(tall).trigger('click');
    await tall.vm.$nextTick();
    expect(content(tall).find('p').exists()).toBe(false);
    expect(requestEditorHeight).toHaveBeenLastCalledWith(340);
    restoreTall();
    wrapper.unmount();
    tall.unmount();
  });

  it('skips measuring after a quick double toggle', async () => {
    const requestEditorHeight = vi.fn();
    const wrapper = mountPreview({ requestEditorHeight });
    toggle(wrapper).trigger('click');
    await toggle(wrapper).trigger('click');
    await wrapper.vm.$nextTick();
    expect(requestEditorHeight.mock.calls).toEqual([[0]]);
    wrapper.unmount();
  });

  it('removes the quote and collapses when a message is sent', async () => {
    const requestEditorHeight = vi.fn();
    const wrapper = mountPreview({ requestEditorHeight });
    await toggle(wrapper).trigger('click');
    await wrapper.find('button[data-icon="i-lucide-x"]').trigger('click');
    expect(wrapper.emitted('remove')).toHaveLength(1);

    onSent();
    await wrapper.vm.$nextTick();
    expect(content(wrapper).exists()).toBe(false);

    requestEditorHeight.mockClear();
    wrapper.unmount();
    expect(requestEditorHeight).toHaveBeenCalledWith(0);
  });

  it('works without an editor to resize', async () => {
    const wrapper = mountPreview();
    await toggle(wrapper).trigger('click');
    await toggle(wrapper).trigger('click');
    expect(content(wrapper).exists()).toBe(false);
    wrapper.unmount();
  });
});
