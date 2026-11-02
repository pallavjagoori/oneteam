/**
 * OneTeam behaviour spec for the iframe loader used by help center
 * previews.
 *
 * Covers the skeleton while loading, the empty state without a URL or on
 * a load error, applying the text direction to the framed document on
 * load and when it changes (only when asked to), and ignoring documents
 * that are missing or cannot be read.
 */
import { mount, enableAutoUnmount } from '@vue/test-utils';
import IframeLoader from '../IframeLoader.vue';

enableAutoUnmount(afterEach);

const mountLoader = props =>
  mount(IframeLoader, {
    props: { url: 'about:blank', ...props },
    attachTo: document.body,
    global: {
      stubs: { ArticleSkeletonLoader: { template: '<i class="sk" />' } },
    },
  });
const root = wrapper =>
  wrapper.find('iframe').element.contentDocument.documentElement;

describe('IframeLoader behaviour', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the empty state without a URL', () => {
    const wrapper = mountLoader({ url: '' });
    expect(wrapper.find('iframe').exists()).toBe(false);
    expect(wrapper.text()).toBe('PORTAL.IFRAME_ERROR');
  });

  it('hides the skeleton on load and shows the error state on failure', async () => {
    const wrapper = mountLoader();
    expect(wrapper.find('.sk').exists()).toBe(true);
    await wrapper.find('iframe').trigger('load');
    expect(wrapper.find('.sk').exists()).toBe(false);
    expect(wrapper.text()).toBe('');

    const failing = mountLoader();
    await failing.find('iframe').trigger('error');
    expect(failing.find('.sk').exists()).toBe(false);
    expect(failing.text()).toBe('PORTAL.IFRAME_ERROR');
  });

  it('applies the direction when asked, on load and on change', async () => {
    const wrapper = mountLoader({ isDirApplied: true, isRtl: true });
    await wrapper.find('iframe').trigger('load');
    expect(root(wrapper).dir).toBe('rtl');
    expect(root(wrapper).getAttribute('data-dir-applied')).toBe('true');
    await wrapper.setProps({ isRtl: false });
    expect(root(wrapper).dir).toBe('ltr');

    const untouched = mountLoader({ isRtl: true });
    await untouched.find('iframe').trigger('load');
    expect(root(untouched).dir).toBe('');
  });

  it('skips missing or unreadable documents', async () => {
    const proto = HTMLIFrameElement.prototype;
    const docGetter = vi
      .spyOn(proto, 'contentDocument', 'get')
      .mockReturnValue(null);
    vi.spyOn(proto, 'contentWindow', 'get').mockReturnValue(null);
    const wrapper = mountLoader({ isDirApplied: true });
    await wrapper.find('iframe').trigger('load');
    expect(wrapper.find('.sk').exists()).toBe(false);

    docGetter.mockImplementation(() => {
      throw new Error('cross-origin');
    });
    await wrapper.setProps({ isRtl: true });
    expect(wrapper.find('iframe').exists()).toBe(true);
  });

  it('ignores direction changes once the iframe is gone', async () => {
    const wrapper = mountLoader({ isDirApplied: true });
    await wrapper.setProps({ url: '' });
    await wrapper.setProps({ isRtl: true });
    expect(wrapper.find('iframe').exists()).toBe(false);
  });
});
