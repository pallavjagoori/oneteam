/**
 * OneTeam behaviour spec for the help-center article table of contents.
 *
 * Covers the empty state, heading indents (h2 under h1, h3 with or
 * without parents, other tags), highlighting from the URL hash and as
 * sections scroll into view, and cleaning up listeners and observers.
 */
import { mount } from '@vue/test-utils';
import TableOfContents from '../TableOfContents.vue';

let observers;

class FakeObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    this.observe = vi.fn();
    this.disconnect = vi.fn();
    observers.push(this);
  }
}

const rows = [
  { slug: 'intro', title: 'Intro', tag: 'h1' },
  { slug: 'setup', title: 'Setup', tag: 'h2' },
  { slug: 'details', title: 'Details', tag: 'h3' },
  { slug: 'misc', title: 'Misc', tag: 'h4' },
];

const indents = wrapper =>
  wrapper.findAll('li p').map(p =>
    p
      .classes()
      .filter(c => c.includes('ml-'))
      .join('')
  );

describe('Table of contents behaviour', () => {
  beforeEach(() => {
    observers = [];
    window.IntersectionObserver = FakeObserver;
    document.body.innerHTML = '<h1 id="intro"></h1><h2 id="setup"></h2>';
    window.location.hash = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete window.IntersectionObserver;
  });

  it('renders nothing without rows', () => {
    const wrapper = mount(TableOfContents);
    expect(wrapper.find('nav').exists()).toBe(false);
    wrapper.unmount();
  });

  it('indents headings by level', () => {
    const wrapper = mount(TableOfContents, { props: { rows } });
    expect(indents(wrapper)).toEqual(['', 'ltr:ml-2', 'ltr:ml-5', '']);
    expect(wrapper.find('a').attributes('href')).toBe('#intro');
    const flat = mount(TableOfContents, {
      props: { rows: [rows[1], rows[2]] },
    });
    expect(indents(flat)).toEqual(['', 'ltr:ml-5']);
    const lone = mount(TableOfContents, { props: { rows: [rows[2]] } });
    expect(indents(lone)).toEqual(['']);
  });

  it('highlights from the URL hash and visible sections', async () => {
    window.location.hash = '#setup';
    const wrapper = mount(TableOfContents, { props: { rows } });
    const links = () => wrapper.findAll('a');
    expect(links()[1].classes()).toContain('text-n-portal');
    expect(links()[0].classes()).toContain('text-slate-700');

    const [observer] = observers;
    expect(observer.observe).toHaveBeenCalledTimes(2);
    expect(observer.options.threshold).toBe(0.25);
    observer.callback([
      { isIntersecting: false, target: { id: 'setup' } },
      { isIntersecting: true, target: { id: 'intro' } },
    ]);
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('li')[0].classes()).toContain('border-n-portal');
    observer.callback([{ isIntersecting: false, target: { id: 'setup' } }]);
    expect(wrapper.vm.currentSlug).toBe('intro');

    window.location.hash = '#details';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(wrapper.vm.currentSlug).toBe('details');
    window.location.hash = '';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(wrapper.vm.currentSlug).toBe('');

    wrapper.unmount();
    expect(observer.disconnect).toHaveBeenCalled();
  });

  it('unmounts safely without an observer', () => {
    const wrapper = mount(TableOfContents);
    wrapper.vm.intersectionObserver = null;
    wrapper.unmount();
    expect(observers).toHaveLength(1);
  });
});
